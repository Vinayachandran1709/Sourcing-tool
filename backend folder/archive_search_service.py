"""
Archive Search Service
Searches the github_developers table for developer profiles (US + India).
Primary search source - fast, no rate limits.
"""

import logging
from typing import List, Optional, Generator
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from models import GithubDeveloper
from location_parser import (
    normalize_city, US_TARGET_CITIES,
    INDIA_TARGET_CITIES, INDIA_CITY_NORMALIZER
)

logger = logging.getLogger(__name__)

# Role to languages mapping (for filtering)
ROLE_TO_LANGUAGES = {
    "Frontend Developer": ["JavaScript", "TypeScript", "CSS", "HTML"],
    "Backend Developer": ["Python", "Java", "Go", "Ruby", "PHP", "C#", "Rust", "C++"],
    "Full-Stack Developer": ["JavaScript", "TypeScript", "Python", "Java", "Ruby"],
    "Mobile Developer": ["Swift", "Kotlin", "Dart", "Java", "Objective-C"],
    "DevOps Engineer": ["Python", "Go", "Shell", "HCL", "Ruby"],
    "Data Scientist": ["Python", "R", "Julia", "SQL"],
    "AI/ML Engineer": ["Python", "C++", "Julia", "Jupyter Notebook"],
    "Data Engineer": ["Python", "Scala", "Java", "SQL"],
    "Security Engineer": ["Python", "Go", "C", "Rust", "Shell"],
    "QA Engineer": ["Python", "Java", "JavaScript", "Ruby"],
    "Blockchain Developer": ["Solidity", "Rust", "Go", "JavaScript"],
    "Game Developer": ["C++", "C#", "Lua", "GDScript"],
    "Embedded Engineer": ["C", "C++", "Rust", "Assembly"],
    "Software Developer": [],  # Matches all
}

# All available roles
AVAILABLE_ROLES = list(ROLE_TO_LANGUAGES.keys())

AVAILABLE_LANGUAGES = [
    # Tier 1: Most Popular (Always visible)
    "Python",
    "JavaScript",
    "TypeScript",
    "Java",
    "Go",
    "Rust",
    "C++",
    "C#",
    "C",
    "Ruby",
    "PHP",
    "Swift",
    "Kotlin",

    # Tier 2: Common
    "Scala",
    "R",
    "Dart",
    "Shell",
    "Objective-C",
    "Perl",
    "Lua",

    # Tier 3: Specialized
    "Elixir",
    "Clojure",
    "Haskell",
    "F#",
    "Julia",
    "MATLAB",
    "Groovy",
    "PowerShell",
]


def search_developers(
    db: Session,
    role: Optional[str] = None,
    location: Optional[str] = None,
    languages: Optional[List[str]] = None,
    limit: int = 1000,
    offset: int = 0,
    min_score: int = 0,
    has_email: Optional[bool] = None,
    min_experience: Optional[int] = None,
) -> list[GithubDeveloper]:
    """
    Search github_developers table with role and location filters.

    Args:
        db: Database session
        role: Developer role (e.g., "Frontend Developer")
        location: City name (e.g., "San Francisco") or "United States" for all
        limit: Max results to return
        offset: Pagination offset
        min_score: Minimum developer score filter
        has_email: If True, only return profiles with an email
        min_experience: Minimum years of GitHub account age

    Returns:
        List of GithubDeveloper objects sorted by score DESC
    """
    query = db.query(GithubDeveloper)

    # Filter out organization accounts
    query = query.filter(
        or_(
            GithubDeveloper.account_type == "User",
            GithubDeveloper.account_type.is_(None)
        )
    )

    # Location filter
    if location:
        if location.lower() in ["united states", "usa", "us", "india", "all"]:
            # Country-level or all - filter by country if specific
            if location.lower() in ["united states", "usa", "us"]:
                query = query.filter(GithubDeveloper.location_country == "United States")
            elif location.lower() == "india":
                query = query.filter(GithubDeveloper.location_country == "India")
            # "all" = no filter
        else:
            # Specific city - try US normalization first
            normalized_city = normalize_city(location)
            if normalized_city:
                query = query.filter(GithubDeveloper.location_city == normalized_city)
            else:
                # Try India normalization
                india_normalized = INDIA_CITY_NORMALIZER.get(location.lower().strip())
                if india_normalized:
                    query = query.filter(
                        func.lower(GithubDeveloper.location_city) == india_normalized
                    )
                else:
                    # Try direct match
                    query = query.filter(
                        func.lower(GithubDeveloper.location_city) == location.lower()
                    )

    # Role filter (search in detected_roles array OR detected_role)
    if role and role in ROLE_TO_LANGUAGES:
        role_langs = ROLE_TO_LANGUAGES[role]  # separate variable — don't overwrite 'languages'

        role_condition = or_(
            GithubDeveloper.detected_role == role,
            GithubDeveloper.detected_roles.any(role),
        )

        if role_langs:
            language_condition = GithubDeveloper.primary_languages.overlap(role_langs)
            query = query.filter(or_(role_condition, language_condition))
        else:
            query = query.filter(role_condition)

    # Explicit language filter — only when caller passes specific languages (e.g. specialization chips).
    # When role is provided without explicit languages, the role filter above already handles it.
    if languages and len(languages) > 0:
        query = query.filter(
            GithubDeveloper.primary_languages.overlap(languages)
        )

    # Score filter
    if min_score > 0:
        query = query.filter(GithubDeveloper.developer_score >= min_score)

    # Email availability filter
    if has_email is True:
        query = query.filter(
            GithubDeveloper.email.isnot(None),
            GithubDeveloper.email != ""
        )

    # Experience filter (based on GitHub account age)
    if min_experience and min_experience > 0:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=min_experience * 365)
        query = query.filter(
            GithubDeveloper.github_created_at.isnot(None),
            GithubDeveloper.github_created_at <= cutoff_date
        )

    # Order by score (best first)
    query = query.order_by(GithubDeveloper.developer_score.desc())

    # Pagination
    query = query.offset(offset).limit(limit)

    return query.all()


