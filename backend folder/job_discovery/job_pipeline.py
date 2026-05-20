"""
Job Pipeline Orchestrator
Runs the full job discovery pipeline: VC scraping -> company discovery -> career scraping -> funding news.
Can be triggered via API endpoint or command line.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from job_discovery.ats_daily_poll import batch_discover_ats_slugs, poll_known_ats_companies
from job_discovery.company_career_scraper import scrape_careers_for_startups
from job_discovery.funding_news_monitor import process_funding_news
from job_discovery.getro_scraper import scrape_all_getro_boards
from job_discovery.vc_portfolio_scraper import scrape_all_vcs
from job_discovery.wellfound_scraper import scrape_wellfound_jobs

logger = logging.getLogger(__name__)


async def run_full_pipeline(db: Session, options: dict = None) -> dict:
    """
    Run the full job discovery pipeline.

    Options:
        vc_limit: int - max VCs to scrape (None = all)
        company_limit: int - max companies to check careers for (None = all)
        news_limit: int - max news sources to check (None = all)
        ats_discovery_limit: int - max companies for batch ATS discovery (None = all)
        ats_poll_limit: int - max companies for daily ATS poll (None = all)
        cooldown_days: int - skip companies crawled within this many days (default 7)
        skip_vc: bool - skip VC portfolio scraping
        skip_getro: bool - skip Getro board scraping
        skip_ats_discovery: bool - skip batch ATS slug discovery
        skip_ats_poll: bool - skip daily ATS poll
        skip_careers: bool - skip career page scraping with LLM fallback
        skip_news: bool - skip funding news monitoring
        skip_wellfound: bool - skip Wellfound scraping
    """
    options = options or {}
    results = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "vc_scraping": None,
        "getro_scraping": None,
        "ats_discovery": None,
        "ats_daily_poll": None,
        "career_scraping": None,
        "funding_news": None,
        "wellfound_scraping": None,
        "completed_at": None,
    }

    if not options.get("skip_vc"):
        logger.info("=== Step 1: Scraping VC portfolios ===")
        try:
            vc_result = await scrape_all_vcs(db, limit=options.get("vc_limit"))
            results["vc_scraping"] = vc_result
            logger.info("VC scraping done: %s", vc_result)
        except Exception as exc:
            logger.error("VC scraping failed: %s", exc, exc_info=True)
            results["vc_scraping"] = {"error": str(exc)}

    if not options.get("skip_getro"):
        logger.info("=== Step 2: Scraping Getro VC boards ===")
        try:
            getro_result = await scrape_all_getro_boards(db)
            results["getro_scraping"] = getro_result
            logger.info("Getro scraping done: %s", getro_result)
        except Exception as exc:
            logger.error("Getro scraping failed: %s", exc, exc_info=True)
            results["getro_scraping"] = {"error": str(exc)}

    if not options.get("skip_ats_discovery"):
        logger.info("=== Step 3: Batch ATS slug discovery ===")
        try:
            discovery_result = await batch_discover_ats_slugs(db, limit=options.get("ats_discovery_limit"))
            results["ats_discovery"] = discovery_result
            logger.info("ATS discovery done: %s", discovery_result)
        except Exception as exc:
            logger.error("ATS discovery failed: %s", exc, exc_info=True)
            results["ats_discovery"] = {"error": str(exc)}

    if not options.get("skip_ats_poll"):
        logger.info("=== Step 4: Daily ATS poll ===")
        try:
            poll_result = await poll_known_ats_companies(db, limit=options.get("ats_poll_limit"))
            results["ats_daily_poll"] = poll_result
            logger.info("ATS poll done: %s", poll_result)
        except Exception as exc:
            logger.error("ATS poll failed: %s", exc, exc_info=True)
            results["ats_daily_poll"] = {"error": str(exc)}

    if not options.get("skip_careers"):
        logger.info("=== Step 5: Scraping company career pages (ATS-first with LLM fallback) ===")
        try:
            career_result = await scrape_careers_for_startups(
                db,
                limit=options.get("company_limit"),
                cooldown_days=options.get("cooldown_days", 7),
            )
            results["career_scraping"] = career_result
            logger.info("Career scraping done: %s", career_result)
        except Exception as exc:
            logger.error("Career scraping failed: %s", exc, exc_info=True)
            results["career_scraping"] = {"error": str(exc)}

    if not options.get("skip_news"):
        logger.info("=== Step 6: Processing funding news ===")
        try:
            news_result = await process_funding_news(db, limit_sources=options.get("news_limit"))
            results["funding_news"] = news_result
            logger.info("Funding news done: %s", news_result)
        except Exception as exc:
            logger.error("Funding news failed: %s", exc, exc_info=True)
            results["funding_news"] = {"error": str(exc)}

    if not options.get("skip_wellfound"):
        logger.info("=== Step 7: Scraping Wellfound jobs ===")
        try:
            wellfound_result = await scrape_wellfound_jobs(db)
            results["wellfound_scraping"] = wellfound_result
            logger.info("Wellfound scraping done: %s", wellfound_result)
        except Exception as exc:
            logger.error("Wellfound scraping failed: %s", exc, exc_info=True)
            results["wellfound_scraping"] = {"error": str(exc)}

    results["completed_at"] = datetime.now(timezone.utc).isoformat()
    return results


if __name__ == "__main__":
    import sys

    sys.path.insert(0, "..")
    from database import SessionLocal

    async def _run():
        db = SessionLocal()
        try:
            result = await run_full_pipeline(
                db,
                options={"vc_limit": 3, "company_limit": 10, "news_limit": 2},
            )
            print(json.dumps(result, indent=2, default=str))
        finally:
            db.close()

    asyncio.run(_run())
