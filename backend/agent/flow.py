from pocketflow import Flow
from .nodes import ChatNode

def create_chat_flow():
    """
    Create and return a simple chat flow.

    Returns:
        Flow: A PocketFlow instance configured for chat
    """
    # Create the chat node
    chat_node = ChatNode()

    # Create flow starting with the chat node
    return Flow(start=chat_node)

def run_chat(user_message: str, conversation_history: list = None) -> dict:
    """
    Run the chat flow with a user message.

    Args:
        user_message (str): The user's input message
        conversation_history (list, optional): Previous conversation exchanges

    Returns:
        dict: Contains 'response' and 'conversation_history'
    """
    # Initialize shared store
    shared = {
        "user_message": user_message,
        "conversation_history": conversation_history or []
    }

    # Create and run the flow
    chat_flow = create_chat_flow()
    chat_flow.run(shared)

    # Return the result
    return {
        "response": shared.get("assistant_response", "Sorry, I couldn't generate a response."),
        "conversation_history": shared.get("conversation_history", [])
    }