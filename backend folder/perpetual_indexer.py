"""
Perpetual US Developer Indexer
Runs every 1 hour via scheduler to continuously discover and update US developer profiles.
"""

import logging
import time
import random
from datetime import datetime, timezone, timedelta
from typing import Optional
import requests
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func

from database import SessionLocal
from models import GithubDeveloper
from config import GITHUB_TOKEN
from location_parser import US_TARGET_CITIES, US_CITY_TO_STATE, parse_us_location

logger = logging.getLogger(__name__)

# GitHub API Config
GITHUB_API_BASE = "https://api.github.com"
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "TalentBox-Indexer/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
}

REQUEST_DELAY = 0.75
MAX_PROFILES_PER_RUN = 2000  # Stay well under 5000/hour limit

# Search strategies - rotates through these
SEARCH_STRATEGIES = [
    # High-quality developers
    {"query_suffix": "repos:>10 followers:>50", "sort": "followers", "name": "high_followers"},
    {"query_suffix": "repos:>20 followers:>20", "sort": "repositories", "name": "many_repos"},

    # Recently active
    {"query_suffix": "repos:>5 pushed:>{recent_date}", "sort": "joined", "name": "recently_active"},

    # Language-specific (high demand roles)
    {"query_suffix": "language:python repos:>5", "sort": "followers", "name": "python_devs"},
    {"query_suffix": "language:javascript repos:>5", "sort": "followers", "name": "js_devs"},
    {"query_suffix": "language:typescript repos:>5", "sort": "followers", "name": "ts_devs"},
    {"query_suffix": "language:go repos:>3", "sort": "followers", "name": "go_devs"},
    {"query_suffix": "language:rust repos:>3", "sort": "followers", "name": "rust_devs"},
    {"query_suffix": "language:java repos:>5", "sort": "followers", "name": "java_devs"},
    {"query_suffix": "language:swift repos:>3", "sort": "followers", "name": "swift_devs"},
    {"query_suffix": "language:kotlin repos:>3", "sort": "followers", "name": "kotlin_devs"},

    # New developers (joined recently)
    {"query_suffix": "repos:>3 created:>{recent_date}", "sort": "joined", "name": "new_devs"},

    # Star earners
    {"query_suffix": "repos:>5", "sort": "stars", "name": "star_earners"},
]

# Role detection (same as seeder)
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
    "R": "Data Scientist",
}

ROLE_KEYWORDS = {
    "Frontend Developer": ["react", "vue", "angular", "frontend", "front-end", "css", "ui", "ux"],
    "Backend Developer": ["backend", "back-end", "api", "server", "django", "flask", "fastapi"],
    "Full-Stack Developer": ["fullstack", "full-stack", "full stack"],
    "Mobile Developer": ["ios", "android", "mobile", "swift", "kotlin", "flutter"],
    "DevOps Engineer": ["devops", "sre", "infrastructure", "kubernetes", "docker", "aws"],
    "Data Scientist": ["data science", "machine learning", "ml", "data analyst"],
    "AI/ML Engineer": ["artificial intelligence", "deep learning", "neural", "pytorch", "tensorflow"],
    "Data Engineer": ["data engineer", "etl", "pipeline", "spark", "kafka"],
    "Security Engineer": ["security", "cybersecurity", "penetration", "infosec"],
}

# Track which strategy/city was used last (persists across runs via DB)
class IndexerState:
    """Track indexer state to rotate through strategies and cities."""

    def __init__(self):
        self.current_strategy_index = 0
        self.current_city_index = 0

    def get_next_cities(self, count: int = 3) -> list[str]:
        """Get next N cities to process."""
        cities = []
        for i in range(count):
            idx = (self.current_city_index + i) % len(US_TARGET_CITIES)
            cities.append(US_TARGET_CITIES[idx])
        self.current_city_index = (self.current_city_index + count) % len(US_TARGET_CITIES)
        return cities

    def get_next_strategies(self, count: int = 2) -> list[dict]:
        """Get next N strategies to use."""
        strategies = []
        for i in range(count):
            idx = (self.current_strategy_index + i) % len(SEARCH_STRATEGIES)
            strategies.append(SEARCH_STRATEGIES[idx])
        self.current_strategy_index = (self.current_strategy_index + count) % len(SEARCH_STRATEGIES)
        return strategies


