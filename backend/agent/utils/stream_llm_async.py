import os
from openai import AsyncOpenAI
from typing import List, Dict, AsyncGenerator

async def stream_llm_async(messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """
    Stream LLM response using OpenAI-compatible API asynchronously.

    Args:
        messages: List of message dicts with 'role' and 'content' keys

    Yields:
        str: Individual chunks from the LLM response
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
        # max_tokens=2000,
        # temperature=0.7,
        stream=True
    )

    async for chunk in response:
        if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content

if __name__ == "__main__":
    import asyncio

    async def test():
        test_messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Write a short story about a cat."}
        ]

        print("Making test streaming call...")
        async for chunk in stream_llm_async(test_messages):
            print(chunk, end="", flush=True)
        print("\nDone!")

    asyncio.run(test())