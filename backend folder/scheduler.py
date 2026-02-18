"""
Background Scheduler for TalentBox

Runs nightly profile refresh at 2:00 AM UTC using APScheduler.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

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
    scheduler.start()
    logger.info("APScheduler started - nightly profile refresh at 2:00 UTC")


def shutdown_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down")
