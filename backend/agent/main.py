from .flow import create_complaint_flow, create_shared_store
import asyncio

async def run_agent_flow_async(initial_complaint: str, user_answers: list = None, user_contact: dict = None, message_queue = None):
    """
    Process a complaint using the PocketFlow agent asynchronously.

    Args:
        initial_complaint: The user's initial complaint text
        user_answers: List of answers to previous questions (if any)
        user_contact: Optional user contact information
        message_queue: Async queue for streaming responses

    Returns:
        dict: Processing result with next_action, questions, resources, etc.
    """
    # Create the complaint processing flow
    complaint_flow = create_complaint_flow()

    # Initialize shared store
    shared = create_shared_store(initial_complaint, user_contact)

    # Add message queue for streaming
    if message_queue:
        shared["message_queue"] = message_queue

    # Add user answers to conversation history if provided
    if user_answers:
        current_questions = shared.get("current_questions", [])
        for i, answer in enumerate(user_answers):
            if i < len(current_questions):
                shared["conversation_history"].append({
                    "question": current_questions[i],
                    "answer": answer
                })

                if not shared["complaint"]["details"]:
                    shared["complaint"]["details"] = {}
                shared["complaint"]["details"][f"detail_{i+1}"] = answer

    # Run the async flow
    await complaint_flow.run_async(shared)

    # Signal end of stream
    if message_queue:
        await message_queue.put(None)

    # Return results for post-processing
    return {
        "status": "completed" if shared.get("is_complete") else "processing",
        "agent_decision": shared.get("agent_decision", ""),
        "is_complete": shared.get("is_complete", False),
        "complaint_id": shared.get("complaint_id", ""),
        "completion_message": shared.get("completion_message", ""),
        "questions": shared.get("current_questions", []),
        "probing_explanation": shared.get("probing_explanation", ""),
        "recommended_resources": shared.get("recommended_resources", []),
        "resource_recommendation": shared.get("resource_recommendation", ""),
        "analysis": shared.get("analysis", {})
    }


# Backward compatibility function (sync wrapper)
def run_agent_flow(initial_complaint: str, user_answers: list = None, user_contact: dict = None):
    """
    Synchronous wrapper for backward compatibility.
    """
    return asyncio.run(run_agent_flow_async(initial_complaint, user_answers, user_contact))


# Testing and usage examples
if __name__ == "__main__":
    # Test complaint processing
    print("Testing complaint processing...")

    test_complaint = "The MRT is always delayed during peak hours at Dhoby Ghaut station"

    try:
        result = run_agent_flow(test_complaint)
        print(f"Initial processing result: {result}")

        # If questions were asked, simulate answers
        if result.get("questions"):
            print(f"Questions asked: {result['questions']}")

            # Simulate user answers
            test_answers = [
                "This happens every morning around 8-9 AM",
                "It affects about 5-10 minutes delay consistently"
            ]

            print("Processing with answers...")
            final_result = run_agent_flow(test_complaint, test_answers)
            print(f"Final result: {final_result}")

    except Exception as e:
        print(f"Error testing complaint processing: {e}")

    print("\nComplaint agent is ready for integration!")