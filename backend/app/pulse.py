from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, text
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.db import get_async_session, Complaint, ComplaintComment, ComplaintVote, User
from app.users import current_active_user
import json

router = APIRouter(prefix="/pulse", tags=["pulse"])


@router.get("/complaints")
async def get_complaints(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    category: Optional[str] = None,
    planning_area: Optional[str] = None,
    urgency: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session)
):
    """Get paginated list of complaints with optional filters."""

    # Build query with filters
    query = select(Complaint).order_by(desc(Complaint.created_at))

    if category:
        query = query.where(Complaint.category == category)
    if planning_area:
        query = query.where(Complaint.planning_area == planning_area)
    if urgency:
        query = query.where(Complaint.urgency == urgency)

    # Apply pagination
    query = query.offset(offset).limit(limit)

    result = await session.execute(query)
    complaints = result.scalars().all()

    # Convert to dict format for JSON response
    complaint_list = []
    for complaint in complaints:
        complaint_dict = {
            "id": str(complaint.id),
            "title": complaint.title,
            "category": complaint.category,
            "subcategory": complaint.subcategory,
            "urgency": complaint.urgency,
            "status": complaint.status,
            "location_description": complaint.location_description,
            "planning_area": complaint.planning_area,
            "postal_code": complaint.postal_code,
            "latitude": complaint.latitude,
            "longitude": complaint.longitude,
            "sentiment_score": complaint.sentiment_score,
            "tags": complaint.tags,
            "keywords": complaint.keywords,
            "upvote_count": complaint.upvote_count,
            "comment_count": complaint.comment_count,
            "view_count": complaint.view_count,
            "created_at": complaint.created_at.isoformat(),
            "resolved_at": complaint.resolved_at.isoformat() if complaint.resolved_at else None
        }
        complaint_list.append(complaint_dict)

    return {"complaints": complaint_list}


@router.get("/complaints/{complaint_id}")
async def get_complaint_detail(
    complaint_id: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Get detailed information about a specific complaint."""

    # Get complaint
    result = await session.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = result.scalar_one_or_none()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Increment view count
    complaint.view_count += 1
    await session.commit()

    # Get comments with user info
    comments_result = await session.execute(
        select(ComplaintComment)
        .where(ComplaintComment.complaint_id == complaint_id)
        .order_by(ComplaintComment.created_at)
    )
    comments = comments_result.scalars().all()

    complaint_detail = {
        "id": str(complaint.id),
        "original_text": complaint.original_text,
        "conversation_history": complaint.conversation_history,
        "title": complaint.title,
        "category": complaint.category,
        "subcategory": complaint.subcategory,
        "urgency": complaint.urgency,
        "status": complaint.status,
        "location_description": complaint.location_description,
        "planning_area": complaint.planning_area,
        "postal_code": complaint.postal_code,
        "latitude": complaint.latitude,
        "longitude": complaint.longitude,
        "frequency": complaint.frequency,
        "time_of_occurrence": complaint.time_of_occurrence,
        "affected_count": complaint.affected_count,
        "sentiment_score": complaint.sentiment_score,
        "tags": complaint.tags,
        "keywords": complaint.keywords,
        "upvote_count": complaint.upvote_count,
        "comment_count": complaint.comment_count,
        "view_count": complaint.view_count,
        "created_at": complaint.created_at.isoformat(),
        "updated_at": complaint.updated_at.isoformat(),
        "resolved_at": complaint.resolved_at.isoformat() if complaint.resolved_at else None,
        "comments": [
            {
                "id": str(comment.id),
                "content": comment.content,
                "upvote_count": comment.upvote_count,
                "is_from_authority": comment.is_from_authority,
                "created_at": comment.created_at.isoformat(),
                "parent_comment_id": str(comment.parent_comment_id) if comment.parent_comment_id else None
            }
            for comment in comments
        ]
    }

    return complaint_detail


@router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365),
    session: AsyncSession = Depends(get_async_session)
):
    """Get overview analytics for the specified time period."""

    start_date = datetime.utcnow() - timedelta(days=days)

    # Total complaints in period
    total_result = await session.execute(
        select(func.count(Complaint.id))
        .where(Complaint.created_at >= start_date)
    )
    total_complaints = total_result.scalar()

    # Category breakdown
    category_result = await session.execute(
        select(Complaint.category, func.count(Complaint.id))
        .where(Complaint.created_at >= start_date)
        .group_by(Complaint.category)
        .order_by(desc(func.count(Complaint.id)))
    )
    category_breakdown = {row[0]: row[1] for row in category_result}

    # Location breakdown (top 10 planning areas)
    location_result = await session.execute(
        select(Complaint.planning_area, func.count(Complaint.id))
        .where(and_(
            Complaint.created_at >= start_date,
            Complaint.planning_area.isnot(None)
        ))
        .group_by(Complaint.planning_area)
        .order_by(desc(func.count(Complaint.id)))
        .limit(10)
    )
    location_breakdown = {row[0]: row[1] for row in location_result}

    # Average sentiment
    sentiment_result = await session.execute(
        select(func.avg(Complaint.sentiment_score))
        .where(and_(
            Complaint.created_at >= start_date,
            Complaint.sentiment_score.isnot(None)
        ))
    )
    avg_sentiment = sentiment_result.scalar() or 0.0

    # Daily trend data
    daily_result = await session.execute(
        text("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM complaints
        WHERE created_at >= :start_date
        GROUP BY DATE(created_at)
        ORDER BY date
        """),
        {"start_date": start_date}
    )
    daily_trend = [{"date": row[0].isoformat(), "count": row[1]} for row in daily_result]

    return {
        "total_complaints": total_complaints,
        "category_breakdown": category_breakdown,
        "location_breakdown": location_breakdown,
        "average_sentiment": round(avg_sentiment, 2),
        "daily_trend": daily_trend,
        "period_days": days
    }


