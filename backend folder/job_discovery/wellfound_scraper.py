"""
Wellfound (formerly AngelList Talent) Job Scraper
Fetches startup engineering jobs from Wellfound's server-rendered listing pages.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from job_discovery.utils import (
    call_groq,
    extract_links_from_html,
    extract_text_from_html,
    fetch_page,
    normalize_domain,
    parse_json_from_llm,
)
from models import DiscoveredStartup, JobPosting

logger = logging.getLogger(__name__)

WELLFOUND_URLS = [
    "https://wellfound.com/jobs",
    "https://wellfound.com/role/software-engineer",
    "https://wellfound.com/role/backend-engineer",
    "https://wellfound.com/role/frontend-engineer",
    "https://wellfound.com/role/data-scientist",
]


def _infer_remote_policy(location: Optional[str]) -> Optional[str]:
    text = (location or "").lower()
    if not text:
        return None
    if "remote" in text:
        return "remote"
    if "hybrid" in text:
        return "hybrid"
    return "onsite"


async def _extract_jobs_from_wellfound_page(page_url: str) -> List[Dict]:
    html = await fetch_page(page_url, timeout=20.0)
    if not html:
        return []

    page_text = extract_text_from_html(html, max_length=5000)
    links = extract_links_from_html(html, base_url=page_url)
    links_text = "\n".join([f"- {link['text']}: {link['url']}" for link in links[:80]])

    prompt = f"""You are analyzing Wellfound (AngelList Talent) to extract startup engineering job listings.
Page URL: {page_url}

Page text:
{page_text[:3000]}

Links found:
{links_text[:2000]}

Extract ONLY engineering/technical job listings. Return ONLY valid JSON array (no markdown):
[
  {{
    "title": "Job Title",
    "company_name": "Company Name",
    "department": "Engineering/Product/Data/etc",
    "location": "City, Country or Remote",
    "apply_url": "URL to view or apply for the job",
    "seniority": "Junior/Mid/Senior/Lead/Staff or null"
  }}
]

RULES:
- Only include engineering, technical, data, product, design roles
- Exclude sales, marketing, HR, finance, legal, admin, operations
- If you can't find specific listings, return empty array []
- Return up to 50 jobs per page"""

    response = await call_groq(
        "You extract job listings from Wellfound startup job pages. Return only valid JSON arrays with engineering/technical roles.",
        prompt,
        max_tokens=3000,
    )

    jobs = parse_json_from_llm(response)
    if not jobs or not isinstance(jobs, list):
        return []
    return jobs


async def scrape_wellfound_jobs(db: Session, limit: int = 50) -> Dict:
    """Scrape engineering jobs from Wellfound listing pages and persist them."""
    stats = {"pages_scraped": 0, "jobs_found": 0, "jobs_new": 0, "errors": []}
    seen_jobs: set = set()

    for page_url in WELLFOUND_URLS:
        try:
            jobs = await _extract_jobs_from_wellfound_page(page_url)
            stats["pages_scraped"] += 1
            stats["jobs_found"] += len(jobs)

            for job in jobs:
                title = (job.get("title") or "").strip()
                company_name = (job.get("company_name") or "").strip()
                apply_url = (job.get("apply_url") or "").strip()
                location = job.get("location")

                if not title or not company_name:
                    continue

                dedup_key = f"{company_name}::{title}"
                if dedup_key in seen_jobs:
                    continue
                seen_jobs.add(dedup_key)

                if len(seen_jobs) > limit:
                    break

                domain = normalize_domain(apply_url) if apply_url else ""

                startup = db.query(DiscoveredStartup).filter(
                    DiscoveredStartup.company_name == company_name
                ).first()
                if not startup:
                    startup = DiscoveredStartup(
                        company_name=company_name,
                        domain=domain or None,
                        is_active=True,
                        first_seen_at=datetime.now(timezone.utc),
                        last_seen_at=datetime.now(timezone.utc),
                    )
                    db.add(startup)
                    db.flush()

                existing = db.query(JobPosting).filter(
                    JobPosting.company_name == company_name,
                    JobPosting.title == title,
                ).first()
                if existing:
                    existing.last_seen_at = datetime.now(timezone.utc)
                    continue

                new_job = JobPosting(
                    startup_id=startup.id,
                    company_name=company_name,
                    company_domain=domain or None,
                    title=title,
                    department=job.get("department"),
                    location=location,
                    remote_policy=_infer_remote_policy(location),
                    seniority_level=job.get("seniority"),
                    apply_url=apply_url or None,
                    source="wellfound",
                    is_engineering=True,
                    is_active=True,
                    is_visible_on_homepage=True,
                    quality_score=60,
                    first_seen_at=datetime.now(timezone.utc),
                    last_seen_at=datetime.now(timezone.utc),
                )
                db.add(new_job)
                stats["jobs_new"] += 1

            db.commit()
        except Exception as exc:
            logger.error("Error scraping Wellfound page %s: %s", page_url, exc, exc_info=True)
            db.rollback()
            stats["errors"].append(f"{page_url}: {str(exc)}")

    return stats
