"""
Bulk Seed US Developers
Run once to populate initial database with ~100,000 US developer profiles.
Usage: python scripts/seed_us_developers.py [--city CITY] [--limit N]
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import json
import time
import logging
from datetime import datetime, timezone
from typing import Optional
import requests
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from database import SessionLocal
from models import GithubDeveloper
from config import GITHUB_TOKEN
from location_parser import US_TARGET_CITIES, US_CITY_TO_STATE, parse_us_location

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# GitHub API Config
GITHUB_API_BASE = "https://api.github.com"
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}

# Rate limiting
REQUEST_DELAY = 0.75  # seconds between requests
MAX_RETRIES = 3

# Role detection keywords (simplified from role_detection_service.py)
ROLE_KEYWORDS = {
    "Frontend Developer": ["react", "vue", "angular", "frontend", "front-end", "css", "html", "javascript", "typescript", "ui", "ux"],
    "Backend Developer": ["backend", "back-end", "api", "server", "django", "flask", "fastapi", "express", "rails", "spring"],
    "Full-Stack Developer": ["fullstack", "full-stack", "full stack", "mern", "mean"],
    "Mobile Developer": ["ios", "android", "mobile", "swift", "kotlin", "react native", "flutter"],
    "DevOps Engineer": ["devops", "sre", "infrastructure", "kubernetes", "docker", "aws", "cloud", "ci/cd", "terraform"],
    "Data Scientist": ["data science", "machine learning", "ml", "data analyst", "statistics", "pandas", "numpy"],
    "AI/ML Engineer": ["artificial intelligence", "deep learning", "neural", "pytorch", "tensorflow", "nlp", "computer vision"],
    "Data Engineer": ["data engineer", "etl", "pipeline", "spark", "kafka", "airflow", "data warehouse"],
    "Security Engineer": ["security", "cybersecurity", "penetration", "infosec", "devsecops"],
    "QA Engineer": ["qa", "quality assurance", "testing", "test automation", "selenium"],
}

# Language to role mapping
LANGUAGE_ROLE_MAP = {
    "JavaScript": "Frontend Developer",
    "TypeScript": "Frontend Developer",
    "Swift": "Mobile Developer",
    "Kotlin": "Mobile Developer",
    "Dart": "Mobile Developer",
    "Python": "Backend Developer",
    "Java": "Backend Developer",
    "Go": "Backend Developer",
    "Ruby": "Backend Developer",
    "PHP": "Backend Developer",
    "C#": "Backend Developer",
    "Rust": "Backend Developer",
    "Shell": "DevOps Engineer",
    "HCL": "DevOps Engineer",
    "R": "Data Scientist",
    "Julia": "Data Scientist",
}


def detect_role(bio: str, languages: list[str]) -> str:
    """Detect developer role from bio and languages."""
    bio_lower = (bio or "").lower()

    # Check bio for role keywords
    for role, keywords in ROLE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in bio_lower:
                return role

    # Fall back to primary language
    if languages:
        primary_lang = languages[0]
        if primary_lang in LANGUAGE_ROLE_MAP:
            return LANGUAGE_ROLE_MAP[primary_lang]

    return "Software Developer"  # Default


def make_github_request(url: str, params: dict = None) -> Optional[dict]:
    """Make a rate-limited request to GitHub API."""
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(REQUEST_DELAY)
            response = requests.get(url, headers=HEADERS, params=params, timeout=30)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 403:
                # Rate limited
                reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
                wait_time = max(reset_time - int(time.time()), 60)
                logger.warning(f"Rate limited. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
            elif response.status_code == 404:
                return None
            else:
                logger.error(f"GitHub API error {response.status_code}: {response.text}")
                time.sleep(5 * (attempt + 1))
        except Exception as e:
            logger.error(f"Request error: {e}")
            time.sleep(5 * (attempt + 1))

    return None


def fetch_user_repos(username: str) -> tuple[list[str], int, int]:
    """Fetch user's repos and extract languages, stars, forks."""
    url = f"{GITHUB_API_BASE}/users/{username}/repos"
    params = {"sort": "stars", "per_page": 10}

    repos = make_github_request(url, params)
    if not repos:
        return [], 0, 0

    languages = {}
    total_stars = 0
    total_forks = 0

    for repo in repos:
        lang = repo.get("language")
        if lang:
            languages[lang] = languages.get(lang, 0) + repo.get("size", 0)
        total_stars += repo.get("stargazers_count", 0)
        total_forks += repo.get("forks_count", 0)

    # Sort languages by usage
    sorted_langs = sorted(languages.keys(), key=lambda x: languages[x], reverse=True)

    return sorted_langs[:5], total_stars, total_forks


def fetch_user_details(username: str) -> Optional[dict]:
    """Fetch detailed user profile from GitHub."""
    url = f"{GITHUB_API_BASE}/users/{username}"
    return make_github_request(url)


def search_users_in_city(city: str, page: int = 1) -> list[dict]:
    """Search for users in a specific city."""
    url = f"{GITHUB_API_BASE}/search/users"
    query = f"location:{city.replace(' ', '+')} repos:>3"
    params = {
        "q": query,
        "per_page": 100,
        "page": page,
    }

    result = make_github_request(url, params)
    if result and "items" in result:
        return result["items"]
    return []


