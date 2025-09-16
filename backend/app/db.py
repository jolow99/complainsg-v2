import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import Boolean, Column, DateTime, func, String, Text, ForeignKey, UUID, Float, Integer, JSON, Index, text
from sqlalchemy.dialects.postgresql import ARRAY
import uuid

# Try to import pgvector, but make it optional
try:
    from pgvector.sqlalchemy import Vector
    HAS_VECTOR = True
except ImportError:
    print("Warning: pgvector not available. Vector similarity search will be disabled.")
    HAS_VECTOR = False
    # Create a placeholder Vector type
    def Vector(dim):
        return Text  # Fallback to Text if pgvector not available

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")
# Convert to async URL for asyncpg
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(ASYNC_DATABASE_URL)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"

    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to conversations
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    conversation = relationship("Conversation", back_populates="messages")


# Complaint System Tables for Pulse Analytics

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Optional for anonymous complaints

    # Original complaint text and metadata
    original_text = Column(Text, nullable=False)
    conversation_history = Column(JSON, nullable=True)  # Store the Q&A history

    # Structured fields extracted by LLM
    title = Column(String(500), nullable=False)
    category = Column(String(100), nullable=False)  # transport, housing, healthcare, etc.
    subcategory = Column(String(100), nullable=True)
    urgency = Column(String(50), nullable=False, default='medium')
    status = Column(String(50), nullable=False, default='submitted')

    # Location data for map visualization
    location_description = Column(String(500), nullable=True)  # "Near Dhoby Ghaut MRT"
    postal_code = Column(String(10), nullable=True)
    planning_area = Column(String(100), nullable=True)  # Singapore planning areas
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Additional structured data
    affected_count = Column(Integer, nullable=True)  # How many people affected
    frequency = Column(String(100), nullable=True)  # "daily", "weekly", etc.
    time_of_occurrence = Column(String(100), nullable=True)  # "peak hours", "evenings"

    # AI analysis fields
    sentiment_score = Column(Float, nullable=True)  # -1 to 1
    tags = Column(ARRAY(String), nullable=True)  # ["noise", "construction", "mrt"]
    keywords = Column(ARRAY(String), nullable=True)

    # Vector embedding for similarity search
    embedding = Column(Vector(1536), nullable=True)  # OpenAI ada-002 dimension

    # Analytics fields
    view_count = Column(Integer, default=0)
    upvote_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="complaints")
    comments = relationship("ComplaintComment", back_populates="complaint", cascade="all, delete-orphan")
    votes = relationship("ComplaintVote", back_populates="complaint", cascade="all, delete-orphan")

    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_complaints_category', 'category'),
        Index('idx_complaints_location', 'planning_area', 'postal_code'),
        Index('idx_complaints_created_at', 'created_at'),
        Index('idx_complaints_status', 'status'),
        Index('idx_complaints_embedding_cosine', 'embedding', postgresql_using='ivfflat', postgresql_ops={'embedding': 'vector_cosine_ops'}),
    )


class ComplaintComment(Base):
    __tablename__ = "complaint_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Anonymous allowed

    content = Column(Text, nullable=False)
    parent_comment_id = Column(UUID(as_uuid=True), ForeignKey("complaint_comments.id"), nullable=True)  # For threaded discussions

    upvote_count = Column(Integer, default=0)
    is_from_authority = Column(Boolean, default=False)  # Mark official responses

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    complaint = relationship("Complaint", back_populates="comments")
    user = relationship("User")
    parent_comment = relationship("ComplaintComment", remote_side=[id], backref="replies")


class ComplaintVote(Base):
    __tablename__ = "complaint_votes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    vote_type = Column(String(20), nullable=False)  # 'upvote', 'downvote'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    complaint = relationship("Complaint", back_populates="votes")
    user = relationship("User")

    # Unique constraint to prevent duplicate votes
    __table_args__ = (
        Index('unique_user_complaint_vote', 'user_id', 'complaint_id', unique=True),
    )


class ComplaintAnalytics(Base):
    __tablename__ = "complaint_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(DateTime(timezone=True), nullable=False)

    # Daily aggregated metrics
    total_complaints = Column(Integer, default=0)
    category_breakdown = Column(JSON, nullable=True)  # {"transport": 10, "housing": 5}
    location_breakdown = Column(JSON, nullable=True)  # {"Tampines": 8, "Jurong": 7}
    average_sentiment = Column(Float, nullable=True)
    trending_keywords = Column(ARRAY(String), nullable=True)

    # Unique constraint on date
    __table_args__ = (
        Index('unique_analytics_date', 'date', unique=True),
    )


async def create_db_and_tables():
    async with engine.begin() as conn:
        # Try to create pgvector extension if it doesn't exist and we have pgvector
        if HAS_VECTOR:
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                print("pgvector extension enabled - vector similarity search available")
            except Exception as e:
                print(f"Warning: Could not create vector extension: {e}")
                print("Vector similarity search will not be available")

        await conn.run_sync(Base.metadata.create_all)

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session