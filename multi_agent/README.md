# DriveLegal Multi-Agent Architecture

This is the production-ready, multi-agent AI architecture for DriveLegal.

It uses a Judge LLM pattern to verify facts, cross-checking across three sources:
1. Local DB / RAG
2. Local LLM (Ollama)
3. Web Search (DuckDuckGo Search)

It uses DeepSeek via the OpenAI compatibility layer for both judging and synthesis. DuckDuckGo search is performed via `duckduckgo-search` package, meaning no web search API keys are required.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set your DeepSeek API Key:**
   - On Windows (PowerShell): `$env:DEEPSEEK_API_KEY="your-api-key"`
   - Or set it in `config.py` directly.

## Running the Chatbot

```bash
python main_chatbot.py
```

## Architecture Components

- `models.py`: Data classes and schemas.
- `source_aggregator.py`: Asynchronously fetches results from DB, Ollama, and Web.
- `judge_llm.py`: DeepSeek agent that grades source answers on 5 dimensions and triggers research.
- `constraint_enforcer.py`: Rule-based verification enforcing strict limits (e.g., maximum fine amounts) and blacklisted phrases.
- `synthesizer.py`: DeepSeek agent that writes the final output based only on top-scoring sources and user-friendly formatting.
- `main_chatbot.py`: Orchestrates the whole process in an iterative loop.
