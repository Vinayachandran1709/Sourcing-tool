"""
Funding News Monitor
Scrapes funding news sites for recent articles about startup funding rounds.
Extracts company info, investors, and adds companies to discovered_startups.
Also auto-discovers new VCs from the investor mentions.
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
    save_config,
)
from models import DiscoveredStartup

logger = logging.getLogger(__name__)


async def extract_funding_articles(news_source: dict) -> List[Dict]:
    """
    Fetch a funding news site and extract recent funding articles.
    Returns list of: [{"title": "...", "url": "...", "snippet": "..."}]
    """
    url = news_source.get("url", "")
    name = news_source.get("name", "")

    if not url:
        return []

    logger.info("Fetching funding news from: %s (%s)", name, url)
    html = await fetch_page(url)
    if not html:
        return []

    links = extract_links_from_html(html, base_url=url)
    page_text = extract_text_from_html(html, max_length=4000)
    links_summary = "\n".join([f"- {link['text']}: {link['url']}" for link in links[:100]])

    prompt = f"""You are analyzing a startup/tech news website to find recent FUNDING articles.
Site: {name}
URL: {url}

Links on the page:
{links_summary[:3000]}

Page text:
{page_text[:1500]}

Extract articles about startup FUNDING ROUNDS ONLY (raises, seed rounds, Series A/B/C, etc).
Return ONLY valid JSON array (no markdown):
[
  {{"title": "Article headline", "url": "Full article URL", "snippet": "Brief text if available"}}
]

RULES:
- Only include articles about funding/raising money (not product launches, opinions, lists)
- Look for keywords: raises, raised, funding, seed, series, round, investment, secures
- Maximum 15 most recent articles
- Return empty array [] if no funding articles found"""

    response = await call_groq(
        "You identify funding news articles from tech news sites. Return only valid JSON.",
        prompt,
        max_tokens=2000,
    )

    articles = parse_json_from_llm(response)
    return articles if isinstance(articles, list) else []


async def extract_funding_details(article_url: str) -> Dict:
    """
    Fetch a funding article and extract structured data.
    Returns: {"company": "...", "amount": "...", "stage": "...", "investors": [...], "website": "..."}
    """
    html = await fetch_page(article_url)
    if not html:
        return {}

    article_text = extract_text_from_html(html, max_length=4000)

    prompt = f"""Extract funding details from this news article. Return ONLY valid JSON (no markdown):

Article text:
{article_text[:3500]}

Return JSON:
{{
  "company_name": "Name of the startup that raised funding",
  "company_website": "URL of the company website if mentioned, or null",
  "amount_raised": "$5M or €2M etc",
  "funding_stage": "pre-seed/seed/series-a/series-b/series-c/growth/other",
  "investors": ["List of investor/VC firm names mentioned"],
  "location": "Company HQ location if mentioned",
  "category": "AI/fintech/healthtech/devtools/etc",
  "description": "1-2 sentence description of what the company does"
}}

