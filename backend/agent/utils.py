import os
from openai import OpenAI
from typing import List, Dict

def stream_llm(messages: List[Dict[str, str]]):
    """
    Stream LLM response using OpenAI-compatible API.

    Args:
        messages: List of message dicts with 'role' and 'content' keys

    Returns:
        Generator yielding streaming response chunks
    """
    print("Creating OpenAI client...")
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        default_headers={
            "User-Agent": "ComplainSG/1.0 (OpenAI-Compatible-Client)"
        }
    )

    print("Making streaming request to OpenAI...")
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
        messages=messages,
        max_tokens=2000,
        temperature=0.7,
        stream=True
    )

    print("Got response object from OpenAI")
    return response