@router.get("/analytics/map-data")
async def get_map_data(
    session: AsyncSession = Depends(get_async_session)
):
    """Get complaint data for map visualization."""

    # Get complaints with location data
    result = await session.execute(
        select(
            Complaint.id,
            Complaint.title,
            Complaint.category,
            Complaint.urgency,
            Complaint.planning_area,
            Complaint.latitude,
            Complaint.longitude,
            Complaint.upvote_count,
            Complaint.created_at
        )
        .where(and_(
            Complaint.planning_area.isnot(None),
            # Could add lat/lng conditions if we have coordinate data
        ))
        .order_by(desc(Complaint.created_at))
        .limit(1000)  # Limit for performance
    )

    complaints = result.all()

    # Group by planning area for map clustering
    area_data = {}
    for complaint in complaints:
        area = complaint.planning_area
        if area not in area_data:
            area_data[area] = {
                "planning_area": area,
                "total_complaints": 0,
                "categories": {},
                "urgency_levels": {"low": 0, "medium": 0, "high": 0},
                "complaints": []
            }

        area_info = area_data[area]
        area_info["total_complaints"] += 1

        # Category breakdown
        if complaint.category not in area_info["categories"]:
            area_info["categories"][complaint.category] = 0
        area_info["categories"][complaint.category] += 1

        # Urgency breakdown
        area_info["urgency_levels"][complaint.urgency] += 1

        # Add individual complaint (limit per area)
        if len(area_info["complaints"]) < 20:
            area_info["complaints"].append({
                "id": str(complaint.id),
                "title": complaint.title,
                "category": complaint.category,
                "urgency": complaint.urgency,
                "upvote_count": complaint.upvote_count,
                "created_at": complaint.created_at.isoformat()
            })

    return {"map_data": list(area_data.values())}


