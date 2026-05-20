"""
ATS API Scraper
Queries public JSON APIs from Greenhouse, Lever, Ashby, and Workable
to retrieve structured job data without LLM extraction.
"""

import logging
import re
from typing import Optional

import httpx

from job_discovery.utils import HEADERS

logger = logging.getLogger(__name__)

_COMMON_PREFIXES = {"get", "try", "use", "go"}

ENGINEERING_TITLE_KEYWORDS = {
    "engineer", "developer", "architect", "devops", "sre", "data scientist",
    "data engineer", "ml", "machine learning", "ai", "frontend", "backend",
    "full-stack", "fullstack", "mobile", "ios", "android", "qa", "quality",
    "test", "security", "infrastructure", "platform", "cloud", "designer",
    "product designer", "ux",
}

ENGINEERING_DEPT_KEYWORDS = {
    "engineering", "product", "data", "design", "technical", "platform",
    "infrastructure",
}

SENIORITY_MAP = [
    (["intern"], "Intern"),
    (["junior", " jr "], "Junior"),
    (["senior", " sr "], "Senior"),
    (["staff"], "Staff"),
    (["principal"], "Principal"),
    (["lead"], "Lead"),
    (["head", "director", "vp"], "Director"),
]


def _generate_slugs(company_name: str, domain: str) -> list[str]:
    slugs: list[str] = []

    name_slug = company_name.lower()
    name_slug = re.sub(r"[^a-z0-9\s-]", "", name_slug)
    name_slug = re.sub(r"[\s]+", "-", name_slug).strip("-")
    if name_slug:
        slugs.append(name_slug)

    if domain:
        domain_clean = re.sub(r"^www\.", "", domain.lower())
        domain_no_tld = re.sub(r"\.[^.]+$", "", domain_clean)
        if domain_no_tld and domain_no_tld not in slugs:
            slugs.append(domain_no_tld)

        for prefix in _COMMON_PREFIXES:
            if domain_no_tld.startswith(prefix) and len(domain_no_tld) > len(prefix):
                stripped = domain_no_tld[len(prefix):]
                if stripped and stripped not in slugs:
                    slugs.append(stripped)

    seen: set[str] = set()
    unique: list[str] = []
    for s in slugs:
        if s and s not in seen:
            seen.add(s)
            unique.append(s)
    return unique


def _is_engineering_role(title: str, department: str = "") -> bool:
    title_lower = title.lower()
    dept_lower = department.lower()
    return any(kw in title_lower for kw in ENGINEERING_TITLE_KEYWORDS) or \
           any(kw in dept_lower for kw in ENGINEERING_DEPT_KEYWORDS)


def _infer_seniority(title: str) -> Optional[str]:
    title_lower = title.lower()
    for keywords, level in SENIORITY_MAP:
        if any(kw in title_lower for kw in keywords):
            return level
    return None


async def fetch_greenhouse_jobs(slug: str) -> list[dict]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                return []
            data = resp.json()
            jobs = []
            for job in data.get("jobs", []):
                title = job.get("title", "")
                dept = ""
                depts = job.get("departments", [])
                if depts:
                    dept = depts[0].get("name", "")
                if not _is_engineering_role(title, dept):
                    continue
                content = job.get("content", "")
                desc_snippet = re.sub(r"<[^>]+>", "", content)[:200].strip()
                jobs.append({
                    "title": title,
                    "location": (job.get("location") or {}).get("name", ""),
                    "department": dept,
                    "apply_url": job.get("absolute_url", ""),
                    "description_snippet": desc_snippet,
                    "seniority": _infer_seniority(title),
                })
            return jobs
    except Exception as exc:
        logger.debug("Greenhouse error for slug %s: %s", slug, exc)
        return []


async def fetch_lever_jobs(slug: str) -> list[dict]:
    url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                return []
            data = resp.json()
            if not isinstance(data, list):
                return []
            jobs = []
            for job in data:
                title = job.get("text", "")
                cats = job.get("categories", {})
                dept = cats.get("team", "")
                if not _is_engineering_role(title, dept):
                    continue
                desc = job.get("descriptionPlain", "")[:200].strip()
                jobs.append({
                    "title": title,
                    "location": cats.get("location", ""),
                    "department": dept,
                    "apply_url": job.get("hostedUrl", ""),
                    "description_snippet": desc,
                    "seniority": _infer_seniority(title),
                })
            return jobs
    except Exception as exc:
        logger.debug("Lever error for slug %s: %s", slug, exc)
        return []


async def fetch_ashby_jobs(slug: str) -> list[dict]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                return []
            data = resp.json()
            jobs = []
            for job in data.get("jobs", []):
                title = job.get("title", "")
                dept = job.get("department", "")
                if not _is_engineering_role(title, dept):
                    continue
                desc = job.get("descriptionPlain", "")[:200].strip()
                jobs.append({
                    "title": title,
                    "location": job.get("location", ""),
                    "department": dept,
                    "apply_url": job.get("jobUrl", ""),
                    "description_snippet": desc,
                    "seniority": _infer_seniority(title),
                })
            return jobs
    except Exception as exc:
        logger.debug("Ashby error for slug %s: %s", slug, exc)
        return []


async def fetch_workable_jobs(slug: str) -> list[dict]:
    url = f"https://apply.workable.com/api/v1/widget/accounts/{slug}"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                return []
            data = resp.json()
            jobs = []
            for job in data.get("jobs", []):
                title = job.get("title", "")
                dept = job.get("department", "")
                if not _is_engineering_role(title, dept):
                    continue
                desc = job.get("description", "")[:200].strip()
                city = job.get("city", "")
                country = job.get("country", "")
                location = ", ".join(filter(None, [city, country]))
                jobs.append({
                    "title": title,
                    "location": location,
                    "department": dept,
                    "apply_url": job.get("url", ""),
                    "description_snippet": desc,
                    "seniority": _infer_seniority(title),
                })
            return jobs
    except Exception as exc:
        logger.debug("Workable error for slug %s: %s", slug, exc)
        return []


async def try_ats_apis(company_name: str, company_domain: str) -> tuple[str, list[dict]]:
    """Try all ATS providers for a company. Returns (provider_name, jobs) on first hit."""
    slugs = _generate_slugs(company_name, company_domain)
    providers = [
        ("greenhouse", fetch_greenhouse_jobs),
        ("lever", fetch_lever_jobs),
        ("ashby", fetch_ashby_jobs),
        ("workable", fetch_workable_jobs),
    ]
    for slug in slugs:
        for provider_name, fetch_fn in providers:
            jobs = await fetch_fn(slug)
            if jobs:
                logger.info("ATS hit: %s/%s → %d jobs", provider_name, slug, len(jobs))
                return (provider_name, jobs)
    return ("", [])
