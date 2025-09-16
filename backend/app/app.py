from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from uuid import UUID
import json

from app.db import User, get_async_session, create_db_and_tables
from app.schemas import (
    UserRead, UserCreate, UserUpdate,
    ConversationCreate, ConversationUpdate, ConversationRead, ConversationListItem,
    ChatRequest, ChatResponse, MessageCreate
)
from app.users import auth_backend, fastapi_users, current_active_user
from app.conversations import (
    get_user_conversations, get_conversation_by_id, create_conversation,
    update_conversation, delete_conversation, add_message_to_conversation,
    create_conversation_with_messages
)
from agent import run_streaming_chat

app = FastAPI()

# Legacy Pydantic models for backwards compatibility
class ChatMessage(BaseModel):
    user: str
    assistant: str

# Schema for streaming chat
class StreamingChatRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None

class StreamingChatResponse(BaseModel):
    response: str
    conversation_history: List[Dict[str, str]]
    conversation_id: str

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # Create database tables
    await create_db_and_tables()

# Include auth routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

@app.get("/")
async def root():
    return {"message": "Hello from Sail Backend with Authentication!"}

@app.get("/health")
async def health_check():
    import os
    return {
        "status": "healthy",
        "database_url": os.getenv("DATABASE_URL", "not configured")
    }

@app.get("/protected")
async def protected_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email}!", "is_admin": user.is_admin}

# Conversation endpoints
@app.get("/conversations", response_model=List[ConversationListItem])
async def get_conversations(
    user: User = Depends(current_active_user),
    db = Depends(get_async_session)
):
    """Get all conversations for the current user."""
    conversations = await get_user_conversations(db, user.id)

    # Convert to list items with last message
    result = []
    for conv in conversations:
        last_message = None
        if conv.messages:
            # Get the last message content
            last_message = conv.messages[-1].content
            if len(last_message) > 100:
                last_message = last_message[:100] + "..."

        result.append(ConversationListItem(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            last_message=last_message
        ))

    return result


@app.get("/conversations/{conversation_id}", response_model=ConversationRead)
async def get_conversation(
    conversation_id: UUID,
    user: User = Depends(current_active_user),
    db = Depends(get_async_session)
):
    """Get a specific conversation with all messages."""
    conversation = await get_conversation_by_id(db, conversation_id, user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/conversations", response_model=ConversationRead)
async def create_new_conversation(
    conversation: ConversationCreate,
    user: User = Depends(current_active_user),
    db = Depends(get_async_session)
):
    """Create a new conversation."""
    return await create_conversation(db, conversation, user.id)


@app.put("/conversations/{conversation_id}", response_model=ConversationRead)
async def update_conversation_title(
    conversation_id: UUID,
    conversation_update: ConversationUpdate,
    user: User = Depends(current_active_user),
    db = Depends(get_async_session)
):
    """Update a conversation title."""
    conversation = await update_conversation(db, conversation_id, conversation_update, user.id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.delete("/conversations/{conversation_id}")
async def delete_conversation_endpoint(
    conversation_id: UUID,
    user: User = Depends(current_active_user),
    db = Depends(get_async_session)
):
    """Delete a conversation."""
    success = await delete_conversation(db, conversation_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted successfully"}





@app.post("/chat/stream")
async def streaming_chat(
    request: StreamingChatRequest,
    user: User = Depends(current_active_user),
    db = Depends(get_async_session)
):
    """Real streaming chat endpoint that streams response chunks."""

    # Load existing conversation if provided
    conversation_history = []
    if request.conversation_id:
        conversation = await get_conversation_by_id(db, request.conversation_id, user.id)
        if conversation:
            # Build conversation history from database
            for message_obj in conversation.messages:
                if message_obj.role == "user":
                    user_msg = message_obj.content
                    assistant_msg = ""
                else:  # assistant
                    assistant_msg = message_obj.content
                    conversation_history.append({"user": user_msg, "assistant": assistant_msg})

    # Call agent directly and return its streaming response
    from agent import run_streaming_chat

    def generate():
        try:
            for chunk in run_streaming_chat(request.message, conversation_history):
                yield chunk
            yield "\n\n[STREAM_END]"
        except Exception as e:
            yield f"\n\n[ERROR]: {str(e)}"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# Endpoint to save conversation after streaming completes
@app.post("/chat/save")
async def save_chat_message(
    request: dict,  # {message: str, response: str, conversation_id?: str}
    user: User = Depends(current_active_user),
    db = Depends(get_async_session)
):
    """Save chat message to database after streaming completes."""
    try:
        message = request["message"]
        response = request["response"]
        conversation_id = request.get("conversation_id")

        if conversation_id:
            # Add messages to existing conversation
            await add_message_to_conversation(
                db, conversation_id,
                MessageCreate(role="user", content=message),
                user.id
            )
            await add_message_to_conversation(
                db, conversation_id,
                MessageCreate(role="assistant", content=response),
                user.id
            )
            final_conversation_id = conversation_id
        else:
            # Create new conversation
            conversation = await create_conversation_with_messages(
                db, user.id, message, response
            )
            final_conversation_id = conversation.id

        return {"conversation_id": str(final_conversation_id)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving conversation: {str(e)}")