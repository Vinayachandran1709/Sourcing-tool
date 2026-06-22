"""
ATS API Scraper
Queries public JSON APIs from Greenhouse, Lever, Ashby, and Workable
to retrieve structured job data without LLM extraction.
"""

from dataclasses import dataclass
import logging
import re
from typing import Any, Optional

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


@dataclass
class AtsFetchResult:
    provider: str
    slug: str
    success: bool
    jobs: list[dict]
    ats_url: str
    status_code: int | None = None
    error: str | None = None


def _strip_html(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"<[^>]+>", "", value).strip()


def _stringify_location(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        parts = []
        for key in ("name", "location", "city", "country", "description"):
            text = str(value.get(key, "")).strip()
            if text and text not in parts:
                parts.append(text)
        return ", ".join(parts)
    return ""


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


def parse_greenhouse_jobs(data: dict, slug: str) -> list[dict]:
    jobs = []
    for job in data.get("jobs", []):
        title = (job.get("title") or "").strip()
        dept = ""
        depts = job.get("departments", [])
        if depts:
            dept = (depts[0].get("name") or "").strip()
        if not title or not _is_engineering_role(title, dept):
            continue
        description_html = job.get("content", "") or ""
        apply_url = (job.get("absolute_url") or "").strip()
        jobs.append({
            "external_id": str(job.get("id")) if job.get("id") is not None else None,
            "title": title,
            "location": _stringify_location(job.get("location")),
            "department": dept,
            "apply_url": apply_url,
            "ats_url": apply_url or f"https://boards.greenhouse.io/{slug}",
            "description_text": _strip_html(description_html),
            "description_html": description_html or None,
            "description_present": bool(description_html),
            "seniority": _infer_seniority(title),
        })
    return jobs


def parse_lever_jobs(data: list[dict], slug: str) -> list[dict]:
    jobs = []
    for job in data:
        title = (job.get("text") or "").strip()
        cats = job.get("categories", {}) or {}
        dept = (cats.get("team") or "").strip()
        if not title or not _is_engineering_role(title, dept):
            continue
        description_html = job.get("description", "") or ""
        description_text = (job.get("descriptionPlain") or "").strip() or _strip_html(description_html)
        apply_url = (job.get("hostedUrl") or "").strip()
        jobs.append({
            "external_id": str(job.get("id")) if job.get("id") is not None else None,
            "title": title,
            "location": _stringify_location(cats.get("location")),
            "department": dept,
            "apply_url": apply_url,
            "ats_url": apply_url or f"https://jobs.lever.co/{slug}",
            "description_text": description_text,
            "description_html": description_html or None,
            "description_present": bool(description_text or description_html),
            "seniority": _infer_seniority(title),
        })
    return jobs


def parse_ashby_jobs(data: dict, slug: str) -> list[dict]:
    jobs = []
    for job in data.get("jobs", []):
        title = (job.get("title") or "").strip()
        dept = (job.get("department") or "").strip()
        if not title or not _is_engineering_role(title, dept):
            continue
        description_html = job.get("descriptionHtml") or job.get("description") or ""
        description_text = (job.get("descriptionPlain") or "").strip() or _strip_html(description_html)
        apply_url = (job.get("jobUrl") or "").strip()
        jobs.append({
            "external_id": str(job.get("id")) if job.get("id") is not None else None,
            "title": title,
            "location": _stringify_location(job.get("location")),
            "department": dept,
            "apply_url": apply_url,
            "ats_url": apply_url or f"https://jobs.ashbyhq.com/{slug}",
            "description_text": description_text,
            "description_html": description_html or None,
            "description_present": bool(description_text or description_html),
            "seniority": _infer_seniority(title),
        })
    return jobs


def parse_workable_jobs(data: dict, slug: str) -> list[dict]:
    jobs = []
    raw_jobs = data.get("jobs")
    if raw_jobs is None:
        raw_jobs = data.get("results", [])
    for job in raw_jobs:
        title = (job.get("title") or "").strip()
        dept = (job.get("department") or "").strip()
        if not title or not _is_engineering_role(title, dept):
            continue
        description_html = job.get("description", "") or ""
        city = (job.get("city") or "").strip()
        country = (job.get("country") or "").strip()
        apply_url = (job.get("url") or "").strip()
        jobs.append({
            "external_id": (
                str(job.get("shortcode"))
                if job.get("shortcode") is not None
                else (str(job.get("id")) if job.get("id") is not None else None)
            ),
            "title": title,
            "location": ", ".join(filter(None, [city, country])),
            "department": dept,
            "apply_url": apply_url,
            "ats_url": apply_url or f"https://apply.workable.com/{slug}",
            "description_text": _strip_html(description_html),
            "description_html": description_html or None,
            "description_present": bool(description_html),
            "seniority": _infer_seniority(title),
        })
    return jobs


async def _fetch_json(provider: str, slug: str, url: str) -> AtsFetchResult:
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            resp = await client.get(url, headers=HEADERS)
            if resp.status_code != 200:
                logger.warning("%s ATS fetch failed for slug %s with HTTP %s", provider, slug, resp.status_code)
                return AtsFetchResult(
                    provider=provider,
                    slug=slug,
                    success=False,
                    jobs=[],
                    ats_url=url,
                    status_code=resp.status_code,
                    error=f"HTTP {resp.status_code}",
                )
            return AtsFetchResult(
                provider=provider,
                slug=slug,
                success=True,
                jobs=resp.json(),
                ats_url=url,
                status_code=resp.status_code,
            )
    except Exception as exc:
        logger.warning("%s ATS fetch errored for slug %s: %s", provider, slug, exc)
        return AtsFetchResult(
            provider=provider,
            slug=slug,
            success=False,
            jobs=[],
            ats_url=url,
            error=str(exc),
        )


def _job_list_result(
    provider: str,
    slug: str,
    ats_url: str,
    raw_result: AtsFetchResult,
    jobs: list[dict],
) -> AtsFetchResult:
    result = AtsFetchResult(
        provider=provider,
        slug=slug,
        success=raw_result.success,
        jobs=jobs,
        ats_url=ats_url,
        status_code=raw_result.status_code,
        error=raw_result.error,
    )
    if result.success:
        logger.info(
            "%s ATS fetch succeeded for slug %s: %d engineering jobs",
            provider,
            slug,
            len(jobs),
        )
    return result


async def fetch_greenhouse_jobs(slug: str) -> list[dict]:
    return (await fetch_greenhouse_jobs_result(slug)).jobs


async def fetch_greenhouse_jobs_result(slug: str) -> AtsFetchResult:
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
    raw_result = await _fetch_json("greenhouse", slug, url)
    if not raw_result.success:
        return _job_list_result("greenhouse", slug, url, raw_result, [])
    jobs = parse_greenhouse_jobs(raw_result.jobs, slug)
    return _job_list_result("greenhouse", slug, url, raw_result, jobs)


async def fetch_lever_jobs(slug: str) -> list[dict]:
    return (await fetch_lever_jobs_result(slug)).jobs


async def fetch_lever_jobs_result(slug: str) -> AtsFetchResult:
    url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
    raw_result = await _fetch_json("lever", slug, url)
    if not raw_result.success:
        return _job_list_result("lever", slug, url, raw_result, [])
    data = raw_result.jobs if isinstance(raw_result.jobs, list) else []
    jobs = parse_lever_jobs(data, slug)
    return _job_list_result("lever", slug, url, raw_result, jobs)


async def fetch_ashby_jobs(slug: str) -> list[dict]:
    return (await fetch_ashby_jobs_result(slug)).jobs


async def fetch_ashby_jobs_result(slug: str) -> AtsFetchResult:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"
    raw_result = await _fetch_json("ashby", slug, url)
    if not raw_result.success:
        return _job_list_result("ashby", slug, url, raw_result, [])
    jobs = parse_ashby_jobs(raw_result.jobs, slug)
    return _job_list_result("ashby", slug, url, raw_result, jobs)


async def fetch_workable_jobs(slug: str) -> list[dict]:
    return (await fetch_workable_jobs_result(slug)).jobs


async def fetch_workable_jobs_result(slug: str) -> AtsFetchResult:
    url = f"https://apply.workable.com/api/v1/widget/accounts/{slug}"
    raw_result = await _fetch_json("workable", slug, url)
    if not raw_result.success:
        return _job_list_result("workable", slug, url, raw_result, [])
    jobs = parse_workable_jobs(raw_result.jobs, slug)
    return _job_list_result("workable", slug, url, raw_result, jobs)


async def try_ats_apis(company_name: str, company_domain: str) -> tuple[str, str, list[dict]]:
    """Try all ATS providers for a company. Returns (provider_name, slug, jobs) on first hit."""
    slugs = _generate_slugs(company_name, company_domain)
    providers = [
        ("greenhouse", fetch_greenhouse_jobs_result),
        ("lever", fetch_lever_jobs_result),
        ("ashby", fetch_ashby_jobs_result),
        ("workable", fetch_workable_jobs_result),
    ]
    for slug in slugs:
        for provider_name, fetch_fn in providers:
            result = await fetch_fn(slug)
            if result.success and result.jobs:
                logger.info("ATS hit: %s/%s -> %d jobs", provider_name, slug, len(result.jobs))
                return (provider_name, slug, result.jobs)
    return ("", "", [])
