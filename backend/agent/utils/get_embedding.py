import os
from openai import OpenAI
from typing import List

def get_embedding(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """
    Get embedding vector for text using OpenAI's embedding API.

    Args:
        text: Text to embed
        model: OpenAI embedding model to use

    Returns:
        List of floats representing the embedding vector
    """
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    )

    # Clean and truncate text if too long
    text = text.replace("\n", " ").strip()
    if len(text) > 8000:  # OpenAI has token limits
        text = text[:8000]

    response = client.embeddings.create(
        input=text,
        model=model
    )

    return response.data[0].embedding

if __name__ == "__main__":
    test_text = "The MRT is always delayed during peak hours"

    print("Getting embedding...")
    embedding = get_embedding(test_text)
    print(f"Embedding dimension: {len(embedding)}")
    print(f"First 5 values: {embedding[:5]}")