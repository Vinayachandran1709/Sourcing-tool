"""
Archive Search Service
Searches the github_developers table for developer profiles (US + India).
Primary search source - fast, no rate limits.
"""

import logging
from typing import List, Optional, Generator
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

    Returns:
        List of GithubDeveloper objects sorted by score DESC
    """
    query = db.query(GithubDeveloper)

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
        languages = ROLE_TO_LANGUAGES[role]

        # Match if role is in detected_roles array OR matches detected_role
        role_condition = or_(
            GithubDeveloper.detected_role == role,
            GithubDeveloper.detected_roles.any(role),  # Check if role is in the array
        )

        # Also match by languages
        if languages:
            language_condition = GithubDeveloper.primary_languages.overlap(languages)
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
) -> int:
    """Count developers matching filters."""
    query = db.query(func.count(GithubDeveloper.id))

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
    return {
        "id": dev.id,
        "github_username": dev.github_username,
        "name": dev.name or dev.github_username,
        "bio": dev.bio,
        "email": dev.email,
        "avatar_url": dev.avatar_url,
        "profile_url": dev.profile_url,
        "location": dev.location_raw or f"{dev.location_city}, {dev.location_state}",
        "location_city": dev.location_city,
        "location_state": dev.location_state,
        "languages": dev.primary_languages or [],
        "detected_role": dev.detected_role,
        "detected_roles": dev.detected_roles or [],
        "public_repos": dev.public_repos,
        "followers": dev.followers,
        "total_stars": dev.total_stars,
        "developer_score": dev.developer_score,
        "last_active_at": dev.last_active_at.isoformat() if dev.last_active_at else None,
        # For compatibility with existing frontend
        "login": dev.github_username,
        "html_url": dev.profile_url,
        "score": dev.developer_score,
    }
