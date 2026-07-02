import json
from typing import List, Dict
from datetime import datetime
from openai import AsyncOpenAI
from models import SourceAnswer, FinalOutput
from constraint_enforcer import ConstraintEnforcer
from config import config

SYNTHESIZER_SYSTEM_PROMPT = """You are a **Traffic Helpdesk Assistant** for Indian citizens.

## YOUR TASK:
Draft a final, user-friendly answer based on the Judge's evaluation of multiple sources.

## OUTPUT GUIDELINES:

1. **Tone**: Helpful, firm but polite, authoritative
2. **Structure**:
   - Direct Answer (Yes/No/Depends) in first sentence
   - Legal Basis (Section number, Act name)
   - Penalty Details (Fine amount, ₹, punishment)
   - Safety Explanation (WHY the rule exists)
   - Exceptions (if any, clearly marked)
   - Actionable Advice (what to do instead)
3. **Language**: Simple Hindi-English mix (Hinglish) if user asked in Hindi, otherwise clear English
4. **Formatting**: Use bullet points, bold for key numbers, emojis sparingly
5. **Safety**: Always end with safety reminder

## IMPORTANT:
- Base your answer on HIGH-SCORING sources (score ≥ 8)
- Include iteration history context if available
- Maintain confidence level from judge evaluation
"""

class IterationAwareSynthesizer:
    """
    Synthesizes final answer from best-scoring sources using DeepSeek.
    Enforces constraints (no impossible fines, no forbidden phrases)
    Supports iterative improvement with repair logic
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config.DEEPSEEK_API_KEY,
            base_url=config.DEEPSEEK_BASE_URL
        )
        self.model_name = config.SYNTHESIZER_MODEL
        self.enforcer = ConstraintEnforcer()
        self.temperature = 0.3  # Slightly higher for natural language
        self.top_p = 0.95
        self.max_output_tokens = 1024
    
    async def synthesize(
        self,
        user_question: str,
        judge_evaluation: Dict,
        all_sources: List[SourceAnswer],
        iteration_count: int
    ) -> FinalOutput:
        """
        Main synthesis pipeline with iteration history and constraint enforcement
        """
        
        # Step 1: Select best sources (score ≥ 8, highest iteration)
        best_sources = self.select_best_sources(all_sources, judge_evaluation)
        
        # Step 2: Build synthesis prompt with iteration history
        prompt = self.build_synthesis_prompt(
            user_question=user_question,
            judge_evaluation=judge_evaluation,
            best_sources=best_sources,
            iteration_count=iteration_count
        )
        
        # Step 3: Generate initial draft
        draft = await self.generate_content(prompt)
        
        # Step 4: Apply constraint enforcement
        is_valid, violations, fixed_draft = self.enforcer.validate(draft, user_question)
        
        # Step 5: If violations exist, auto-fix or regenerate
        final_answer = draft
        fix_attempts = 0
        max_fix_attempts = 2
        
        while not is_valid and fix_attempts < max_fix_attempts:
            fix_attempts += 1
            print(f"⚠️ Constraint violation attempt {fix_attempts}: {violations}")
            
            # Try auto-fix first
            fixed_draft = self.enforcer.auto_fix(draft, user_question, violations)
            
            # Re-validate
            is_valid, violations, fixed_draft = self.enforcer.validate(
                fixed_draft, user_question
            )
            
            if is_valid:
                final_answer = fixed_draft
                break
            
            # If auto-fix fails, regenerate with stricter prompt
            if fix_attempts >= max_fix_attempts:
                stricter_prompt = self.build_repair_prompt(
                    original_prompt=prompt,
                    violations=violations,
                    failed_draft=draft
                )
                draft = await self.generate_content(stricter_prompt)
                
                is_valid, violations, fixed_draft = self.enforcer.validate(
                    draft, user_question
                )
                final_answer = draft if is_valid else draft + "\n\n⚠️ FALLBACK USED"
        
        # Step 6: Build final output with full history
        return self.build_final_output(
            final_answer=final_answer,
            all_sources=all_sources,
            judge_evaluation=judge_evaluation,
            iteration_count=iteration_count,
            is_valid=is_valid,
            violations=violations if not is_valid else [],
            fix_attempts=fix_attempts
        )
    
    def select_best_sources(
        self, 
        all_sources: List[SourceAnswer], 
        judge_eval: Dict
    ) -> List[SourceAnswer]:
        """
        Select highest-scoring sources, preferring later iterations
        """
        evaluations = judge_eval.get("evaluation", {})
        best = []
        
        for source_name, eval_data in evaluations.items():
            if isinstance(eval_data, dict):
                score = eval_data.get("score", 0)
                
                # If sources are bad, we'll still pass the best we have
                if score >= 6:
                    # Get the latest iteration of this source
                    source_versions = [s for s in all_sources 
                                      if s.source.value == source_name]
                    
                    if source_versions:
                        latest = max(source_versions, key=lambda x: x.timestamp)
                        latest.judge_score = score
                        best.append(latest)
        
        # Sort by score (desc), then iteration (desc)
        best.sort(key=lambda x: (x.judge_score or 0, x.timestamp), reverse=True)
        
        return best or all_sources # Fallback to all sources if none are good
    
    def build_synthesis_prompt(
        self,
        user_question: str,
        judge_evaluation: Dict,
        best_sources: List[SourceAnswer],
        iteration_count: int
    ) -> str:
        """Build the complete synthesis prompt with all context"""
        
        prompt = ""
        
        # Format best sources with iteration info
        sources_text = ""
        for i, src in enumerate(best_sources, 1):
            sources_text += f"""
