import json
import uuid
from datetime import datetime
from typing import Dict

def save_complaint(complaint_data: Dict) -> str:
    """
    Save complaint data to storage and return complaint ID.

    Args:
        complaint_data: Dictionary containing complaint information

    Returns:
        str: Unique complaint ID
    """
    # Generate unique complaint ID
    complaint_id = str(uuid.uuid4())

    # Add metadata
    enriched_data = {
        "id": complaint_id,
        "timestamp": datetime.now().isoformat(),
        "status": "submitted",
        **complaint_data
    }

    # In a real implementation, this would save to a database
    # For now, we'll simulate saving and return the ID
    print(f"Saving complaint {complaint_id} with data:")
    print(json.dumps(enriched_data, indent=2))

    # TODO: Implement actual database save
    # Example:
    # with get_db_connection() as conn:
    #     conn.execute(
    #         "INSERT INTO complaints (id, data) VALUES (%s, %s)",
    #         (complaint_id, json.dumps(enriched_data))
    #     )

    return complaint_id

if __name__ == "__main__":
    # Test saving a complaint
    test_complaint = {
        "original_text": "The MRT is always delayed",
        "details": {
            "line": "Circle Line",
            "station": "Dhoby Ghaut",
            "frequency": "Daily during peak hours"
        },
        "category": "transport",
        "urgency": "medium",
        "contact_info": {
            "email": "user@example.com"
        }
    }

    complaint_id = save_complaint(test_complaint)
    print(f"\\nComplaint saved with ID: {complaint_id}")