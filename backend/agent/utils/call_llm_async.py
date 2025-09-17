import os
from openai import AsyncOpenAI
from typing import List, Dict

async def call_llm_async(messages: List[Dict[str, str]]) -> str:
    """
    Async LLM call with messages and return response text.

    Args:
        messages: List of message dicts with 'role' and 'content' keys

    Returns:
        str: LLM response text
    """
    client = AsyncOpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        default_headers={
            "User-Agent": "ComplainSG/1.0 (OpenAI-Compatible-Client)"
        }
    )

    response = await client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
        messages=messages,
        max_tokens=1500,
        temperature=0.7
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    import asyncio

    async def test():
        test_messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, how are you?"}
        ]

        print("Making test async call...")
        response = await call_llm_async(test_messages)
        print(f"Response: {response}")

    asyncio.run(test())