### SOURCE {i} ({src.source.value.upper()}) [Iteration {src.metadata.get('iteration', 1)}]
Score: {src.judge_score}/10
{json.dumps(src.metadata, indent=2)}

[Answer Preview]:
{src.answer[:800]}...
---
"""
        
        # Build judge summary
        judge_summary = []
        for src_name, data in judge_evaluation.get("evaluation", {}).items():
            if isinstance(data, dict):
                judge_summary.append(
                    f"- {src_name}: Score {data.get('score', 'N/A')}/10 | "
                    f"Issues: {data.get('issues', ['None'])} | "
                    f"Strengths: {data.get('strengths', ['None'])}"
                )
        
        # Determine confidence level for tone
        confidence = judge_evaluation.get("confidence_level", "medium")
        confidence_note = {
            "high": "✅ High confidence: Use authoritative tone",
            "medium": "⚠️ Medium confidence: Use cautious tone, add 'As per records...'",
            "low": "❌ Low confidence: Add disclaimer, suggest RTO verification"
        }.get(confidence, "")
        
        prompt += f"""## USER QUESTION:
{user_question}

## BEST SOURCES (Scored ≥ 8):
{sources_text}

## JUDGE SUMMARY:
{chr(10).join(judge_summary)}

## CONFIDENCE LEVEL: {confidence}
{confidence_note}

## ITERATION COUNT: {iteration_count}

## GENERATE THE FINAL ANSWER NOW:"""
        
        return prompt
    
    async def generate_content(self, prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": SYNTHESIZER_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_output_tokens,
                top_p=self.top_p
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling DeepSeek Synthesizer API: {e}")
            return "Unable to synthesize answer due to API error."
    
    def build_final_output(
        self,
        final_answer: str,
        all_sources: List[SourceAnswer],
        judge_evaluation: Dict,
        iteration_count: int,
        is_valid: bool,
        violations: List[str],
        fix_attempts: int
    ) -> FinalOutput:
        """Build complete output with full history for transparency"""
        
        iteration_history = self.build_iteration_history(
            all_sources, judge_evaluation, iteration_count
        )
        
        return FinalOutput(
            final_answer=final_answer,
            iteration_history=iteration_history,
            judge_evaluation=judge_evaluation,
            constraint_check={
                "passed": is_valid,
                "violations": violations,
                "fix_attempts": fix_attempts
            },
            sources_used=[s.source.value for s in all_sources],
            confidence=judge_evaluation.get("confidence_level", "medium"),
            timestamp=datetime.now().isoformat()
        )
    
    def build_iteration_history(
        self,
        all_sources: List[SourceAnswer],
        judge_eval: Dict,
        total_iterations: int
    ) -> List[Dict]:
        """Build complete iteration history for transparency"""
        
        history = []
        
        for iteration_num in range(1, total_iterations + 1):
            iter_sources = [s for s in all_sources 
                          if s.metadata.get('iteration') == iteration_num]
            
            iter_eval = self.get_iteration_evaluation(judge_eval, iteration_num)
            
            history.append({
                "iteration": iteration_num,
                "sources": [
                    {
                        "source": s.source.value,
                        "answer_preview": s.answer[:100] + "...",
                        "confidence": s.confidence,
                        "score": getattr(s, 'judge_score', 'N/A')
                    }
                    for s in iter_sources
                ],
                "judge_decision": {
                    "needs_research": iter_eval.get("needs_research", False),
                    "research_instructions": iter_eval.get("research_instructions", {}),
                    "lowest_score": min(
                        (e.get('score', 0) for e in 
                         judge_eval.get('evaluation', {}).values() 
                         if isinstance(e, dict)),
                        default=0
                    )
                }
            })
        
        return history
    
    def get_iteration_evaluation(self, judge_eval: Dict, iteration: int) -> Dict:
        """Get evaluation for specific iteration (simplified)"""
        return judge_eval
    
    def build_repair_prompt(
        self,
        original_prompt: str,
        violations: List[str],
        failed_draft: str
    ) -> str:
        """Build stricter prompt for regeneration after constraint failure"""
        
        return f"""{original_prompt}

## ⚠️ PREVIOUS ATTEMPT FAILED CONSTRAINTS
The following violations were found in the previous draft:
{chr(10).join(f'- [v]' for v in violations)}

## PREVIOUS DRAFT (for reference only - DO NOT REPEAT MISTAKES)
{failed_draft[:500]}...

## MANDATORY FIXES FOR THIS ATTEMPT
1. Ensure first sentence is direct Yes/No/Illegal answer in **bold**
2. Include exact fine amount with ₹ symbol
3. Cite exact Section number (e.g., Section 129)
4. End with safety reminder
5. NEVER use forbidden phrases: "optional", "not necessary", "you can ignore", "police won't catch"
6. Keep between 50-250 words

## CORRECTED FINAL ANSWER:
"""