If the article is not about funding, return {{"error": "not a funding article"}}."""

    response = await call_groq(
        "You extract structured funding data from news articles. Return only valid JSON.",
        prompt,
        max_tokens=500,
    )

    return parse_json_from_llm(response) or {}


async def process_funding_news(db: Session, limit_sources: int = None) -> Dict:
    """
    Process all funding news sources: find articles, extract data, store companies, auto-discover VCs.
    """
    news_sources = load_config("funding_news_sources.json")
    if limit_sources:
        news_sources = news_sources[:limit_sources]

    stats = {
        "sources_checked": 0,
        "articles_found": 0,
        "articles_processed": 0,
        "companies_new": 0,
        "vcs_discovered": 0,
        "errors": [],
    }

    for source in news_sources:
        try:
            articles = await extract_funding_articles(source)
            stats["sources_checked"] += 1
            stats["articles_found"] += len(articles)

            for article in articles[:10]:
                try:
                    details = await extract_funding_details(article.get("url", ""))
                    if not details or details.get("error"):
                        continue

                    stats["articles_processed"] += 1
                    company_name = (details.get("company_name") or "").strip()
                    company_website = details.get("company_website", "")
                    if not company_name:
                        continue

                    domain = normalize_domain(company_website) if company_website else ""

                    existing = None
                    if domain:
                        existing = db.query(DiscoveredStartup).filter(DiscoveredStartup.domain == domain).first()
                    if not existing:
                        existing = db.query(DiscoveredStartup).filter(
                            DiscoveredStartup.company_name == company_name
                        ).first()

                    if existing:
                        if details.get("funding_stage"):
                            existing.funding_stage = details["funding_stage"]
                        if details.get("amount_raised"):
                            existing.funding_amount = details["amount_raised"]
                        investors = [inv for inv in details.get("investors", []) if inv]
                        merged = sorted(set((existing.investors or []) + investors))
                        existing.investors = merged
                        existing.last_crawled_at = datetime.now(timezone.utc)
                        db.commit()
                    else:
                        startup = DiscoveredStartup(
                            company_name=company_name,
                            domain=domain or None,
                            description=(details.get("description") or "")[:500] or None,
                            funding_stage=details.get("funding_stage"),
                            funding_amount=details.get("amount_raised"),
                            investors=details.get("investors", []),
                            category=details.get("category"),
                            location=details.get("location"),
                            source="funding_news",
                            is_active=True,
                            last_crawled_at=datetime.now(timezone.utc),
                        )
                        db.add(startup)
                        db.commit()
                        stats["companies_new"] += 1

                    investors = details.get("investors", [])
                    if investors:
                        new_vcs = auto_discover_vcs(investors)
                        stats["vcs_discovered"] += new_vcs
                except Exception as exc:
                    logger.error("Error processing article %s: %s", article.get("url"), exc, exc_info=True)
                    db.rollback()
                    stats["errors"].append(str(exc))
        except Exception as exc:
            logger.error("Error processing news source %s: %s", source.get("name"), exc, exc_info=True)
            stats["errors"].append(f"{source.get('name')}: {str(exc)}")

    return stats


def auto_discover_vcs(investor_names: List[str]) -> int:
    """
    Check if mentioned investors are in vc_sources.json. If not, add them.
    Returns count of newly added VCs.
    """
    vc_sources = load_config("vc_sources.json")
    existing_names = {vc["name"].lower() for vc in vc_sources if vc.get("name")}

    added = 0
    for investor in investor_names:
        investor = investor.strip()
        investor_lower = investor.lower()
        if not investor or len(investor) < 4:
            continue
        if investor_lower in existing_names:
            continue

        likely_vc_keywords = ["venture", "capital", "partners", "vc", "seed"]
        skip_keywords = [
            "angel", "founder", "individual", "undisclosed", "family", "bank",
            "government", "university", "endowment", "pension", "sovereign",
            "microsoft", "google", "amazon", "apple", "meta", "nvidia",
            "samsung", "intel", "cisco", "oracle", "ibm", "salesforce",
            "telus", "rbc", "bdc", "edc", "bci",
            "corp.", "corporation", "inc.", "ltd", "limited",
            "asset management", "wealth management", "insurance",
            "hospital", "foundation", "trust", "fund of funds"
        ]

        is_likely_vc = any(keyword in investor_lower for keyword in likely_vc_keywords)
        if not is_likely_vc and any(keyword in investor_lower for keyword in skip_keywords):
            continue

        vc_sources.append(
            {
                "name": investor,
                "portfolio_url": "",
                "website": "",
                "region": "Unknown",
                "source": "auto_discovered",
                "needs_url": True,
            }
        )
        existing_names.add(investor_lower)
        added += 1

    if added > 0:
        save_config("vc_sources.json", vc_sources)
        logger.info("Auto-discovered %s new VCs from funding news", added)

    return added
