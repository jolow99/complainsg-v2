from pocketflow import AsyncFlow
from .nodes import (
    InitialAssessmentNode,
    ProbingNode,
    ComplaintStorageNode
)

def create_complaint_flow():
    """Create and return a complaint processing flow focused on thorough probing."""

    # Create nodes
    assess_node = InitialAssessmentNode()
    probe_node = ProbingNode()
    store_node = ComplaintStorageNode()

    # Connect nodes with actions
    # From assessment, we can either probe more or save to storage
    assess_node - "needs_probing" >> probe_node
    assess_node - "ready_for_storage" >> store_node

    # From probing, we always go back to assessment for another round
    probe_node - "assess" >> assess_node

    # Storage node completes the flow and provides resources
    # No further connections needed as it returns "complete"

    # Create flow starting with assessment
    return AsyncFlow(start=assess_node)

def create_shared_store(initial_complaint: str, user_contact: dict = None):
    """
    Create initial shared store for complaint processing.

    Args:
        initial_complaint: The user's initial complaint text
        user_contact: Optional user contact information

    Returns:
        dict: Initialized shared store
    """
    return {
        "complaint": {
            "original_text": initial_complaint,
            "details": {},
            "category": "",
            "location": "",
            "urgency": "",
            "contact_info": user_contact or {}
        },
        "conversation_history": [],
        "recommended_resources": [],
        "agent_decision": "",
        "is_complete": False,
        "analysis": {},
        "probing_areas": [],
        "current_questions": [],
        "probing_explanation": "",
        "resource_recommendation": "",
        "complaint_id": "",
        "completion_message": ""
    }