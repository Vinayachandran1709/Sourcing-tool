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

from job_discovery.company_career_scraper import scrape_careers_for_startups
from job_discovery.funding_news_monitor import process_funding_news
from job_discovery.vc_portfolio_scraper import scrape_all_vcs

logger = logging.getLogger(__name__)


async def run_full_pipeline(db: Session, options: dict = None) -> dict:
    """
    Run the full job discovery pipeline.

    Options:
        vc_limit: int - max VCs to scrape (None = all)
        company_limit: int - max companies to check careers for (None = all)
        news_limit: int - max news sources to check (None = all)
        skip_vc: bool - skip VC portfolio scraping
        skip_careers: bool - skip career page scraping
        skip_news: bool - skip funding news monitoring
    """
    options = options or {}
    results = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "vc_scraping": None,
        "career_scraping": None,
        "funding_news": None,
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

    if not options.get("skip_careers"):
        logger.info("=== Step 2: Scraping company career pages ===")
        try:
            career_result = await scrape_careers_for_startups(db, limit=options.get("company_limit"))
            results["career_scraping"] = career_result
            logger.info("Career scraping done: %s", career_result)
        except Exception as exc:
            logger.error("Career scraping failed: %s", exc, exc_info=True)
            results["career_scraping"] = {"error": str(exc)}

    if not options.get("skip_news"):
        logger.info("=== Step 3: Processing funding news ===")
        try:
            news_result = await process_funding_news(db, limit_sources=options.get("news_limit"))
            results["funding_news"] = news_result
            logger.info("Funding news done: %s", news_result)
        except Exception as exc:
            logger.error("Funding news failed: %s", exc, exc_info=True)
            results["funding_news"] = {"error": str(exc)}

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
