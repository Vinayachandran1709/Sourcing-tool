"""
API Abuse Protection & Throttling Service

- Search cooldown: 10-second minimum gap between searches per user
- Concurrent search lock: PostgreSQL-based 90-second lock per user
- Admin usage stats: top users by API consumption
"""

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import func, desc, text
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from models import SearchLock, UsageLog, User
import logging

logger = logging.getLogger(__name__)

SEARCH_COOLDOWN_SECONDS = 10
SEARCH_LOCK_TIMEOUT_SECONDS = 90


def check_search_cooldown(db: Session, user_id: int) -> None:
    """
    Raise 429 if user searched within the last 10 seconds.
    Uses the UsageLog table to find the most recent search.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=SEARCH_COOLDOWN_SECONDS)

    last_search = (
        db.query(UsageLog.timestamp)
        .filter(
            UsageLog.user_id == user_id,
            UsageLog.action_type == "search",
            UsageLog.timestamp >= cutoff,
        )
        .order_by(UsageLog.timestamp.desc())
        .first()
    )

    if last_search:
        elapsed = (datetime.now(timezone.utc) - last_search[0]).total_seconds()
        wait = max(1, int(SEARCH_COOLDOWN_SECONDS - elapsed))
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {wait} seconds between searches",
            headers={"Retry-After": str(wait)},
        )


def acquire_search_lock(db: Session, user_id: int) -> bool:
    """
    Try to acquire a search lock for this user.
    Uses PostgreSQL INSERT ON CONFLICT for atomicity.
    Returns True if lock acquired, False if already locked.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=SEARCH_LOCK_TIMEOUT_SECONDS)

    # Try to insert a new lock, or update if expired
    stmt = pg_insert(SearchLock).values(
        user_id=user_id,
        locked_at=now,
        expires_at=expires_at,
        search_completed=False,
    )

    stmt = stmt.on_conflict_do_update(
        constraint="unique_user_lock",
        set_={
            "locked_at": now,
            "expires_at": expires_at,
            "search_completed": False,
        },
        # Only overwrite if the existing lock has expired or was completed
        where=(SearchLock.expires_at < now) | (SearchLock.search_completed == True),
    )

    result = db.execute(stmt)
    db.commit()

    # If no rows were affected, lock is held by another search
    if result.rowcount == 0:
        return False
    return True


def release_search_lock(db: Session, user_id: int) -> None:
    """Release the search lock by marking it as completed."""
    db.query(SearchLock).filter(SearchLock.user_id == user_id).update(
        {"search_completed": True}
    )
    db.commit()


def get_admin_usage_stats(db: Session, days: int = 7) -> dict:
    """
    Return top users by API consumption over the last N days.
    Shows top 20 users by search count, email count, and profile views.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Top users by action type
    top_users_query = (
        db.query(
            UsageLog.user_id,
            User.email,
            User.name,
            UsageLog.action_type,
            func.count(UsageLog.id).label("count"),
        )
        .join(User, User.id == UsageLog.user_id)
        .filter(UsageLog.timestamp >= cutoff)
        .group_by(UsageLog.user_id, User.email, User.name, UsageLog.action_type)
        .order_by(desc("count"))
        .limit(50)
        .all()
    )

    # Organize by action type
    stats = {"searches": [], "profile_views": [], "emails_sent": [], "other": []}
    for row in top_users_query:
        entry = {
            "user_id": row.user_id,
            "email": row.email,
            "name": row.name,
            "count": row.count,
        }
        bucket = stats.get(row.action_type + "es" if row.action_type == "search" else row.action_type, "other")
        if isinstance(bucket, list):
            bucket.append(entry)
        else:
            stats.setdefault(row.action_type, []).append(entry)

    # Total requests in period
    total_requests = (
        db.query(func.count(UsageLog.id))
        .filter(UsageLog.timestamp >= cutoff)
        .scalar()
    )

    return {
        "period_days": days,
        "total_requests": total_requests,
        "top_users_by_action": stats,
    }
