"""Shared helpers for storing ATS-fetched jobs with stable dedupe semantics."""

from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import urlparse, urlunparse

from sqlalchemy.orm import Session

from models import JobPosting


def normalize_job_text(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


def normalize_job_location(value: str | None) -> str:
    return normalize_job_text(value)


def normalize_job_url(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    try:
        parsed = urlparse(raw)
        clean_path = parsed.path.rstrip("/")
        return urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            clean_path,
            "",
            "",
            "",
        ))
    except Exception:
        return raw.rstrip("/").lower()


def fallback_job_key(company_domain: str | None, title: str | None, location: str | None, apply_url: str | None) -> tuple[str, str, str, str]:
    return (
        normalize_job_text(company_domain),
        normalize_job_text(title),
        normalize_job_location(location),
        normalize_job_url(apply_url),
    )


def find_existing_ats_job(
    db: Session,
    *,
    provider: str,
    external_id: str | None,
    company_domain: str | None,
    title: str | None,
    location: str | None,
    apply_url: str | None,
) -> JobPosting | None:
    if external_id:
        existing = db.query(JobPosting).filter(
            JobPosting.ats_provider == provider,
            JobPosting.external_id == external_id,
        ).first()
        if existing:
            return existing

    candidates = db.query(JobPosting).filter(
        JobPosting.company_domain == company_domain,
        JobPosting.title == title,
    ).all()
    target_key = fallback_job_key(company_domain, title, location, apply_url)
    for candidate in candidates:
        candidate_key = fallback_job_key(
            candidate.company_domain,
            candidate.title,
            candidate.location,
            candidate.apply_url,
        )
        if candidate_key == target_key:
            return candidate
    return None


def update_job_from_ats(existing: JobPosting, job: dict, seen_at: datetime) -> None:
    existing.external_id = job.get("external_id") or existing.external_id
    existing.title = job.get("title") or existing.title
    existing.department = job.get("department") or existing.department
    existing.location = job.get("location") or existing.location
    existing.remote_policy = job.get("remote_policy") or existing.remote_policy
    existing.seniority_level = job.get("seniority") or existing.seniority_level
    existing.ats_provider = job.get("ats_provider") or existing.ats_provider
    existing.ats_url = job.get("ats_url") or existing.ats_url
    existing.apply_url = job.get("apply_url") or existing.apply_url
    existing.source = job.get("source") or existing.source
    existing.description_text = job.get("description_text") or existing.description_text
    existing.description_html = job.get("description_html") or existing.description_html
    existing.is_active = True
    existing.is_visible_on_homepage = True
    existing.last_seen_at = seen_at


def create_job_from_ats(startup, job: dict, seen_at: datetime) -> JobPosting:
    return JobPosting(
        external_id=job.get("external_id") or None,
        startup_id=startup.id,
        company_name=startup.company_name,
        company_domain=startup.domain,
        company_logo_url=startup.logo_url,
        funding_stage=startup.funding_stage,
        investors_summary=", ".join(startup.investors or [])[:500],
        title=job.get("title"),
        department=job.get("department"),
        description_text=job.get("description_text") or None,
        description_html=job.get("description_html") or None,
        location=job.get("location") or None,
        remote_policy=job.get("remote_policy") or None,
        seniority_level=job.get("seniority") or None,
        ats_provider=job.get("ats_provider") or None,
        ats_url=job.get("ats_url") or None,
        apply_url=job.get("apply_url") or None,
        source=job.get("source") or "ats_api",
        is_engineering=True,
        is_active=True,
        is_visible_on_homepage=True,
        quality_score=75,
        first_seen_at=seen_at,
        last_seen_at=seen_at,
    )


def upsert_ats_job(db: Session, startup, provider: str, job: dict, seen_at: datetime | None = None) -> tuple[JobPosting, bool]:
    seen_at = seen_at or datetime.now(timezone.utc)
    enriched_job = {
        **job,
        "ats_provider": provider,
        "source": job.get("source") or "ats_api",
    }
    existing = find_existing_ats_job(
        db,
        provider=provider,
        external_id=enriched_job.get("external_id"),
        company_domain=startup.domain,
        title=enriched_job.get("title"),
        location=enriched_job.get("location"),
        apply_url=enriched_job.get("apply_url"),
    )
    if existing:
        update_job_from_ats(existing, enriched_job, seen_at)
        return existing, False

    new_job = create_job_from_ats(startup, enriched_job, seen_at)
    db.add(new_job)
    return new_job, True


def build_seen_identifiers(company_domain: str | None, jobs: Iterable[dict]) -> tuple[set[str], set[tuple[str, str, str, str]]]:
    external_ids: set[str] = set()
    fallback_keys: set[tuple[str, str, str, str]] = set()
    for job in jobs:
        external_id = (job.get("external_id") or "").strip()
        if external_id:
            external_ids.add(external_id)
        fallback_keys.add(
            fallback_job_key(
                company_domain,
                job.get("title"),
                job.get("location"),
                job.get("apply_url"),
            )
        )
    return external_ids, fallback_keys


def deactivate_missing_ats_jobs(
    db: Session,
    *,
    startup,
    provider: str,
    seen_external_ids: set[str],
    seen_fallback_keys: set[tuple[str, str, str, str]],
) -> int:
    deactivated = 0
    existing_active_jobs = db.query(JobPosting).filter(
        JobPosting.company_domain == startup.domain,
        JobPosting.is_active == True,
        JobPosting.source == "ats_api",
        JobPosting.ats_provider == provider,
    ).all()

    for existing in existing_active_jobs:
        if existing.external_id and existing.external_id in seen_external_ids:
            continue
        if fallback_job_key(
            existing.company_domain,
            existing.title,
            existing.location,
            existing.apply_url,
        ) in seen_fallback_keys:
            continue
        existing.is_active = False
        existing.is_visible_on_homepage = False
        deactivated += 1

    return deactivated
