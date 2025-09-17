from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from uuid import UUID
import json
import uuid
import asyncio

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
from agent import run_agent_flow
from app.pulse import router as pulse_router

app = FastAPI()

# Dictionary to hold queues for different tasks
task_queues = {}
# Dictionary to hold metadata for different tasks
task_metadata = {}
# Lock to prevent race conditions when creating tasks
task_creation_lock = asyncio.Lock()

# Legacy Pydantic models for backwards compatibility
class ChatMessage(BaseModel):
    user: str
    assistant: str


# Schema for complaint processing
class ComplaintRequest(BaseModel):
    message: str
    user_answers: Optional[List[str]] = None
    user_contact: Optional[Dict] = None

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://206.189.89.24:3000"],  # Frontend URLs
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

# Include Pulse analytics routes
app.include_router(pulse_router)

# Async flow runner
async def run_complaint_flow(shared_store: dict):
    """Run the complaint processing flow asynchronously."""
    from agent.flow import create_complaint_flow
    flow = create_complaint_flow()
    await flow.run_async(shared_store)

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


# New complaint processing endpoints following the reference pattern
@app.post("/api/complaint")
async def create_complaint_task(
    request: ComplaintRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(current_active_user)
):
    """Create a new complaint processing task."""
    # Task ID for client reference
    task_id = f"complaint_{uuid.uuid4().hex[:8]}"

    # Use lock to prevent race conditions
    async with task_creation_lock:
        # Check if task queue exists, if not create it
        if task_id not in task_queues:
            message_queue = asyncio.Queue()
            task_queues[task_id] = message_queue
        else:
            raise HTTPException(status_code=400, detail=f"Task {task_id} already exists")

    # Define shared store parameters
    from agent.flow import create_shared_store
    shared_store = create_shared_store(
        request.message,
        request.user_contact
    )

    # Add user answers if provided
    if request.user_answers:
        for i, answer in enumerate(request.user_answers):
            shared_store["conversation_history"].append({
                "question": f"Question {i+1}",
                "answer": answer
            })

    # Add task-specific parameters
    shared_store.update({
        "message_queue": message_queue,
        "task_id": task_id,
        "user_id": str(user.id)
    })

    # Start background flow
    background_tasks.add_task(run_complaint_flow, shared_store)
    return {"task_id": task_id}


@app.get("/api/complaint/stream/{task_id}")
async def stream_complaint_processing(task_id: str):
    """Stream complaint processing results."""

    # Use lock to prevent race conditions
    async with task_creation_lock:
        # If task doesn't exist, create the queue only (no flow execution)
        if task_id not in task_queues:
            message_queue = asyncio.Queue()
            task_queues[task_id] = message_queue
        else:
            message_queue = task_queues[task_id]

    async def stream_generator():
        try:
            while True:
                message = await message_queue.get()
                # If message is None, stream is done
                if message is None:
                    # Signal end of stream
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    break
                yield f"data: {json.dumps({'content': message})}\n\n"
                message_queue.task_done()
        finally:
            # Clean up the queue
            if task_id in task_queues:
                del task_queues[task_id]

    return StreamingResponse(stream_generator(), media_type="text/event-stream")







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