import asyncio
from typing import List, Dict
from duckduckgo_search import DDGS

from models import SourceAnswer, SourceType

class SourceAggregator:
    """
    Fetches answers from 3 sources in parallel:
    1) Local DB (SQLite/ChromaDB placeholder)
    2) Local LLM (Ollama placeholder)
    3) Web Search (DuckDuckGo Search)
    """
    
    def __init__(self):
        pass
    
    async def fetch_all_sources(self, user_question: str) -> List[SourceAnswer]:
        """Parallel fetch from all 3 sources"""
        tasks = [
            self._fetch_from_db(user_question),
            self._fetch_from_ollama(user_question),
            self._fetch_from_google(user_question)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out failures and return valid SourceAnswers
        valid_results = []
        for r in results:
            if isinstance(r, SourceAnswer):
                valid_results.append(r)
            else:
                print(f"Error fetching source: {r}")
                
        return valid_results
    
    async def _fetch_from_db(self, question: str) -> SourceAnswer:
        # Placeholder for SQLite/ChromaDB search
        await asyncio.sleep(0.1) # Simulating DB latency
        return SourceAnswer(
            source=SourceType.DB,
            answer="According to our local database, Section 129 of the MV Act makes helmets mandatory.",
            confidence=0.8,
            metadata={"source": "local_db"}
        )
    
    async def _fetch_from_ollama(self, question: str) -> SourceAnswer:
        # Placeholder for Ollama local LLM call
        await asyncio.sleep(0.5) # Simulating LLM latency
        return SourceAnswer(
            source=SourceType.OLLAMA,
            answer="Based on general traffic knowledge, fine for not wearing a helmet is typically ₹1000.",
            confidence=0.7,
            metadata={"source": "ollama_llama3"}
        )
    
    async def _fetch_from_google(self, question: str) -> SourceAnswer:
        """
        Search via DuckDuckGo and return summarized results.
        Using duckduckgo-search package (AsyncDDGS) to avoid needing an API key.
        """
        try:
            # We add site:gov.in to prioritize official government sources if needed
            # query = f"{question} site:gov.in"
            query = question
            
            # Use DDGS to fetch results asynchronously using to_thread
            def sync_search():
                with DDGS() as ddgs:
                    return list(ddgs.text(query, max_results=3))
            
            results = await asyncio.to_thread(sync_search)
            
            if not results:
                return SourceAnswer(
                    source=SourceType.GOOGLE,
                    answer="No search results found.",
                    confidence=0.0,
                    metadata={"source": "duckduckgo"}
                )
            
            # Compile results into a single answer string
            compiled_answer = "DuckDuckGo Search Results:\n"
            for idx, res in enumerate(results):
                compiled_answer += f"{idx+1}. {res.get('title')}: {res.get('body')}\n"
                
            return SourceAnswer(
                source=SourceType.GOOGLE,
                answer=compiled_answer,
                confidence=0.75,
                metadata={"source": "duckduckgo", "raw_results": len(results)}
            )
            
        except Exception as e:
            print(f"DuckDuckGo search error: {e}")
            return SourceAnswer(
                source=SourceType.GOOGLE,
                answer=f"Failed to fetch web results: {str(e)}",
                confidence=0.0,
                metadata={"source": "duckduckgo", "error": str(e)}
            )
    
    async def refetch_with_instructions(self, instructions: Dict[str, str]):
        """Re-fetch specific sources with improved prompts based on judge feedback"""
        print(f"Re-fetching with instructions: {instructions}")
        # Placeholder implementation for recursive research
        pass
