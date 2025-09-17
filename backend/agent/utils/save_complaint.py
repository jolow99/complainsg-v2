import json
import uuid
from datetime import datetime
from typing import Dict, Optional
from .extract_structured_data import extract_structured_data
from .get_embedding import get_embedding

async def save_complaint(complaint_data: Dict, user_id: Optional[str] = None) -> str:
    """
    Save complaint data to database following reference pattern.

    Args:
        complaint_data: Dictionary containing complaint information (new format)
        user_id: Optional user ID for authenticated users

    Returns:
        str: Unique complaint ID
    """
    # Import here to avoid circular imports
    from app.db import get_async_session, Complaint
    from sqlalchemy import select

    # Handle both old and new data formats
    if "complaint" in complaint_data:
        # Old format for backward compatibility
        original_text = complaint_data["complaint"]["original_text"]
        conversation_history = complaint_data.get("conversation_history", [])
        title = complaint_data["complaint"].get("title", "Complaint")[:100]
        category = complaint_data["complaint"].get("category", "general")
        urgency = complaint_data["complaint"].get("urgency", "medium")
        location_description = complaint_data["complaint"].get("location", "")
        tags = complaint_data["complaint"].get("tags", [])
        keywords = complaint_data["complaint"].get("keywords", [])
        sentiment_score = complaint_data["complaint"].get("sentiment_score", 0.0)
    else:
        # New format from reference pattern
        original_text = complaint_data.get("original_text", "")
        conversation_history = complaint_data.get("conversation_history", [])
        title = complaint_data.get("title", "Complaint")[:100]
        category = complaint_data.get("category", "general")
        urgency = complaint_data.get("urgency", "medium")
        location_description = complaint_data.get("location_description", "")
        tags = complaint_data.get("tags", [])
        keywords = complaint_data.get("keywords", [])
        sentiment_score = complaint_data.get("sentiment_score", 0.0)

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
    session = get_async_session()
    session_obj = await session.__anext__()
    try:
        complaint = Complaint(
            id=complaint_id,
            user_id=user_id,

            # Original data
            original_text=original_text,
            conversation_history=conversation_history,

            # Basic data
            title=title,
            category=category,
            subcategory=complaint_data.get("subcategory", "general"),
            urgency=urgency,
            status=complaint_data.get("status", "open"),

            # Location data
            location_description=location_description,
            planning_area=complaint_data.get("planning_area", location_description),
            postal_code=complaint_data.get("postal_code"),
            latitude=complaint_data.get("latitude"),
            longitude=complaint_data.get("longitude"),

            # Timing and impact
            frequency=complaint_data.get("frequency"),
            time_of_occurrence=complaint_data.get("time_of_occurrence"),
            affected_count=complaint_data.get("affected_count"),

            # AI analysis
            sentiment_score=sentiment_score,
            tags=tags,
            keywords=keywords,

            # Vector embedding
            embedding=embedding_vector,

            # Default counts
            upvote_count=0,
            comment_count=0,
            view_count=0
        )

        session_obj.add(complaint)
        await session_obj.commit()

        print(f"Saved complaint {complaint_id} to database")
        print(f"Title: {title}")
        print(f"Category: {category}")
        print(f"Location: {location_description}")

        return complaint_id
    finally:
        await session_obj.close()

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