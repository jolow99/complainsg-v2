import time
import threading
from pocketflow import Node, Flow
from .utils import stream_llm
import os

class StreamNode(Node):
    def prep(self, shared):
        # Create interrupt event
        interrupt_event = threading.Event()

        # Start a thread to listen for user interrupt
        def wait_for_interrupt():
            input("Press ENTER at any time to interrupt streaming...\n")
            interrupt_event.set()
        listener_thread = threading.Thread(target=wait_for_interrupt)
        listener_thread.start()
        
        # Get prompt from shared store
        prompt = shared["prompt"]
        # Get chunks from LLM function
        chunks = stream_llm(prompt)
        return chunks, interrupt_event, listener_thread

    def exec(self, prep_res):
        chunks, interrupt_event, listener_thread = prep_res
        for chunk in chunks:
            if interrupt_event.is_set():
                print("User interrupted streaming.")
                break
            
            if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content is not None:
                chunk_content = chunk.choices[0].delta.content
                print(chunk_content, end="", flush=True)
                time.sleep(0.1)  # simulate latency
        return interrupt_event, listener_thread

    def post(self, shared, prep_res, exec_res):
        interrupt_event, listener_thread = exec_res
        # Join the interrupt listener so it doesn't linger
        interrupt_event.set()
        listener_thread.join()
        return "default"

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
        "content": "You are a helpful AI assistant. Respond naturally and helpfully to the user's questions."
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


# Original usage for testing:
if __name__ == "__main__":
    node = StreamNode()
    flow = Flow(start=node)

    shared = {"prompt": "What's the meaning of life?"}
    flow.run(shared)