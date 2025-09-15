from pocketflow import Node
from .utils.call_llm import call_llm

class ChatNode(Node):
    """
    A simple chat node that processes user messages and generates responses.
    """

    def prep(self, shared):
        """
        Prepare the user message and conversation context.

        Args:
            shared: Shared store containing 'user_message' and optional 'conversation_history'

        Returns:
            tuple: (user_message, conversation_context)
        """
        user_message = shared.get("user_message", "")
        conversation_history = shared.get("conversation_history", [])

        # Build context from conversation history
        context = ""
        if conversation_history:
            context = "\n".join([
                f"User: {msg['user']}\nAssistant: {msg['assistant']}"
                for msg in conversation_history[-5:]  # Keep last 5 exchanges
            ])
            context += "\n"

        return user_message, context

    def exec(self, prep_res):
        """
        Generate a response using the LLM.

        Args:
            prep_res: Tuple of (user_message, context)

        Returns:
            str: The LLM's response
        """
        user_message, context = prep_res

        # Create a prompt with context
        prompt = f"""You are a helpful AI assistant. Respond naturally and helpfully to the user's message.

{context}User: {user_message}
Assistant:"""

        return call_llm(prompt)

    def post(self, shared, prep_res, exec_res):
        """
        Store the response and update conversation history.

        Args:
            shared: Shared store
            prep_res: The prep result (user_message, context)
            exec_res: The LLM's response
        """
        user_message, _ = prep_res
        assistant_response = exec_res

        # Store the response
        shared["assistant_response"] = assistant_response

        # Update conversation history
        if "conversation_history" not in shared:
            shared["conversation_history"] = []

        shared["conversation_history"].append({
            "user": user_message,
            "assistant": assistant_response
        })

        # Keep only last 10 exchanges to manage memory
        if len(shared["conversation_history"]) > 10:
            shared["conversation_history"] = shared["conversation_history"][-10:]

        return "default"