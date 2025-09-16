import time
import threading
from pocketflow import Node, Flow
from .utils import stream_llm
from .flow import create_complaint_flow, create_shared_store
import os

def process_complaint(initial_complaint: str, user_answers: list = None, user_contact: dict = None):
    """
    Process a complaint using the PocketFlow agent.

    Args:
        initial_complaint: The user's initial complaint text
        user_answers: List of answers to previous questions (if any)
        user_contact: Optional user contact information

    Returns:
        dict: Processing result with next_action, questions, resources, etc.
    """
    try:
        # Create the complaint processing flow
        complaint_flow = create_complaint_flow()

        # Initialize shared store
        shared = create_shared_store(initial_complaint, user_contact)

        # Add user answers to conversation history if provided
        if user_answers:
            # Get the last questions that were asked
            current_questions = shared.get("current_questions", [])
            for i, answer in enumerate(user_answers):
                if i < len(current_questions):
                    shared["conversation_history"].append({
                        "question": current_questions[i],
                        "answer": answer
                    })

                    # Update complaint details based on answer
                    # This is a simple implementation - in practice, you might want
                    # more sophisticated parsing
                    if not shared["complaint"]["details"]:
                        shared["complaint"]["details"] = {}
                    shared["complaint"]["details"][f"detail_{i+1}"] = answer

        # Run the flow
        complaint_flow.run(shared)

        # Prepare response based on current state
        result = {
            "status": "processing",
            "agent_decision": shared.get("agent_decision", ""),
            "is_complete": shared.get("is_complete", False),
            "complaint_id": shared.get("complaint_id", ""),
            "completion_message": shared.get("completion_message", "")
        }

        # Add questions if probing is needed
        if shared.get("current_questions"):
            result["questions"] = shared["current_questions"]
            result["probing_explanation"] = shared.get("probing_explanation", "")

        # Add resources if available
        if shared.get("recommended_resources"):
            result["recommended_resources"] = shared["recommended_resources"]
            result["resource_recommendation"] = shared.get("resource_recommendation", "")

        # Add analysis if available
        if shared.get("analysis"):
            result["analysis"] = shared["analysis"]

        return result

    except Exception as e:
        raise Exception(f"Error in complaint processing: {str(e)}")


def run_streaming_chat(user_message: str, conversation_history: list = None):
    """
    Run streaming chat for FastAPI - yields chunks as they come.

    Args:
        user_message: The user's message
        conversation_history: List of conversation dicts with 'user' and 'assistant' keys

    Yields:
        str: Individual chunks from the LLM response
    """
    # Build OpenAI messages format
    messages = []

    # System message
    messages.append({
        "role": "system",
        "content": "You are a helpful AI assistant for ComplainSG, helping Singaporeans submit better complaints and feedback to government agencies. Be helpful, respectful, and Singapore-specific in your responses."
    })

    # Add conversation history (last 10 exchanges)
    if conversation_history:
        for msg in conversation_history[-10:]:
            messages.append({"role": "user", "content": msg["user"]})
            messages.append({"role": "assistant", "content": msg["assistant"]})

    # Add current user message
    messages.append({"role": "user", "content": user_message})

    # Stream the response
    try:
        # Require API key
        if not os.getenv("OPENAI_API_KEY"):
            raise Exception("OPENAI_API_KEY environment variable is required")

        chunks = stream_llm(messages)

        for chunk in chunks:
            if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content is not None:
                chunk_content = chunk.choices[0].delta.content
                yield chunk_content

    except Exception as e:
        raise Exception(f"Error in streaming chat: {str(e)}")


# Testing and usage examples
if __name__ == "__main__":
    # Test complaint processing
    print("Testing complaint processing...")

    test_complaint = "The MRT is always delayed during peak hours at Dhoby Ghaut station"

    try:
        result = process_complaint(test_complaint)
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
            final_result = process_complaint(test_complaint, test_answers)
            print(f"Final result: {final_result}")

    except Exception as e:
        print(f"Error testing complaint processing: {e}")

    print("\nComplaint agent is ready for integration!")