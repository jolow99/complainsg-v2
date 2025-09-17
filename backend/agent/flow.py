from pocketflow import AsyncFlow
from .nodes import (
    HTTPDataExtractionNodeAsync,
    HTTPGenerateNodeAsync,
    HTTPSummarizerNodeAsync,
    HTTPRejectionNodeAsync,
)

def create_complaint_flow():
    """Create and return a complaint processing flow following reference pattern."""

    # Create nodes following reference pattern
    extraction = HTTPDataExtractionNodeAsync()
    generate = HTTPGenerateNodeAsync()
    summarizer = HTTPSummarizerNodeAsync()
    rejection = HTTPRejectionNodeAsync()

    # Connect nodes with actions matching reference pattern
    extraction - 'continue' >> generate
    extraction - 'summarize' >> summarizer
    extraction - 'reject' >> rejection

    # Create flow starting with data extraction
    return AsyncFlow(start=extraction)

def create_shared_store(conversation_history: list, task_metadata: dict = None, message_queue=None):
    """
    Create initial shared store for complaint processing following reference pattern.

    Args:
        conversation_history: List of conversation messages
        task_metadata: Task metadata with complaint topic, location, etc.
        message_queue: Async queue for streaming responses

    Returns:
        dict: Initialized shared store
    """
    return {
        "conversation_history": conversation_history,
        "task_metadata": task_metadata or {
            "complaint_topic": "",
            "complaint_summary": "",
            "complaint_location": "",
            "complaint_quality": 0,
        },
        "message_queue": message_queue,
        "status": "continue"
    }