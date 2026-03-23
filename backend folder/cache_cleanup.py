"""
Background task to clean stale cached profiles.
Run this daily via cron or scheduler.
"""

import logging
from sqlalchemy import create_engine, text
from database import DATABASE_URL
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
engine = create_engine(DATABASE_URL)

def cleanup_stale_cache(days_threshold=30):
    """
    Delete profiles cached more than X days ago.
    Default: 30 days
    """
    logger.info(f"Cleaning cache older than {days_threshold} days...")

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_threshold)

    with engine.connect() as conn:
        try:
            result = conn.execute(text("""
                DELETE FROM profiles
                WHERE cached_at < :cutoff_date
                RETURNING id;
            """), {"cutoff_date": cutoff_date})

            deleted_count = len(result.fetchall())
            conn.commit()

            logger.info(f"Deleted {deleted_count} stale cached profiles")
            return deleted_count

        except Exception as e:
            logger.error(f"Cache cleanup failed: {e}")
            conn.rollback()
            return 0

if __name__ == "__main__":
    cleanup_stale_cache(30)