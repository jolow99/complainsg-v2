import os
from openai import OpenAI
from typing import List, Dict

def call_llm(messages: List[Dict[str, str]]) -> str:
    """
    Call LLM with messages and return response text.

    Args:
        messages: List of message dicts with 'role' and 'content' keys

    Returns:
        str: LLM response text
    """
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    )

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
        messages=messages,
        max_tokens=1500,
        temperature=0.7
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    test_messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, how are you?"}
    ]

    print("Making test call...")
    response = call_llm(test_messages)
    print(f"Response: {response}")