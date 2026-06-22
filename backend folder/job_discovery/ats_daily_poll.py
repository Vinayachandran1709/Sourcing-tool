"""
ATS Daily Poll
Fast-path job refresh for companies with known ATS provider and slug.
Skips slug guessing, website visits, and LLM extraction entirely.
Designed to run daily across thousands of companies in minutes.
"""

import logging
from datetime import datetime, timezone
from typing import Dict

from sqlalchemy.orm import Session

from models import DiscoveredStartup
from job_discovery.ats_api_scraper import (
    fetch_greenhouse_jobs_result,
    fetch_lever_jobs_result,
    fetch_ashby_jobs_result,
    fetch_workable_jobs_result,
)
from job_discovery.ats_job_store import (
    build_seen_identifiers,
    deactivate_missing_ats_jobs,
    upsert_ats_job,
)

logger = logging.getLogger(__name__)

PROVIDER_FETCHERS = {
    "greenhouse": fetch_greenhouse_jobs_result,
    "lever": fetch_lever_jobs_result,
    "ashby": fetch_ashby_jobs_result,
    "workable": fetch_workable_jobs_result,
}


def _infer_remote_policy(location: str | None) -> str | None:
    text = (location or "").lower()
    if not text:
        return None
    if "remote" in text:
        return "remote"
    if "hybrid" in text:
        return "hybrid"
    return "onsite"


async def poll_known_ats_companies(db: Session, limit: int = None) -> Dict:
    """
    Poll ATS APIs for all companies with known ats_provider + ats_slug.
    This is FAST - no slug guessing, no website visits, no LLM calls.
    Designed to run daily.
    """
    query = db.query(DiscoveredStartup).filter(
        DiscoveredStartup.is_active == True,
        DiscoveredStartup.ats_provider != None,
        DiscoveredStartup.ats_provider != "",
        DiscoveredStartup.ats_slug != None,
        DiscoveredStartup.ats_slug != "",
    )

    companies = query.all()
    if limit:
        companies = companies[:limit]

    stats = {
        "companies_polled": 0,
        "jobs_found": 0,
        "jobs_new": 0,
        "jobs_deactivated": 0,
        "errors": [],
    }

    for startup in companies:
        try:
            provider = startup.ats_provider.lower()
            slug = startup.ats_slug

            fetch_fn = PROVIDER_FETCHERS.get(provider)
            if not fetch_fn:
                continue

            stats["companies_polled"] += 1
            result = await fetch_fn(slug)

            if not result.success:
                logger.warning(
                    "Skipping ATS deactivation for %s because %s/%s did not complete successfully",
                    startup.company_name,
                    provider,
                    slug,
                )
                stats["errors"].append(f"{startup.company_name}: fetch failed for provider={provider} slug={slug}")
                continue

            jobs = result.jobs
            stats["jobs_found"] += len(jobs)
            seen_at = datetime.now(timezone.utc)

            for job in jobs:
                job["remote_policy"] = _infer_remote_policy(job.get("location"))
                job["ats_url"] = job.get("ats_url") or result.ats_url
                _, created = upsert_ats_job(db, startup, provider, job, seen_at=seen_at)
                if created:
                    stats["jobs_new"] += 1

            seen_external_ids, seen_fallback_keys = build_seen_identifiers(startup.domain, jobs)
            stats["jobs_deactivated"] += deactivate_missing_ats_jobs(
                db,
                startup=startup,
                provider=provider,
                seen_external_ids=seen_external_ids,
                seen_fallback_keys=seen_fallback_keys,
            )

            startup.last_crawled_at = seen_at
            db.commit()

        except Exception as exc:
            logger.error("Error polling ATS for %s: %s", startup.company_name, exc)
            db.rollback()
            stats["errors"].append(f"{startup.company_name}: {str(exc)}")

    return stats


async def batch_discover_ats_slugs(db: Session, limit: int = None) -> Dict:
    """
    Run ATS slug discovery on all companies that DON'T yet have a known ATS provider.
    This is the one-time batch job to populate ats_provider + ats_slug.
    Slower than daily poll (tries 4 APIs x N slugs per company) but only runs once per company.
    """
    from job_discovery.ats_api_scraper import try_ats_apis

    query = db.query(DiscoveredStartup).filter(
        DiscoveredStartup.is_active == True,
        DiscoveredStartup.domain != None,
        DiscoveredStartup.domain != "",
        (DiscoveredStartup.ats_provider == None) | (DiscoveredStartup.ats_provider == ""),
    )

    companies = query.all()
    if limit:
        companies = companies[:limit]

    stats = {
        "companies_checked": 0,
        "ats_found": 0,
        "ats_not_found": 0,
        "providers": {"greenhouse": 0, "lever": 0, "ashby": 0, "workable": 0},
    }

    for startup in companies:
        stats["companies_checked"] += 1

        try:
            provider, slug, jobs = await try_ats_apis(startup.company_name, startup.domain)

            if provider and slug:
                startup.ats_provider = provider
                startup.ats_slug = slug
                stats["ats_found"] += 1
                stats["providers"][provider] = stats["providers"].get(provider, 0) + 1
                seen_at = datetime.now(timezone.utc)

                for job in jobs:
                    job["remote_policy"] = _infer_remote_policy(job.get("location"))
                    upsert_ats_job(db, startup, provider, job, seen_at=seen_at)

                startup.last_crawled_at = seen_at
                db.commit()
            else:
                stats["ats_not_found"] += 1

        except Exception as exc:
            logger.error("Error discovering ATS for %s: %s", startup.company_name, exc)
            db.rollback()

    return stats