# Global state (resets on server restart, but that's fine)
indexer_state = IndexerState()


def make_github_request(url: str, params: dict = None) -> Optional[dict]:
    """Make a rate-limited request to GitHub API."""
    try:
        time.sleep(REQUEST_DELAY)
        response = requests.get(url, headers=HEADERS, params=params, timeout=(8, 30))

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 403:
            reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
            wait_time = max(reset_time - int(time.time()), 60)
            logger.warning(f"Rate limited. Waiting {wait_time}s")
            time.sleep(min(wait_time, 300))  # Max wait 5 min
            return None
        elif response.status_code == 422:
            # Invalid query
            logger.warning(f"Invalid search query: {params}")
            return None
        else:
            logger.error(f"GitHub API error {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"Request error: {e}")
        return None


def detect_role(bio: str, languages: list[str]) -> str:
    """Detect developer role from bio and languages."""
    bio_lower = (bio or "").lower()

    for role, keywords in ROLE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in bio_lower:
                return role

    if languages:
        primary_lang = languages[0]
        if primary_lang in LANGUAGE_ROLE_MAP:
            return LANGUAGE_ROLE_MAP[primary_lang]

    return "Software Developer"


def fetch_user_details(username: str) -> Optional[dict]:
    """Fetch detailed user profile."""
    url = f"{GITHUB_API_BASE}/users/{username}"
    return make_github_request(url)


def fetch_user_repos(username: str) -> tuple[list[str], int, int]:
    """Fetch user's repos and extract languages."""
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

    sorted_langs = sorted(languages.keys(), key=lambda x: languages[x], reverse=True)
    return sorted_langs[:5], total_stars, total_forks


def search_users(city: str, strategy: dict, page: int = 1) -> list[dict]:
    """Search for users with a specific strategy."""
    url = f"{GITHUB_API_BASE}/search/users"

    # Build query
    query_suffix = strategy["query_suffix"]

    # Replace date placeholders
    recent_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    query_suffix = query_suffix.replace("{recent_date}", recent_date)

    query = f"location:{city.replace(' ', '+')} {query_suffix}"

    params = {
        "q": query,
        "sort": strategy.get("sort", "best-match"),
        "per_page": 100,
        "page": page,
    }

    result = make_github_request(url, params)
    if result and "items" in result:
        return result["items"]
    return []


def process_and_upsert_user(username: str, city: str, db: Session, existing_usernames: set) -> bool:
    """Process a user and upsert to database. Returns True if new profile added."""

    # Skip if already processed this run
    if username in existing_usernames:
        return False

    # Fetch details
    details = fetch_user_details(username)
    if not details:
        return False

    # Fetch repos
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

    # Calculate score manually
    score = 0
    followers = details.get("followers", 0)
    public_repos = details.get("public_repos", 0)
    bio = details.get("bio", "")
    email = details.get("email")

    # Followers points
    if followers >= 1000: score += 25
    elif followers >= 500: score += 20
    elif followers >= 100: score += 15
    elif followers >= 50: score += 10
    elif followers >= 10: score += 5

    # Repos points
    if public_repos >= 50: score += 20
    elif public_repos >= 30: score += 15
    elif public_repos >= 15: score += 10
    elif public_repos >= 5: score += 5

    # Stars points
    if total_stars >= 500: score += 25
    elif total_stars >= 100: score += 20
    elif total_stars >= 50: score += 15
    elif total_stars >= 10: score += 10
    elif total_stars >= 1: score += 5

    # Activity points
    if updated_at:
        days_since = (datetime.now(timezone.utc) - updated_at.replace(tzinfo=timezone.utc)).days
        if days_since <= 7: score += 15
        elif days_since <= 30: score += 12
        elif days_since <= 90: score += 8
        elif days_since <= 180: score += 4

    # Bio & email points
    if bio and len(bio.strip()) > 20: score += 5
    if email: score += 5
    if languages and len(languages) >= 3: score += 5

    score = min(score, 100)

    # Upsert
    stmt = insert(GithubDeveloper).values(
        github_username=username,
        name=details.get("name"),
        bio=bio,
        email=email,
        avatar_url=details.get("avatar_url"),
        profile_url=details.get("html_url"),
        location_raw=location_raw,
        location_city=location_info.get("city", city),
        location_state=location_info.get("state") or US_CITY_TO_STATE.get(city),
        location_country="United States",
        primary_languages=languages,
        all_languages={lang: 1 for lang in languages},
        detected_role=role,
        public_repos=public_repos,
        followers=followers,
        following=details.get("following", 0),
        total_stars=total_stars,
        total_forks=total_forks,
        github_created_at=created_at,
        last_active_at=updated_at,
        developer_score=score,
        source="perpetual_indexer",
    )

    stmt = stmt.on_conflict_do_update(
        index_elements=["github_username"],
        set_={
            "name": stmt.excluded.name,
            "bio": stmt.excluded.bio,
            "email": stmt.excluded.email,
            "public_repos": stmt.excluded.public_repos,
            "followers": stmt.excluded.followers,
            "total_stars": stmt.excluded.total_stars,
            "developer_score": stmt.excluded.developer_score,
            "last_active_at": stmt.excluded.last_active_at,
            "updated_at": datetime.now(timezone.utc),
        }
    )

    db.execute(stmt)
    existing_usernames.add(username)
    return True


def run_perpetual_index():
    """
    Main function called by scheduler every 1 hour.
    Discovers new developers and updates existing ones.
    """
    start_time = time.time()
    logger.info("🔄 Starting perpetual indexer run...")

    db = SessionLocal()
    processed = 0
    new_profiles = 0

    try:
        # Get existing usernames to track what we've seen
        existing_usernames = set()

        # Get cities and strategies for this run
        cities = indexer_state.get_next_cities(3)  # Process 3 cities per run
        strategies = indexer_state.get_next_strategies(2)  # Use 2 strategies per run

        logger.info(f"   Cities: {cities}")
        logger.info(f"   Strategies: {[s['name'] for s in strategies]}")

        for city in cities:
            for strategy in strategies:
                if processed >= MAX_PROFILES_PER_RUN:
                    break

                logger.info(f"   Searching {city} with {strategy['name']}...")

                # Search pages 1-5 (max 500 per city/strategy)
                for page in range(1, 6):
                    if processed >= MAX_PROFILES_PER_RUN:
                        break

                    users = search_users(city, strategy, page)
                    if not users:
                        break

                    for user in users:
                        if processed >= MAX_PROFILES_PER_RUN:
                            break

                        username = user.get("login")
                        if not username:
                            continue

                        try:
                            is_new = process_and_upsert_user(username, city, db, existing_usernames)
                            processed += 1
                            if is_new:
                                new_profiles += 1

                            if processed % 100 == 0:
                                db.commit()
                                logger.info(f"   Processed {processed}, new: {new_profiles}")
                        except Exception as e:
                            logger.error(f"Error processing {username}: {e}")
                            continue

        db.commit()

    except Exception as e:
        logger.error(f"Perpetual indexer error: {e}")
        db.rollback()
    finally:
        db.close()

    elapsed = time.time() - start_time

    # Get total count
    db = SessionLocal()
    try:
        total = db.query(func.count(GithubDeveloper.id)).scalar()
    finally:
        db.close()

    logger.info(f"✅ Perpetual indexer complete")
    logger.info(f"   Processed: {processed}")
    logger.info(f"   New profiles: {new_profiles}")
    logger.info(f"   Total in DB: {total}")
    logger.info(f"   Time: {elapsed:.1f}s")


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_perpetual_index()
