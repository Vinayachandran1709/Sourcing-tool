"""
Getro Board Scraper
Scrapes VC portfolio job boards hosted on Getro (getro.com).
Getro boards are server-rendered HTML so httpx works directly.
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
    load_config,
    normalize_domain,
    parse_json_from_llm,
)
from models import DiscoveredStartup, JobPosting

logger = logging.getLogger(__name__)


def _infer_remote_policy(location: Optional[str]) -> Optional[str]:
    text = (location or "").lower()
    if not text:
        return None
    if "remote" in text:
        return "remote"
    if "hybrid" in text:
        return "hybrid"
    return "onsite"


async def scrape_getro_board(board_url: str, vc_name: str) -> List[Dict]:
    """Fetch a Getro board and extract engineering job listings via LLM."""
    html = await fetch_page(board_url, timeout=20.0)
    if not html:
        return []

    page_text = extract_text_from_html(html, max_length=5000)
    links = extract_links_from_html(html, base_url=board_url)
    links_text = "\n".join([f"- {link['text']}: {link['url']}" for link in links[:80]])

    prompt = f"""You are analyzing a VC portfolio job board (Getro) to extract engineering job listings.
VC / Network: {vc_name}
Board URL: {board_url}

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
    "apply_url": "URL to view or apply for the job"
  }}
]

RULES:
- Only include engineering, technical, data, product, design roles
- Exclude sales, marketing, HR, finance, legal, admin, operations
- If you can't find specific listings, return empty array []
- Return up to 100 jobs maximum"""

    response = await call_groq(
        "You extract job listings from portfolio job boards. Return only valid JSON arrays with engineering/technical roles.",
        prompt,
        max_tokens=4000,
    )

    jobs = parse_json_from_llm(response)
    if not jobs or not isinstance(jobs, list):
        return []
    return jobs


async def scrape_all_getro_boards(db: Session, limit: int = None) -> Dict:
    """Scrape all Getro boards found in vc_sources.json and persist jobs."""
    vc_sources = load_config("vc_sources.json")
    getro_vcs = [
        vc for vc in vc_sources
        if "getro.com" in (vc.get("portfolio_url") or "")
    ]
    if limit:
        getro_vcs = getro_vcs[:limit]

    stats = {"boards_scraped": 0, "jobs_found": 0, "jobs_new": 0, "errors": []}

    for vc in getro_vcs:
        board_url = vc.get("portfolio_url", "")
        vc_name = vc.get("name", "Unknown VC")
        try:
            jobs = await scrape_getro_board(board_url, vc_name)
            stats["boards_scraped"] += 1
            stats["jobs_found"] += len(jobs)

            for job in jobs:
                title = (job.get("title") or "").strip()
                company_name = (job.get("company_name") or "").strip()
                apply_url = (job.get("apply_url") or "").strip()
                location = job.get("location")

                if not title or not company_name:
                    continue

                domain = normalize_domain(apply_url) if apply_url else ""

                startup = db.query(DiscoveredStartup).filter(
                    DiscoveredStartup.company_name == company_name
                ).first()
                if not startup:
                    startup = DiscoveredStartup(
                        company_name=company_name,
                        domain=domain or None,
                        investors=[vc_name],
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
                    apply_url=apply_url or None,
                    source="getro",
                    is_engineering=True,
                    is_active=True,
                    is_visible_on_homepage=True,
                    quality_score=55,
                    first_seen_at=datetime.now(timezone.utc),
                    last_seen_at=datetime.now(timezone.utc),
                )
                db.add(new_job)
                stats["jobs_new"] += 1

            db.commit()
        except Exception as exc:
            logger.error("Error scraping Getro board %s: %s", board_url, exc, exc_info=True)
            db.rollback()
            stats["errors"].append(f"{vc_name}: {str(exc)}")

    return stats
