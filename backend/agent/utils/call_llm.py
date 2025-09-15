import os
from openai import OpenAI

def call_llm(prompt: str) -> str:
    """
    Call the LLM using OpenAI-compatible API with environment configuration.

    Args:
        prompt (str): The prompt to send to the LLM

    Returns:
        str: The LLM's response
    """
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        default_headers={
            "User-Agent": "Sail/1.0"
        }
    )

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0.7
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    # Test the LLM call
    test_prompt = "Hello, how are you?"
    print("Making test call...")
    try:
        response = call_llm(test_prompt)
        print(f"Response: {response}")
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure to set OPENAI_API_KEY environment variable")