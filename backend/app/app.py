from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from app.db import User, create_db_and_tables
from app.schemas import UserRead, UserCreate, UserUpdate
from app.users import auth_backend, fastapi_users, current_active_user
from agent import run_chat

app = FastAPI()

# Pydantic models for chat API
class ChatMessage(BaseModel):
    user: str
    assistant: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    conversation_history: List[ChatMessage]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
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

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    user: User = Depends(current_active_user)
):
    """
    Chat endpoint that processes user messages using the PocketFlow agent.
    Requires authentication.
    """
    # Convert Pydantic models to dict format expected by the agent
    conversation_history = [
        {"user": msg.user, "assistant": msg.assistant}
        for msg in request.conversation_history
    ]

    # Run the chat agent
    result = run_chat(request.message, conversation_history)

    # Convert response back to Pydantic models
    response_history = [
        ChatMessage(user=msg["user"], assistant=msg["assistant"])
        for msg in result["conversation_history"]
    ]

    return ChatResponse(
        response=result["response"],
        conversation_history=response_history
    )

@app.post("/chat/public", response_model=ChatResponse)
async def public_chat_endpoint(request: ChatRequest):
    """
    Public chat endpoint (no authentication required) for testing.
    """
    # Convert Pydantic models to dict format expected by the agent
    conversation_history = [
        {"user": msg.user, "assistant": msg.assistant}
        for msg in request.conversation_history
    ]

    # Run the chat agent
    result = run_chat(request.message, conversation_history)

    # Convert response back to Pydantic models
    response_history = [
        ChatMessage(user=msg["user"], assistant=msg["assistant"])
        for msg in result["conversation_history"]
    ]

    return ChatResponse(
        response=result["response"],
        conversation_history=response_history
    )