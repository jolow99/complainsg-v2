from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.db import Conversation, Message, User
from app.schemas import ConversationCreate, ConversationUpdate, MessageCreate


async def get_user_conversations(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 50
) -> List[Conversation]:
    """Get all conversations for a user, ordered by most recent activity."""
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(desc(Conversation.updated_at))
        .limit(limit)
        .options(selectinload(Conversation.messages))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_conversation_by_id(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID
) -> Optional[Conversation]:
    """Get a conversation by ID, ensuring it belongs to the user."""
    stmt = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
        .options(selectinload(Conversation.messages))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_conversation(
    db: AsyncSession,
    conversation: ConversationCreate,
    user_id: UUID
) -> Conversation:
    """Create a new conversation for a user."""
    db_conversation = Conversation(
        title=conversation.title,
        user_id=user_id
    )
    db.add(db_conversation)
    await db.commit()
    await db.refresh(db_conversation)
    return db_conversation


async def update_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    conversation_update: ConversationUpdate,
    user_id: UUID
) -> Optional[Conversation]:
    """Update a conversation title."""
    stmt = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
    )
    result = await db.execute(stmt)
    db_conversation = result.scalar_one_or_none()

    if not db_conversation:
        return None

    if conversation_update.title is not None:
        db_conversation.title = conversation_update.title

    await db.commit()
    await db.refresh(db_conversation)
    return db_conversation


async def delete_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID
) -> bool:
    """Delete a conversation and all its messages."""
    stmt = (
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
    )
    result = await db.execute(stmt)
    db_conversation = result.scalar_one_or_none()

    if not db_conversation:
        return False

    await db.delete(db_conversation)
    await db.commit()
    return True


async def add_message_to_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    message: MessageCreate,
    user_id: UUID
) -> Optional[Message]:
    """Add a message to a conversation."""
    # First verify the conversation belongs to the user
    conversation = await get_conversation_by_id(db, conversation_id, user_id)
    if not conversation:
        return None

    db_message = Message(
        conversation_id=conversation_id,
        role=message.role,
        content=message.content
    )
    db.add(db_message)

    # Update conversation's updated_at timestamp
    from sqlalchemy import func
    conversation.updated_at = func.now()

    await db.commit()
    await db.refresh(db_message)
    return db_message


async def generate_conversation_title(first_message: str) -> str:
    """Generate a conversation title from the first user message."""
    # Simple title generation - you can enhance this with AI later
    words = first_message.split()[:6]  # First 6 words
    title = " ".join(words)
    if len(first_message.split()) > 6:
        title += "..."
    return title[:50]  # Limit to 50 characters


async def create_conversation_with_messages(
    db: AsyncSession,
    user_id: UUID,
    user_message: str,
    assistant_message: str
) -> Conversation:
    """Create a new conversation with initial user and assistant messages."""
    # Generate title from user message
    title = await generate_conversation_title(user_message)

    # Create conversation
    conversation = await create_conversation(
        db,
        ConversationCreate(title=title),
        user_id
    )

    # Add user message
    await add_message_to_conversation(
        db,
        conversation.id,
        MessageCreate(role="user", content=user_message),
        user_id
    )

    # Add assistant message
    await add_message_to_conversation(
        db,
        conversation.id,
        MessageCreate(role="assistant", content=assistant_message),
        user_id
    )

    # Refresh to get all messages
    await db.refresh(conversation)
    return conversation