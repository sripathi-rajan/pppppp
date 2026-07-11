import asyncio
from backend.multi_agent.main_chatbot import TrafficPolicyChatbot

async def test():
    bot = TrafficPolicyChatbot()
    
    print("\n\n=== TEST 1: GREETING ===")
    res1 = await bot.process_query("hello")
    print(str(res1['answer']).encode('cp1252', 'replace').decode('cp1252'))
    
    print("\n\n=== TEST 2: BROAD QUERY ===")
    res2 = await bot.process_query("teach me basic road rules")
    print(str(res2['answer']).encode('cp1252', 'replace').decode('cp1252'))

if __name__ == "__main__":
    asyncio.run(test())
