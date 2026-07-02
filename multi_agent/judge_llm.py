import json
import asyncio
from typing import List, Dict, Any
from openai import AsyncOpenAI
from models import SourceAnswer, JudgeEvaluation, SourceType
from config import config

JUDGE_SYSTEM_PROMPT = """You are a **Senior Traffic Policy Judge & Fact-Checker** for a government traffic authority chatbot.

## EVALUATION CRITERIA (Score 1-10 Each):

1. **ACCURACY**: Does it match the Motor Vehicles Act, 1988 and latest 2026 central and state traffic law amendments, rules and policies?
   - Check: Correct sections? Right fine amounts? Valid penalties?

2. **COMPLETENESS**: Does it cover fines, penalties, exceptions, and safety context?
   - Required: Direct answer + Legal basis + Fine amount + Exceptions + Safety explanation + Actionable advice

3. **CURRENCY**: Is the information up-to-date (2026 rules)?
   - Check: Mentions recent amendments? Gazette notifications? Current penalty amounts?

4. **RELEVANCE**: Does it directly answer the user's question?
   - Check: No tangential info? Focused response? Addresses all parts of query?

5. **SAFETY**: Does it promote safe driving behavior?
   - Required: Safety reminder at end? No dangerous suggestions? Protective equipment emphasis?

## CRITICAL RULE: RECURSIVE RESEARCH TRIGGER
If ANY source scores below 8 on ANY criterion, you MUST output:
- needs_research: true
- research_instructions: Specific instructions for EACH failing source on how to improve

## OUTPUT FORMAT (STRICT JSON):
{
  "evaluation": {
    "db": {"score": 7, "issues": ["..."], "strengths": ["..."]},
    "ollama": {"score": 6, "issues": ["..."], "strengths": ["..."]},
    "google": {"score": 8, "issues": ["..."], "strengths": ["..."]}
  },
  "needs_research": true,
  "research_instructions": {
    "db": "...",
    "ollama": "...",
    "google": "..."
  },
  "max_iterations": 3,
  "current_iteration": 1
}
"""

class JudgeLLM:
    """
    Evaluates answers from all sources using DeepSeek via OpenAI compatible API.
    Scores each source on 5 criteria (1-10 each)
    Triggers recursive research if any source < 8
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=config.DEEPSEEK_API_KEY,
            base_url=config.DEEPSEEK_BASE_URL
        )
        self.model_name = config.JUDGE_MODEL
        self.temperature = 0.1  # Low temp for consistent, factual output
        
    async def evaluate_sources(
        self, 
        sources: List[SourceAnswer], 
        user_question: str,
        current_iteration: int = 1
    ) -> Dict[str, Any]:
        """
        Evaluate all sources against 5 criteria
        Return structured JSON with scores and research triggers
        """
        
        # Build evaluation prompt with all sources
        eval_prompt = self._build_evaluation_prompt(sources, user_question, current_iteration)
        
        # Call DeepSeek API
        response = await self._call_llm(eval_prompt)
        
        # Parse and validate JSON response
        try:
            # Clean up potential markdown formatting from JSON response
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
                
            evaluation = json.loads(cleaned_response)
            return self._validate_evaluation(evaluation, current_iteration)
        except json.JSONDecodeError as e:
            print(f"JSON Parsing Error: {e}")
            print(f"Raw Response: {response}")
            return self._fallback_evaluation(sources, current_iteration)
    
    def _build_evaluation_prompt(self, sources, question, iteration):
        prompt = f"## USER QUESTION:\n{question}\n\n"
        prompt += f"## SOURCES TO EVALUATE (Iteration {iteration}):\n\n"
        
        for source in sources:
            prompt += f"### {source.source.value.upper()} SOURCE:\n"
            prompt += f"Answer: {source.answer[:500]}...\n"  # Truncate long answers
            prompt += f"Confidence: {source.confidence}\n"
            prompt += f"Metadata: {json.dumps(source.metadata)}\n\n"
        
        prompt += "\n## PROVIDE YOUR EVALUATION IN THE SPECIFIED JSON FORMAT ONLY. DO NOT ADD ADDITIONAL TEXT."
        return prompt
    
    async def _call_llm(self, prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=2048,
                response_format={"type": "json_object"} # DeepSeek supports JSON mode
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error calling DeepSeek Judge API: {e}")
            return "{}"
    
    def _validate_evaluation(self, eval_dict: Dict, current_iteration: int) -> Dict:
        # Ensure all required fields exist
        if "evaluation" not in eval_dict:
            eval_dict["evaluation"] = {}
        if "needs_research" not in eval_dict:
            eval_dict["needs_research"] = False
            
        # Determine overall confidence based on minimum score
        scores = [v.get("score", 0) for v in eval_dict.get("evaluation", {}).values() if isinstance(v, dict)]
        min_score = min(scores) if scores else 0
        
        if min_score >= 8:
            eval_dict["confidence_level"] = "high"
        elif min_score >= 5:
            eval_dict["confidence_level"] = "medium"
        else:
            eval_dict["confidence_level"] = "low"
            
        eval_dict["current_iteration"] = current_iteration
        return eval_dict
    
    def _fallback_evaluation(self, sources, current_iteration: int):
        # If LLM fails, return basic scoring fallback
        return {
            "evaluation": {
                s.source.value: {"score": 5, "issues": ["LLM evaluation failed"], "strengths": []}
                for s in sources
            },
            "needs_research": False,
            "research_instructions": {},
            "confidence_level": "low",
            "current_iteration": current_iteration
        }