@router.get("/similar-complaints/{complaint_id}")
async def get_similar_complaints(
    complaint_id: str,
    limit: int = Query(5, le=20),
    session: AsyncSession = Depends(get_async_session)
):
    """Find similar complaints using vector similarity or category/keyword matching."""
    from app.db import HAS_VECTOR

    # Get the target complaint
    result = await session.execute(
        select(Complaint)
        .where(Complaint.id == complaint_id)
    )
    target_complaint = result.scalar_one_or_none()

    if not target_complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if HAS_VECTOR and target_complaint.embedding:
        # Use vector similarity if available
        try:
            similar_result = await session.execute(
                text("""
                SELECT id, title, category, urgency, created_at,
                       1 - (embedding <=> :target_embedding) as similarity
                FROM complaints
                WHERE id != :complaint_id AND embedding IS NOT NULL
                ORDER BY embedding <=> :target_embedding
                LIMIT :limit
                """),
                {
                    "target_embedding": target_complaint.embedding,
                    "complaint_id": complaint_id,
                    "limit": limit
                }
            )

            similar_complaints = [
                {
                    "id": str(row[0]),
                    "title": row[1],
                    "category": row[2],
                    "urgency": row[3],
                    "created_at": row[4].isoformat(),
                    "similarity": round(float(row[5]), 3)
                }
                for row in similar_result
            ]

            return {"similar_complaints": similar_complaints}
        except Exception as e:
            print(f"Vector search failed, falling back to keyword matching: {e}")

    # Fallback to category and keyword-based similarity
    similar_result = await session.execute(
        select(Complaint.id, Complaint.title, Complaint.category, Complaint.urgency, Complaint.created_at)
        .where(and_(
            Complaint.id != complaint_id,
            Complaint.category == target_complaint.category
        ))
        .order_by(desc(Complaint.created_at))
        .limit(limit)
    )

    similar_complaints = [
        {
            "id": str(row[0]),
            "title": row[1],
            "category": row[2],
            "urgency": row[3],
            "created_at": row[4].isoformat(),
            "similarity": 0.8  # Default similarity for category match
        }
        for row in similar_result
    ]

    return {"similar_complaints": similar_complaints}


@router.post("/complaints/{complaint_id}/vote")
async def vote_on_complaint(
    complaint_id: str,
    vote_data: dict,  # {"vote_type": "upvote" or "downvote"}
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Vote on a complaint."""

    # Check if complaint exists
    complaint_result = await session.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = complaint_result.scalar_one_or_none()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    vote_type = vote_data.get("vote_type")
    if vote_type not in ["upvote", "downvote"]:
        raise HTTPException(status_code=400, detail="Invalid vote type")

    # Check for existing vote
    existing_vote_result = await session.execute(
        select(ComplaintVote)
        .where(and_(
            ComplaintVote.user_id == user.id,
            ComplaintVote.complaint_id == complaint_id
        ))
    )
    existing_vote = existing_vote_result.scalar_one_or_none()

    if existing_vote:
        # Update existing vote
        if existing_vote.vote_type != vote_type:
            # Change vote type
            if existing_vote.vote_type == "upvote":
                complaint.upvote_count -= 1
            if vote_type == "upvote":
                complaint.upvote_count += 1

            existing_vote.vote_type = vote_type
        else:
            # Same vote type - remove vote
            if vote_type == "upvote":
                complaint.upvote_count -= 1
            await session.delete(existing_vote)
    else:
        # Create new vote
        new_vote = ComplaintVote(
            user_id=user.id,
            complaint_id=complaint_id,
            vote_type=vote_type
        )
        session.add(new_vote)

        if vote_type == "upvote":
            complaint.upvote_count += 1

    await session.commit()

    return {"message": "Vote recorded", "upvote_count": complaint.upvote_count}


@router.post("/complaints/{complaint_id}/comments")
async def add_comment(
    complaint_id: str,
    comment_data: dict,  # {"content": "comment text", "parent_comment_id": "optional"}
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Add a comment to a complaint."""

    # Check if complaint exists
    complaint_result = await session.execute(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    complaint = complaint_result.scalar_one_or_none()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    content = comment_data.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment content is required")

    # Create comment
    new_comment = ComplaintComment(
        complaint_id=complaint_id,
        user_id=user.id,
        content=content,
        parent_comment_id=comment_data.get("parent_comment_id")
    )

    session.add(new_comment)

    # Update comment count
    complaint.comment_count += 1

    await session.commit()

    return {
        "message": "Comment added successfully",
        "comment": {
            "id": str(new_comment.id),
            "content": new_comment.content,
            "created_at": new_comment.created_at.isoformat()
        }
    }