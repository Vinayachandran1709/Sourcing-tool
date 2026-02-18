"""
Smart Profile Refresh Strategy

Categorizes profiles by activity level and refreshes stale ones:
- Active (contributions >= 300/year): 24-hour TTL
- Moderate (100-300): 72-hour TTL
- Dormant (< 100): 7-day TTL

Profiles unlocked by recruiters in the last 30 days get priority refresh.
"""

from sqlalchemy.orm import Session
from sqlalchemy import case, or_, and_, func
from datetime import datetime, timezone, timedelta
from models import Profile, ProfileUnlock, RefreshJobLog
import asyncio
import logging

logger = logging.getLogger(__name__)

CATEGORY_CONFIG = {
    "active": {"min_contributions": 300, "ttl_hours": 24},
    "moderate": {"min_contributions": 100, "ttl_hours": 72},
    "dormant": {"min_contributions": 0, "ttl_hours": 168},  # 7 days
}

MAX_REFRESH_PER_NIGHT = 500
BATCH_SIZE = 25


def categorize_profile(profile) -> str:
    """Determine refresh category based on contributions."""
    contributions = profile.contributions_last_year or 0
    if contributions >= 300:
        return "active"
    elif contributions >= 100:
        return "moderate"
    return "dormant"


def get_profiles_needing_refresh(db: Session, limit: int = 500):
    """
    Get stale profiles ordered by priority:
    1. Profiles unlocked by recruiters in last 30 days
    2. Active profiles past 24hr TTL
    3. Moderate profiles past 72hr TTL
    4. Dormant profiles past 7-day TTL
    """
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Subquery: profile IDs unlocked in last 30 days
    unlocked_ids = (
        db.query(ProfileUnlock.profile_id)
        .filter(ProfileUnlock.unlocked_at >= thirty_days_ago)
        .distinct()
        .subquery()
    )

    # Filter to stale profiles based on their category
    stale_filter = or_(
        and_(
            Profile.refresh_category == "active",
            Profile.cached_at < now - timedelta(hours=24),
        ),
        and_(
            Profile.refresh_category == "moderate",
            Profile.cached_at < now - timedelta(hours=72),
        ),
        and_(
            Profile.refresh_category == "dormant",
            Profile.cached_at < now - timedelta(days=7),
        ),
    )

    profiles = (
        db.query(Profile)
        .filter(stale_filter)
        .order_by(
            # Unlocked profiles first
            case((Profile.id.in_(unlocked_ids), 0), else_=1),
            # Then by category priority
            case(
                (Profile.refresh_category == "active", 0),
                (Profile.refresh_category == "moderate", 1),
                else_=2,
            ),
            # Oldest cached first
            Profile.cached_at.asc(),
        )
        .limit(limit)
        .all()
    )

    return profiles


async def refresh_batch(db: Session, profiles: list) -> dict:
    """Refresh a batch of profiles using GraphQL API."""
    from github_graphql_service import get_user_details_graphql, is_valid_user_data_graphql
    from github_integration_service import GitHubIntegrationService

    refreshed = 0
    failed = 0

    for profile in profiles:
        try:
            details = await get_user_details_graphql(profile.github_username)
            if details and is_valid_user_data_graphql(details):
                GitHubIntegrationService._upsert_profile(db, details)
                # Update category based on new data
                db.refresh(profile)
                profile.refresh_category = categorize_profile(profile)
                profile.last_refreshed_at = datetime.now(timezone.utc)
                db.commit()
                refreshed += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"Failed to refresh {profile.github_username}: {e}")
            failed += 1
            db.rollback()

        # Be gentle with GitHub API
        await asyncio.sleep(0.5)

    return {"refreshed": refreshed, "failed": failed}


async def run_nightly_refresh():
    """
    Nightly refresh job: refresh stale profiles in batches.
    Max 500 profiles per run, batch size 25.
    """
    from database import SessionLocal

    db = SessionLocal()
    try:
        # Log job start
        job_log = RefreshJobLog(status="running")
        db.add(job_log)
        db.commit()
        db.refresh(job_log)

        logger.info("Starting nightly profile refresh...")

        profiles = get_profiles_needing_refresh(db, limit=MAX_REFRESH_PER_NIGHT)
        logger.info(f"Found {len(profiles)} profiles needing refresh")

        total_refreshed = 0
        total_failed = 0

        for i in range(0, len(profiles), BATCH_SIZE):
            batch = profiles[i : i + BATCH_SIZE]
            result = await refresh_batch(db, batch)
            total_refreshed += result["refreshed"]
            total_failed += result["failed"]

            logger.info(
                f"Refresh batch {i // BATCH_SIZE + 1}: "
                f"{result['refreshed']} refreshed, {result['failed']} failed"
            )

        job_log.completed_at = datetime.now(timezone.utc)
        job_log.profiles_refreshed = total_refreshed
        job_log.profiles_failed = total_failed
        job_log.status = "completed"
        db.commit()

        logger.info(
            f"Nightly refresh complete: {total_refreshed} refreshed, {total_failed} failed"
        )

    except Exception as e:
        logger.error(f"Nightly refresh job failed: {e}", exc_info=True)
        try:
            job_log.status = "failed"
            db.commit()
        except Exception:
            pass
    finally:
        db.close()
