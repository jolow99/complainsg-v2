#!/usr/bin/env python3
"""
Simple chat agent using PocketFlow.

This module provides a command-line interface for testing the chat agent.
"""

import os
import sys
from dotenv import load_dotenv
from flow import run_chat

def main():
    """
    Main function for testing the chat agent via command line.
    """
    # Load environment variables
    load_dotenv()

    print("🤖 Chat Agent (PocketFlow)")
    print("Type 'quit' or 'exit' to stop the conversation")
    print("=" * 50)

    conversation_history = []

    while True:
        try:
            # Get user input
            user_input = input("\n👤 You: ").strip()

            # Check for exit commands
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("👋 Goodbye!")
                break

            if not user_input:
                print("Please enter a message.")
                continue

            # Run the chat flow
            print("🤔 Thinking...")
            result = run_chat(user_input, conversation_history)

            # Display response
            print(f"🤖 Assistant: {result['response']}")

            # Update conversation history
            conversation_history = result['conversation_history']

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            print("Please check your environment configuration.")

if __name__ == "__main__":
    main()