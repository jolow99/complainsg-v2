from .flow import create_complaint_flow, create_shared_store
import asyncio

async def run_agent_flow_async(conversation_history: list, task_metadata: dict = None, message_queue = None):
    """
    Process a complaint using the PocketFlow agent following reference pattern.

    Args:
        conversation_history: List of conversation messages
        task_metadata: Task metadata with complaint topic, location, etc.
        message_queue: Async queue for streaming responses

    Returns:
        dict: Processing result with metadata and completion status
    """
    # Create the complaint processing flow
    complaint_flow = create_complaint_flow()

    # Initialize shared store following reference pattern
    shared = create_shared_store(conversation_history, task_metadata, message_queue)

    # Run the async flow
    await complaint_flow.run_async(shared)

    # Return results for post-processing
    return {
        "status": shared.get("status", "continue"),
        "task_metadata": shared.get("task_metadata", {}),
        "complaint_id": shared.get("complaint_id", ""),
        "conversation_history": shared.get("conversation_history", [])
    }


# Backward compatibility function (sync wrapper)
def run_agent_flow(conversation_history: list, task_metadata: dict = None):
    """
    Synchronous wrapper for backward compatibility.
    """
    return asyncio.run(run_agent_flow_async(conversation_history, task_metadata))


# Testing and usage examples
if __name__ == "__main__":
    # Test complaint processing
    print("Testing complaint processing...")

    test_conversation = [
        {"role": "user", "content": "The MRT is always delayed during peak hours at Dhoby Ghaut station"}
    ]

    try:
        result = run_agent_flow(test_conversation)
        print(f"Initial processing result: {result}")

        # Test with follow-up conversation
        test_conversation_followup = [
            {"role": "user", "content": "The MRT is always delayed during peak hours at Dhoby Ghaut station"},
            {"role": "assistant", "content": "Can you tell me more about when this happens?"},
            {"role": "user", "content": "This happens every morning around 8-9 AM and affects about 5-10 minutes delay consistently"}
        ]

        print("Processing with follow-up...")
        final_result = run_agent_flow(test_conversation_followup)
        print(f"Final result: {final_result}")

    except Exception as e:
        print(f"Error testing complaint processing: {e}")

    print("\nComplaint agent is ready for integration!")