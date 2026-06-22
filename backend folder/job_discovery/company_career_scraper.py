"""
Company Career Page Scraper
Visits company websites, finds /careers or /jobs pages, extracts tech job listings.
Stores jobs in the job_postings table.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from job_discovery.ats_api_scraper import try_ats_apis
from job_discovery.ats_job_store import upsert_ats_job
from job_discovery.utils import (
    call_groq,
    extract_links_from_html,
    extract_text_from_html,
    fetch_page,
    parse_json_from_llm,
)
from models import DiscoveredStartup, JobPosting

logger = logging.getLogger(__name__)

CAREER_PATHS = [
    "/careers",
    "/jobs",
    "/hiring",
    "/join",
    "/join-us",
    "/work-with-us",
    "/open-positions",
    "/opportunities",
    "/team",
]


def _detect_ats_provider(url: str) -> Optional[str]:
    url_lower = (url or "").lower()
    provider_map = {
        "greenhouse.io": "greenhouse",
        "lever.co": "lever",
        "ashbyhq.com": "ashby",
        "workable.com": "workable",
        "bamboohr.com": "bamboohr",
    }
    for host_fragment, provider in provider_map.items():
        if host_fragment in url_lower:
            return provider
    return None


def _infer_remote_policy(location: Optional[str]) -> Optional[str]:
    text = (location or "").lower()
    if not text:
        return None
    if "remote" in text:
        return "remote"
    if "hybrid" in text:
        return "hybrid"
    return "onsite"


async def find_careers_url(company_domain: str) -> Optional[str]:
    """Try to find the careers page URL for a company."""
    base_url = f"https://{company_domain}"

    for path in CAREER_PATHS:
        url = f"{base_url}{path}"
        try:
            html = await fetch_page(url, timeout=8.0)
            if html and len(html) > 500:
                return url
        except Exception:
            continue

    homepage_html = await fetch_page(base_url, timeout=10.0)
    if homepage_html:
        links = extract_links_from_html(homepage_html, base_url=base_url)
        for link in links:
            link_text = (link["text"] or "").lower()
            link_url = (link["url"] or "").lower()
            if any(kw in link_text for kw in ["career", "job", "hiring", "join", "work with"]):
                return link["url"]
            if any(kw in link_url for kw in ["/career", "/job", "/hiring", "/join"]):
                return link["url"]

        for link in links:
            url_lower = (link["url"] or "").lower()
            if any(ats in url_lower for ats in ["greenhouse.io", "lever.co", "ashbyhq.com", "workable.com", "bamboohr.com"]):
                return link["url"]

    return None


async def extract_jobs_from_career_page(career_url: str, company_name: str) -> List[Dict]:
    """Extract job listings from a career page using LLM."""
    html = await fetch_page(career_url)
    if not html:
        return []

    page_text = extract_text_from_html(html, max_length=5000)
    links = extract_links_from_html(html, base_url=career_url)
    links_text = "\n".join([f"- {link['text']}: {link['url']}" for link in links[:80]])

    prompt = f"""You are analyzing a company's career page to extract job listings.
Company: {company_name}
Career Page URL: {career_url}

Page text:
{page_text[:3000]}

Links found:
{links_text[:2000]}

Extract ONLY engineering/technical job listings. Return ONLY valid JSON array (no markdown):
[
  {{
    "title": "Job Title",
    "department": "Engineering/Product/Data/etc",
    "location": "City, Country or Remote",
    "apply_url": "URL to apply or view the job",
    "seniority": "Junior/Mid/Senior/Lead/Staff or null",
    "is_engineering": true
  }}
]

RULES:
- Only include engineering, technical, data, product, design roles
- Exclude: sales, marketing, HR, finance, legal, admin, operations roles
- Include the specific apply URL for each job if available
- If you can't find specific job listings, return empty array []
- Return up to 50 jobs maximum"""

    response = await call_groq(
        "You extract job listings from career pages. Return only valid JSON arrays. Only include engineering/technical roles.",
        prompt,
        max_tokens=3000,
    )

    jobs = parse_json_from_llm(response)
    if not jobs or not isinstance(jobs, list):
        return []

    return [job for job in jobs if job.get("is_engineering", True)]


async def scrape_careers_for_startups(db: Session, limit: int = None, cooldown_days: int = 7) -> Dict:
    """
    For all discovered startups without career URLs or jobs, find and scrape their career pages.
    Skips companies crawled within the cooldown window (default 7 days).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=cooldown_days)

    query = db.query(DiscoveredStartup).filter(
        DiscoveredStartup.is_active == True,
        DiscoveredStartup.domain != None,
        DiscoveredStartup.domain != "",
    ).filter(
        (DiscoveredStartup.last_crawled_at == None) | (DiscoveredStartup.last_crawled_at < cutoff)
    )

    startups = query.all()
    if limit:
        startups = startups[:limit]

    stats = {"companies_checked": 0, "careers_found": 0, "jobs_found": 0, "jobs_new": 0, "ats_api_jobs": 0, "errors": []}

    for startup in startups:
        try:
            stats["companies_checked"] += 1
            domain = startup.domain
            if not domain:
                continue

            # --- ATS API first ---
            ats_provider, ats_slug, ats_jobs = await try_ats_apis(startup.company_name, domain)
            if ats_jobs:
                stats["jobs_found"] += len(ats_jobs)
                startup.ats_provider = ats_provider
                startup.ats_slug = ats_slug
                seen_at = datetime.now(timezone.utc)
                for job in ats_jobs:
                    job["remote_policy"] = _infer_remote_policy(job.get("location"))
                    _, created = upsert_ats_job(db, startup, ats_provider, job, seen_at=seen_at)
                    if created:
                        stats["jobs_new"] += 1
                    stats["ats_api_jobs"] += 1
                startup.last_crawled_at = seen_at
                db.commit()
                continue

            # --- Fall back to career page scraping ---
            career_url = startup.careers_url
            if not career_url:
                career_url = await find_careers_url(domain)
                if career_url:
                    startup.careers_url = career_url
                    startup.ats_provider = _detect_ats_provider(career_url)
                    startup.last_crawled_at = datetime.now(timezone.utc)
                    db.commit()
                    stats["careers_found"] += 1
                else:
                    continue

            jobs = await extract_jobs_from_career_page(career_url, startup.company_name)
            stats["jobs_found"] += len(jobs)

            for job in jobs:
                title = (job.get("title") or "").strip()
                if not title:
                    continue

                existing_job = db.query(JobPosting).filter(
                    JobPosting.company_domain == domain,
                    JobPosting.title == title,
                ).first()

                if existing_job:
                    existing_job.last_seen_at = datetime.now(timezone.utc)
                    existing_job.apply_url = job.get("apply_url") or existing_job.apply_url
                    continue

                location = job.get("location")
                apply_url = job.get("apply_url", career_url)
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
                    ats_provider=_detect_ats_provider(apply_url or career_url) or startup.ats_provider,
                    ats_url=career_url,
                    apply_url=apply_url,
                    source="vc_portfolio",
                    is_engineering=True,
                    is_active=True,
                    is_visible_on_homepage=True,
                    quality_score=60,
                    first_seen_at=datetime.now(timezone.utc),
                    last_seen_at=datetime.now(timezone.utc),
                )
                db.add(new_job)
                stats["jobs_new"] += 1

            startup.last_crawled_at = datetime.now(timezone.utc)
            db.commit()
        except Exception as exc:
            logger.error("Error scraping careers for %s: %s", startup.company_name, exc, exc_info=True)
            db.rollback()
            stats["errors"].append(f"{startup.company_name}: {str(exc)}")

    return stats
