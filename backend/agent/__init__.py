"""
Simple Streaming Chat Agent using PocketFlow framework.

This package provides a streaming chat agent implementation that yields
chunks in real-time from OpenAI's streaming API.
"""

from .main import run_streaming_chat, StreamNode
from .utils import stream_llm

__all__ = [
    "run_streaming_chat",
    "StreamNode",
    "stream_llm"
]