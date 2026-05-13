"""
VC Portfolio Scraper
Fetches VC portfolio pages and extracts portfolio company names + URLs using LLM.
Stores discovered companies in the discovered_startups table.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List

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
from models import DiscoveredStartup

logger = logging.getLogger(__name__)


async def scrape_vc_portfolio(vc_entry: dict) -> List[Dict]:
    """
    Scrape a single VC's portfolio page and extract company names + URLs.
    Returns list of dicts: [{"name": "...", "url": "...", "description": "..."}]
    """
    name = vc_entry.get("name", "Unknown VC")
    url = vc_entry.get("portfolio_url") or vc_entry.get("website", "")

    if not url:
        logger.warning("No URL for VC: %s", name)
        return []

    logger.info("Scraping portfolio for: %s (%s)", name, url)
    html = await fetch_page(url)
    if not html:
        return []

    links = extract_links_from_html(html, base_url=url)
    page_text = extract_text_from_html(html, max_length=4000)
    links_summary = "\n".join([f"- {link['text']}: {link['url']}" for link in links[:150]])

    prompt = f"""You are analyzing a venture capital firm's portfolio page.
VC Firm: {name}
Page URL: {url}

Here are links found on the page:
{links_summary[:3000]}

Page text excerpt:
{page_text[:2000]}

Extract portfolio companies from this page. Return ONLY valid JSON array (no markdown):
[
  {{"name": "Company Name", "url": "https://company-website.com", "description": "One-line description if available"}}
]

RULES:
- Only include actual portfolio COMPANIES (startups), not team pages, blog posts, navigation links
- Include the company's own website URL, NOT the VC's page about the company
- If you can't determine the company website, use the VC page link for that company
- Return up to 100 companies maximum
- Return empty array [] if no companies found"""

    response = await call_groq(
        "You extract structured data from web pages. Return only valid JSON arrays.",
        prompt,
        max_tokens=4000,
    )

    companies = parse_json_from_llm(response)
    if not companies or not isinstance(companies, list):
        logger.warning("No companies extracted from %s", name)
        return []

    logger.info("Extracted %s companies from %s", len(companies), name)
    return companies


async def scrape_all_vcs(db: Session, limit: int = None) -> Dict:
    """
    Scrape all VCs from config and store discovered companies.
    Returns: {"vcs_processed": N, "companies_found": N, "companies_new": N}
    """
    vc_sources = load_config("vc_sources.json")
    if limit:
        vc_sources = vc_sources[:limit]

    stats = {"vcs_processed": 0, "companies_found": 0, "companies_new": 0, "errors": []}

    for vc in vc_sources:
        try:
            companies = await scrape_vc_portfolio(vc)
            stats["vcs_processed"] += 1
            stats["companies_found"] += len(companies)

            for company in companies:
                company_name = (company.get("name") or "").strip()
                company_url = (company.get("url") or "").strip()
                company_desc = company.get("description") or ""

                if not company_name:
                    continue

                domain = normalize_domain(company_url)
                if domain:
                    existing = db.query(DiscoveredStartup).filter(DiscoveredStartup.domain == domain).first()
                    if existing:
                        current_investors = list(existing.investors or [])
                        vc_name = vc.get("name", "")
                        if vc_name and vc_name not in current_investors:
                            existing.investors = current_investors + [vc_name]
                            existing.last_crawled_at = datetime.now(timezone.utc)
                            db.commit()
                        continue

                existing_by_name = db.query(DiscoveredStartup).filter(
                    DiscoveredStartup.company_name == company_name
                ).first()
                if existing_by_name:
                    continue

                startup = DiscoveredStartup(
                    company_name=company_name,
                    domain=domain or None,
                    description=company_desc[:500] if company_desc else None,
                    investors=[vc.get("name", "")] if vc.get("name") else [],
                    source="vc_portfolio",
                    is_active=True,
                    careers_url=None,
                    last_crawled_at=datetime.now(timezone.utc),
                )
                db.add(startup)
                stats["companies_new"] += 1

            db.commit()
        except Exception as exc:
            logger.error("Error scraping VC %s: %s", vc.get("name"), exc, exc_info=True)
            db.rollback()
            stats["errors"].append(f"{vc.get('name')}: {str(exc)}")

    return stats