def search_developers_batched(
    db: Session,
    role: Optional[str] = None,
    location: Optional[str] = None,
    languages: Optional[List[str]] = None,
    batch_size: int = 500,
    min_score: int = 0,
) -> Generator[list, None, None]:
    """
    Yield developers in batches for streaming. No hard cap — returns all matches.
    """
    query = db.query(GithubDeveloper)

    # Filter out organization accounts
    query = query.filter(
        or_(
            GithubDeveloper.account_type == "User",
            GithubDeveloper.account_type.is_(None)
        )
    )

    # Location filter
    if location:
        if location.lower() in ["united states", "usa", "us", "india", "all"]:
            if location.lower() in ["united states", "usa", "us"]:
                query = query.filter(GithubDeveloper.location_country == "United States")
            elif location.lower() == "india":
                query = query.filter(GithubDeveloper.location_country == "India")
        else:
            normalized_city = normalize_city(location)
            if normalized_city:
                query = query.filter(GithubDeveloper.location_city == normalized_city)
            else:
                india_normalized = INDIA_CITY_NORMALIZER.get(location.lower().strip())
                if india_normalized:
                    query = query.filter(
                        func.lower(GithubDeveloper.location_city) == india_normalized
                    )
                else:
                    query = query.filter(
                        func.lower(GithubDeveloper.location_city) == location.lower()
                    )

    # Role filter
    if role and role in ROLE_TO_LANGUAGES:
        role_languages = ROLE_TO_LANGUAGES[role]
        role_condition = or_(
            GithubDeveloper.detected_role == role,
            GithubDeveloper.detected_roles.any(role),
        )
        if role_languages:
            language_condition = GithubDeveloper.primary_languages.overlap(role_languages)
            query = query.filter(or_(role_condition, language_condition))
        else:
            query = query.filter(role_condition)

    # Language filter - match if any selected language is in primary_languages
    if languages and len(languages) > 0:
        query = query.filter(
            GithubDeveloper.primary_languages.overlap(languages)
        )

    # Score filter
    if min_score > 0:
        query = query.filter(GithubDeveloper.developer_score >= min_score)

    # Order by score (best first)
    query = query.order_by(GithubDeveloper.developer_score.desc())

    offset = 0
    while True:
        batch = query.offset(offset).limit(batch_size).all()
        if not batch:
            break
        yield batch
        if len(batch) < batch_size:
            break
        offset += batch_size


