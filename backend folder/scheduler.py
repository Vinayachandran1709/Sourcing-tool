"""
Background Scheduler for TalentBox

Runs nightly profile refresh at 2:00 AM UTC using APScheduler.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone, timedelta
import logging

from perpetual_indexer import run_perpetual_index

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _nightly_refresh_wrapper():
    """Wrapper to call the refresh job from the scheduler."""
    from profile_refresh_service import run_nightly_refresh
    await run_nightly_refresh()


def init_scheduler():
    """Initialize APScheduler with the nightly refresh job."""
    scheduler.add_job(
        _nightly_refresh_wrapper,
        CronTrigger(hour=2, minute=0, timezone="UTC"),
        id="nightly_profile_refresh",
        replace_existing=True,
        misfire_grace_time=3600,  # Allow 1 hour grace if missed
    )
    # Perpetual Developer Indexer - DISABLED (paused to reduce compute)
    # To re-enable, uncomment the block below:
    # scheduler.add_job(
    #     run_perpetual_index,
    #     'interval',
    #     hours=1,
    #     id='perpetual_indexer',
    #     name='Perpetual Developer Indexer (US + India)',
    #     next_run_time=datetime.now(timezone.utc) + timedelta(minutes=5),
    #     replace_existing=True,
    #     misfire_grace_time=3600,
    # )

    scheduler.start()
    logger.info("APScheduler started - nightly profile refresh at 2:00 UTC")
    logger.info("Perpetual indexer: DISABLED")


def shutdown_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down")