def process_user(user_data: dict, city: str, db: Session) -> Optional[GithubDeveloper]:
    """Process a single user and upsert to database."""
    username = user_data.get("login")
    if not username:
        return None

    # Fetch detailed profile
    details = fetch_user_details(username)
    if not details:
        return None

    # Fetch repos and languages
    languages, total_stars, total_forks = fetch_user_repos(username)

    # Parse location
    location_raw = details.get("location", "")
    location_info = parse_us_location(location_raw) or {}

    # Detect role
    role = detect_role(details.get("bio", ""), languages)

    # Parse dates
    created_at = None
    if details.get("created_at"):
        try:
            created_at = datetime.fromisoformat(details["created_at"].replace("Z", "+00:00"))
        except:
            pass

    updated_at = None
    if details.get("updated_at"):
        try:
            updated_at = datetime.fromisoformat(details["updated_at"].replace("Z", "+00:00"))
        except:
            pass

    # Create developer record
    developer = GithubDeveloper(
        github_username=username,
        name=details.get("name"),
        bio=details.get("bio"),
        email=details.get("email"),
        avatar_url=details.get("avatar_url"),
        profile_url=details.get("html_url"),
        location_raw=location_raw,
        location_city=location_info.get("city", city),  # Use search city as fallback
        location_state=location_info.get("state") or US_CITY_TO_STATE.get(city),
        location_country="United States",
        primary_languages=languages,
        all_languages={lang: 1 for lang in languages},  # Simplified
        detected_role=role,
        public_repos=details.get("public_repos", 0),
        followers=details.get("followers", 0),
        following=details.get("following", 0),
        total_stars=total_stars,
        total_forks=total_forks,
        github_created_at=created_at,
        last_active_at=updated_at,
        source="bulk_seed",
    )

    # Calculate score
    developer.calculate_score()

    return developer


def upsert_developer(db: Session, developer: GithubDeveloper):
    """Upsert developer to database."""
    stmt = insert(GithubDeveloper).values(
        github_username=developer.github_username,
        name=developer.name,
        bio=developer.bio,
        email=developer.email,
        avatar_url=developer.avatar_url,
        profile_url=developer.profile_url,
        location_raw=developer.location_raw,
        location_city=developer.location_city,
        location_state=developer.location_state,
        location_country=developer.location_country,
        primary_languages=developer.primary_languages,
        all_languages=developer.all_languages,
        detected_role=developer.detected_role,
        public_repos=developer.public_repos,
        followers=developer.followers,
        following=developer.following,
        total_stars=developer.total_stars,
        total_forks=developer.total_forks,
        github_created_at=developer.github_created_at,
        last_active_at=developer.last_active_at,
        developer_score=developer.developer_score,
        source=developer.source,
    )

    stmt = stmt.on_conflict_do_update(
        index_elements=["github_username"],
        set_={
            "name": stmt.excluded.name,
            "bio": stmt.excluded.bio,
            "email": stmt.excluded.email,
            "avatar_url": stmt.excluded.avatar_url,
            "public_repos": stmt.excluded.public_repos,
            "followers": stmt.excluded.followers,
            "total_stars": stmt.excluded.total_stars,
            "total_forks": stmt.excluded.total_forks,
            "developer_score": stmt.excluded.developer_score,
            "last_active_at": stmt.excluded.last_active_at,
            "updated_at": datetime.now(timezone.utc),
        }
    )

    db.execute(stmt)


def seed_city(city: str, limit: int = 1000) -> int:
    """Seed developers from a single city."""
    logger.info(f"🏙️  Seeding {city}...")

    db = SessionLocal()
    count = 0
    page = 1

    try:
        while count < limit:
            # Search for users
            users = search_users_in_city(city, page)
            if not users:
                logger.info(f"No more users found for {city} at page {page}")
                break

            for user in users:
                if count >= limit:
                    break

                try:
                    developer = process_user(user, city, db)
                    if developer:
                        upsert_developer(db, developer)
                        count += 1

                        if count % 50 == 0:
                            db.commit()
                            logger.info(f"  {city}: {count} profiles processed")
                except Exception as e:
                    logger.error(f"Error processing {user.get('login')}: {e}")
                    continue

            page += 1

            # GitHub search API limit: 10 pages max (1000 results)
            if page > 10:
                break

        db.commit()
        logger.info(f"✅ {city}: {count} profiles seeded")

    except Exception as e:
        logger.error(f"Error seeding {city}: {e}")
        db.rollback()
    finally:
        db.close()

    return count


def main():
    parser = argparse.ArgumentParser(description="Seed US developers from GitHub")
    parser.add_argument("--city", type=str, help="Process single city only")
    parser.add_argument("--limit", type=int, default=1000, help="Max profiles per city")
    args = parser.parse_args()

    start_time = time.time()
    total_count = 0

    if args.city:
        cities = [args.city.lower()]
    else:
        cities = US_TARGET_CITIES

    logger.info(f"🚀 Starting bulk seed for {len(cities)} cities")
    logger.info(f"   Limit per city: {args.limit}")

    for city in cities:
        count = seed_city(city, args.limit)
        total_count += count

    elapsed = time.time() - start_time
    logger.info(f"\n{'='*50}")
    logger.info(f"✅ BULK SEED COMPLETE")
    logger.info(f"   Total profiles: {total_count}")
    logger.info(f"   Time elapsed: {elapsed/60:.1f} minutes")
    logger.info(f"{'='*50}")


if __name__ == "__main__":
    main()