def count_developers(
    db: Session,
    role: Optional[str] = None,
    location: Optional[str] = None,
    languages: Optional[List[str]] = None,
    min_score: int = 0,
    has_email: Optional[bool] = None,
    min_experience: Optional[int] = None,
) -> int:
    """Count developers matching filters."""
    query = db.query(func.count(GithubDeveloper.id))

    # Filter out organization accounts
    query = query.filter(
        or_(
            GithubDeveloper.account_type == "User",
            GithubDeveloper.account_type.is_(None)
        )
    )

    # Location filter
    if location:
        if location.lower() in ["united states", "usa", "us", "india", "all"]:
            if location.lower() in ["united states", "usa", "us"]:
                query = query.filter(GithubDeveloper.location_country == "United States")
            elif location.lower() == "india":
                query = query.filter(GithubDeveloper.location_country == "India")
        else:
            normalized_city = normalize_city(location)
            if normalized_city:
                query = query.filter(GithubDeveloper.location_city == normalized_city)
            else:
                india_normalized = INDIA_CITY_NORMALIZER.get(location.lower().strip())
                if india_normalized:
                    query = query.filter(
                        func.lower(GithubDeveloper.location_city) == india_normalized
                    )
                else:
                    query = query.filter(
                        func.lower(GithubDeveloper.location_city) == location.lower()
                    )

    # Role filter (search in detected_roles array OR detected_role)
    if role and role in ROLE_TO_LANGUAGES:
        role_languages = ROLE_TO_LANGUAGES[role]
        role_condition = or_(
            GithubDeveloper.detected_role == role,
            GithubDeveloper.detected_roles.any(role),
        )
        if role_languages:
            language_condition = GithubDeveloper.primary_languages.overlap(role_languages)
            query = query.filter(or_(role_condition, language_condition))
        else:
            query = query.filter(role_condition)

    # Language filter - match if any selected language is in primary_languages
    if languages and len(languages) > 0:
        query = query.filter(
            GithubDeveloper.primary_languages.overlap(languages)
        )

    # Score filter
    if min_score > 0:
        query = query.filter(GithubDeveloper.developer_score >= min_score)

    # Email availability filter
    if has_email is True:
        query = query.filter(
            GithubDeveloper.email.isnot(None),
            GithubDeveloper.email != ""
        )

    # Experience filter (based on GitHub account age)
    if min_experience and min_experience > 0:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=min_experience * 365)
        query = query.filter(
            GithubDeveloper.github_created_at.isnot(None),
            GithubDeveloper.github_created_at <= cutoff_date
        )

    return query.scalar() or 0


def get_city_stats(db: Session) -> dict:
    """Get profile counts per city."""
    results = db.query(
        GithubDeveloper.location_city,
        func.count(GithubDeveloper.id)
    ).group_by(GithubDeveloper.location_city).all()

    return {city: count for city, count in results if city}


def get_role_stats(db: Session) -> dict:
    """Get profile counts per role."""
    results = db.query(
        GithubDeveloper.detected_role,
        func.count(GithubDeveloper.id)
    ).group_by(GithubDeveloper.detected_role).all()

    return {role: count for role, count in results if role}


def developer_to_dict(dev: GithubDeveloper) -> dict:
    """Convert GithubDeveloper to API response dict."""
    # Build location string safely (avoid "city, None")
    location_parts = [p for p in [dev.location_city, dev.location_state] if p]
    location_str = dev.location_raw or (", ".join(location_parts) if location_parts else None)

    # Build languages_data dict for ProfileCard/ProfileDetailModal
    # all_languages is stored as {"Python": 1, ...} or None
    languages_data = dev.all_languages or {}
    if not languages_data and dev.primary_languages:
        # Fallback: synthesise equal-weight dict from primary_languages array
        languages_data = {lang: 1 for lang in dev.primary_languages}

    last_active_iso = dev.last_active_at.isoformat() if dev.last_active_at else None

    return {
        "id": dev.id,
        "github_username": dev.github_username,
        "name": dev.name or dev.github_username,
        "bio": dev.bio,
        "email": dev.email,
        "avatar_url": dev.avatar_url,
        "profile_url": dev.profile_url,
        "location": location_str,
        "location_city": dev.location_city,
        "location_state": dev.location_state,
        "languages": dev.primary_languages or [],
        # languages_data: dict used by ProfileCard LanguageTags + ProfileDetailModal bars
        "languages_data": languages_data,
        "detected_role": dev.detected_role,
        "detected_roles": dev.detected_roles or [],
        "public_repos": dev.public_repos,
        "followers": dev.followers,
        "total_stars": dev.total_stars,
        "contributions_last_year": dev.contributions_last_year or 0,
        "developer_score": dev.developer_score,
        # Both field names used across modals
        "last_active_at": last_active_iso,
        "last_active_date": last_active_iso,
        "github_created_at": dev.github_created_at.isoformat() if dev.github_created_at else None,
        "estimated_experience_years": (
            (datetime.now(timezone.utc).year - dev.github_created_at.year)
            if dev.github_created_at else None
        ),
        "top_repos": None,  # Not stored in GithubDeveloper; modal skips when None
        # Aliases for existing frontend compatibility
        "login": dev.github_username,
        "html_url": dev.profile_url,
        "score": dev.developer_score,
    }
