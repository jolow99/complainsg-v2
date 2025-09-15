from fastapi_users import schemas
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class UserRead(schemas.BaseUser):
    is_admin: bool

class UserCreate(schemas.BaseUserCreate):
    pass

class UserUpdate(schemas.BaseUserUpdate):
    is_admin: bool | None = None


# Message schemas
class MessageBase(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class MessageCreate(MessageBase):
    pass

class MessageRead(MessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    created_at: datetime


# Conversation schemas
class ConversationBase(BaseModel):
    title: str

class ConversationCreate(ConversationBase):
    pass

class ConversationUpdate(BaseModel):
    title: Optional[str] = None

class ConversationRead(ConversationBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    messages: List[MessageRead] = []

class ConversationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    last_message: Optional[str] = None


# Chat API schemas (for existing chat endpoint)
class ChatMessage(BaseModel):
    user: str
    assistant: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None
    conversation_history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    conversation_id: UUID
    conversation_history: List[ChatMessage]