import json
import uuid
from datetime import datetime
from typing import Dict, Optional
from .extract_structured_data import extract_structured_data
from .get_embedding import get_embedding

async def save_complaint(complaint_data: Dict, user_id: Optional[str] = None) -> str:
    """
    Save complaint data to database with structured extraction.

    Args:
        complaint_data: Dictionary containing complaint information
        user_id: Optional user ID for authenticated users

    Returns:
        str: Unique complaint ID
    """
    # Import here to avoid circular imports
    from app.db import get_async_session, Complaint
    from sqlalchemy import select

    # Extract original complaint and history
    original_text = complaint_data["complaint"]["original_text"]
    conversation_history = complaint_data.get("conversation_history", [])

    # Use LLM to extract structured data
    structured_data = extract_structured_data(original_text, conversation_history)

    # Generate embedding for similarity search (if available)
    embedding_vector = None
    try:
        embedding_vector = get_embedding(original_text)
    except Exception as e:
        print(f"Warning: Could not generate embedding: {e}")
        print("Similarity search will not be available for this complaint")

    # Generate unique complaint ID
    complaint_id = str(uuid.uuid4())

    # Create complaint object
    async with get_async_session() as session:
        complaint = Complaint(
            id=complaint_id,
            user_id=user_id,

            # Original data
            original_text=original_text,
            conversation_history=conversation_history,

            # Structured data from LLM
            title=structured_data["title"],
            category=structured_data["category"],
            subcategory=structured_data.get("subcategory"),
            urgency=structured_data["urgency"],

            # Location data
            location_description=structured_data.get("location", {}).get("description"),
            postal_code=structured_data.get("location", {}).get("postal_code"),
            planning_area=structured_data.get("location", {}).get("planning_area"),

            # Timing and impact
            frequency=structured_data.get("timing", {}).get("frequency"),
            time_of_occurrence=structured_data.get("timing", {}).get("time_of_occurrence"),
            affected_count=structured_data.get("impact", {}).get("affected_count"),

            # AI analysis
            sentiment_score=structured_data["sentiment"],
            tags=structured_data["tags"],
            keywords=structured_data["keywords"],

            # Vector embedding
            embedding=embedding_vector
        )

        session.add(complaint)
        await session.commit()

        print(f"Saved complaint {complaint_id} to database")
        print(f"Title: {structured_data['title']}")
        print(f"Category: {structured_data['category']}")
        print(f"Location: {structured_data.get('location', {}).get('planning_area', 'Not specified')}")

        return complaint_id

# Sync version for backward compatibility (for testing)
def save_complaint_sync(complaint_data: Dict) -> str:
    """
    Synchronous version for testing - just prints data.
    In production, use the async version.
    """
    complaint_id = str(uuid.uuid4())

    # Add metadata
    enriched_data = {
        "id": complaint_id,
        "timestamp": datetime.now().isoformat(),
        "status": "submitted",
        **complaint_data
    }

    print(f"[TEST] Saving complaint {complaint_id} with data:")
    print(json.dumps(enriched_data, indent=2))

    return complaint_id

if __name__ == "__main__":
    # Test the sync version
    test_complaint = {
        "complaint": {
            "original_text": "The MRT at Dhoby Ghaut is always delayed during morning rush hours"
        },
        "conversation_history": [
            {"question": "When does this usually happen?", "answer": "Every morning around 8-9 AM"},
            {"question": "How long are the delays?", "answer": "Usually 5-10 minutes"}
        ]
    }

    complaint_id = save_complaint_sync(test_complaint)
    print(f"\nComplaint saved with ID: {complaint_id}")