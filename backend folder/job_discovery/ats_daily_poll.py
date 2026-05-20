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

from models import DiscoveredStartup, JobPosting
from job_discovery.ats_api_scraper import (
    fetch_greenhouse_jobs,
    fetch_lever_jobs,
    fetch_ashby_jobs,
    fetch_workable_jobs,
    _is_engineering_role,
    _infer_seniority,
)

logger = logging.getLogger(__name__)

PROVIDER_FETCHERS = {
    "greenhouse": fetch_greenhouse_jobs,
    "lever": fetch_lever_jobs,
    "ashby": fetch_ashby_jobs,
    "workable": fetch_workable_jobs,
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
    This is FAST — no slug guessing, no website visits, no LLM calls.
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
            domain = startup.domain

            fetch_fn = PROVIDER_FETCHERS.get(provider)
            if not fetch_fn:
                continue

            stats["companies_polled"] += 1
            jobs = await fetch_fn(slug)

            if not jobs:
                # API returned empty — might mean all jobs filled, or slug changed
                # Don't deactivate immediately — could be temporary
                continue

            stats["jobs_found"] += len(jobs)

            seen_titles = set()

            for job in jobs:
                title = (job.get("title") or "").strip()
                if not title:
                    continue
                seen_titles.add(title.lower())

                existing = db.query(JobPosting).filter(
                    JobPosting.company_domain == domain,
                    JobPosting.title == title,
                ).first()

                if existing:
                    existing.last_seen_at = datetime.now(timezone.utc)
                    existing.is_active = True
                    if job.get("apply_url"):
                        existing.apply_url = job["apply_url"]
                    continue

                location = job.get("location")
                new_job = JobPosting(
                    startup_id=startup.id,
                    company_name=startup.company_name,
                    company_domain=domain,
                    company_logo_url=startup.logo_url,
                    funding_stage=startup.funding_stage,
                    investors_summary=", ".join(startup.investors or [])[:500],
                    title=title,
                    department=job.get("department"),
                    location=location,
                    remote_policy=_infer_remote_policy(location),
                    seniority_level=job.get("seniority"),
                    ats_provider=provider,
                    apply_url=job.get("apply_url") or None,
                    source="ats_api",
                    is_engineering=True,
                    is_active=True,
                    is_visible_on_homepage=True,
                    quality_score=75,
                    first_seen_at=datetime.now(timezone.utc),
                    last_seen_at=datetime.now(timezone.utc),
                )
                db.add(new_job)
                stats["jobs_new"] += 1

            # Deactivate jobs from this company that weren't seen in this poll
            existing_active_jobs = db.query(JobPosting).filter(
                JobPosting.company_domain == domain,
                JobPosting.is_active == True,
                JobPosting.source == "ats_api",
            ).all()

            for old_job in existing_active_jobs:
                if old_job.title.lower() not in seen_titles:
                    old_job.is_active = False
                    old_job.is_visible_on_homepage = False
                    stats["jobs_deactivated"] += 1

            startup.last_crawled_at = datetime.now(timezone.utc)
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
    Slower than daily poll (tries 4 APIs × N slugs per company) but only runs once per company.
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

                for job in jobs:
                    title = (job.get("title") or "").strip()
                    if not title:
                        continue
                    existing = db.query(JobPosting).filter(
                        JobPosting.company_domain == startup.domain,
                        JobPosting.title == title,
                    ).first()
                    if existing:
                        existing.last_seen_at = datetime.now(timezone.utc)
                        continue

                    location = job.get("location")
                    new_job = JobPosting(
                        startup_id=startup.id,
                        company_name=startup.company_name,
                        company_domain=startup.domain,
                        company_logo_url=startup.logo_url,
                        funding_stage=startup.funding_stage,
                        investors_summary=", ".join(startup.investors or [])[:500],
                        title=title,
                        department=job.get("department"),
                        location=location,
                        remote_policy=_infer_remote_policy(location),
                        seniority_level=job.get("seniority"),
                        ats_provider=provider,
                        apply_url=job.get("apply_url") or None,
                        source="ats_api",
                        is_engineering=True,
                        is_active=True,
                        is_visible_on_homepage=True,
                        quality_score=75,
                        first_seen_at=datetime.now(timezone.utc),
                        last_seen_at=datetime.now(timezone.utc),
                    )
                    db.add(new_job)

                startup.last_crawled_at = datetime.now(timezone.utc)
                db.commit()
            else:
                stats["ats_not_found"] += 1

        except Exception as exc:
            logger.error("Error discovering ATS for %s: %s", startup.company_name, exc)
            db.rollback()

    return stats
