import asyncio
from typing import Dict, List

from source_aggregator import SourceAggregator
from judge_llm import JudgeLLM
from synthesizer import IterationAwareSynthesizer
from models import SourceAnswer, FinalOutput
from config import config

class TrafficPolicyChatbot:
    """
    Main orchestrator combining all components:
    1) Parallel fetch from 3 sources (DB, Ollama, DuckDuckGo)
    2) Judge evaluates with RESEARCH LAYER (using DeepSeek)
    3) Synthesize final answer with ENFORCEMENT LAYER (using DeepSeek)
    4) Post-process & safety check
    """
    
    def __init__(self):
        self.aggregator = SourceAggregator()
        self.judge = JudgeLLM()
        self.synthesizer = IterationAwareSynthesizer()
        self.max_iterations = config.MAX_ITERATIONS
    
    async def process_query(self, user_question: str) -> Dict:
        """
        Main entry point for processing user queries
        Implements recursive research loop
        """
        
        print(f"\n🔄 Processing query: {user_question[:50]}...")
        
        iteration = 0
        all_sources_history: List[List[SourceAnswer]] = []
        last_judge_result = {}
        
        while iteration < self.max_iterations:
            iteration += 1
            print(f"\n📍 Iteration {iteration}/{self.max_iterations}")
            
            # Step 1: Parallel fetch from 3 sources
            print("🔍 Fetching from Local DB, Ollama, DuckDuckGo...")
            sources = await self.aggregator.fetch_all_sources(user_question)
            
            # Add iteration metadata to each source
            for source in sources:
                source.metadata["iteration"] = iteration
            
            all_sources_history.append(sources)
            
            # Step 2: Judge evaluates all sources WITH RESEARCH LAYER
            print("👨⚖️ Judge evaluating sources...")
            judge_result = await self.judge.evaluate_sources(
                sources=sources,
                user_question=user_question,
                current_iteration=iteration
            )
            
            last_judge_result = judge_result
            
            # Step 3: Check if recursive research needed
            needs_research = judge_result.get("needs_research", False)
            
            if not needs_research:
                print("✅ All sources scored ≥ 8 (or logic met). Proceeding to synthesis.")
                break
            
            print(f"⚠️ Recursive research triggered (Iteration {iteration})")
            print(f"   Research instructions: {judge_result.get('research_instructions', {})}")
            
            # Step 4: Re-fetch with improved instructions
            await self.aggregator.refetch_with_instructions(
                judge_result.get("research_instructions", {})
            )
        
        # Flatten all sources across iterations
        all_sources_flat = [
            src for src_list in all_sources_history 
            for src in src_list
        ]
        
        # Step 3: Synthesize final answer WITH ENFORCEMENT LAYER
        print("\n✍️ Synthesizing final answer...")
        final_output: FinalOutput = await self.synthesizer.synthesize(
            user_question=user_question,
            judge_evaluation=last_judge_result,
            all_sources=all_sources_flat,
            iteration_count=iteration
        )
        
        # Step 4: Post-process & safety check
        validated_output = self.validate_output(final_output, last_judge_result)
        
        print(f"\n✅ Query processed in {iteration} iteration(s)")
        print(f"   Confidence: {validated_output['metadata']['confidence_level']}")
        print(f"   Sources used: {validated_output['metadata']['sources_consulted']}")
        
        return validated_output
    
    def validate_output(
        self, 
        final_output: FinalOutput, 
        judge_result: Dict
    ) -> Dict:
        """Final validation and formatting"""
        
        return {
            "answer": final_output.final_answer,
            "metadata": {
                "iterations_used": len(final_output.iteration_history),
                "confidence_level": final_output.confidence,
                "sources_consulted": final_output.sources_used,
                "constraint_check": final_output.constraint_check,
                "timestamp": final_output.timestamp
            },
            "transparency": {
                "reasoning_trace": final_output.iteration_history,
                "judge_evaluation": final_output.judge_evaluation
            }
        }


# === USAGE EXAMPLE ===

async def main():
    if config.DEEPSEEK_API_KEY == "your-deepseek-api-key" or not config.DEEPSEEK_API_KEY:
        print("WARNING: DEEPSEEK_API_KEY is not set. API calls will fail.")
        
    bot = TrafficPolicyChatbot()
    
    # Test queries
    queries = [
        "What is the fine for not wearing a helmet in Tamil Nadu?",
        "Can I ride without helmet if I'm Sikh?",
        "Drunk driving penalty for first-time offender in Maharashtra?"
    ]
    
    for query in queries:
        result = await bot.process_query(query)
        print("\n" + "="*60)
        print(f"Q: {query}")
        print(f"A: {result['answer'][:300]}...")
        print(f"Confidence: {result['metadata']['confidence_level']}")
        print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
