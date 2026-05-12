"""
Perpetual Developer Indexer (US + India)
Runs every 1 hour via scheduler to continuously discover and update developer profiles.
Alternates between US and India each run.
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
from location_parser import (
    US_TARGET_CITIES, US_CITY_TO_STATE, parse_us_location,
    INDIA_TARGET_CITIES, INDIA_CITY_TO_STATE, parse_india_location,
    EUROPE_TARGET_CITIES, EUROPE_CITY_TO_COUNTRY,
    MIDDLE_EAST_TARGET_CITIES, MIDDLE_EAST_CITY_TO_COUNTRY,
    ASIA_TARGET_CITIES, ASIA_CITY_TO_COUNTRY,
    AUSTRALIA_TARGET_CITIES, AUSTRALIA_CITY_TO_COUNTRY,
    parse_location, get_city_country
)
from role_detection_service import detect_all_roles

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
MAX_PROFILES_PER_RUN = 3000  # Increased from 2000

# Search strategies - rotates through these
SEARCH_STRATEGIES = [
    # === GENERAL STRATEGIES (Catch everyone) ===
    {"query_suffix": "repos:>5", "sort": "joined", "name": "active_devs"},
    {"query_suffix": "repos:>3", "sort": "repositories", "name": "many_repos"},
    {"query_suffix": "repos:>2", "sort": "followers", "name": "any_followers"},

    # === RECENTLY ACTIVE ===
    {"query_suffix": "repos:>2 created:>{recent_date_90}", "sort": "joined", "name": "new_joiners_90d"},
    {"query_suffix": "repos:>2 pushed:>{recent_push_date}", "sort": "joined", "name": "recently_pushed"},

    # === HIGH-DEMAND LANGUAGES ===
    {"query_suffix": "language:python repos:>2", "sort": "joined", "name": "python_devs"},
    {"query_suffix": "language:javascript repos:>2", "sort": "joined", "name": "js_devs"},
    {"query_suffix": "language:typescript repos:>2", "sort": "joined", "name": "ts_devs"},
    {"query_suffix": "language:java repos:>2", "sort": "joined", "name": "java_devs"},
    {"query_suffix": "language:go repos:>2", "sort": "joined", "name": "go_devs"},
    {"query_suffix": "language:rust repos:>2", "sort": "joined", "name": "rust_devs"},
    {"query_suffix": "language:swift repos:>2", "sort": "joined", "name": "swift_devs"},
    {"query_suffix": "language:kotlin repos:>2", "sort": "joined", "name": "kotlin_devs"},
    {"query_suffix": "language:ruby repos:>2", "sort": "joined", "name": "ruby_devs"},
    {"query_suffix": "language:php repos:>2", "sort": "joined", "name": "php_devs"},
    {"query_suffix": "language:csharp repos:>2", "sort": "joined", "name": "csharp_devs"},
    {"query_suffix": "language:cpp repos:>2", "sort": "joined", "name": "cpp_devs"},
    {"query_suffix": "language:scala repos:>2", "sort": "joined", "name": "scala_devs"},
    {"query_suffix": "language:r repos:>2", "sort": "joined", "name": "r_devs"},
    {"query_suffix": "language:dart repos:>2", "sort": "joined", "name": "dart_devs"},
    {"query_suffix": "language:shell repos:>3", "sort": "joined", "name": "shell_devs"},

    # === AI/ML SPECIFIC (Target underrepresented) ===
    {"query_suffix": "language:jupyter+notebook repos:>1", "sort": "joined", "name": "jupyter_users"},
    {"query_suffix": "language:python machine+learning repos:>1", "sort": "followers", "name": "ml_python"},
    {"query_suffix": "language:python deep+learning repos:>1", "sort": "followers", "name": "dl_python"},
    {"query_suffix": "language:python tensorflow repos:>0", "sort": "followers", "name": "tensorflow_devs"},
    {"query_suffix": "language:python pytorch repos:>0", "sort": "followers", "name": "pytorch_devs"},
    {"query_suffix": "language:python data+science repos:>1", "sort": "joined", "name": "data_science"},

    # === DATA ENGINEER SPECIFIC ===
    {"query_suffix": "language:python spark repos:>0", "sort": "followers", "name": "spark_devs"},
    {"query_suffix": "language:scala repos:>2", "sort": "joined", "name": "scala_data"},
    {"query_suffix": "language:python airflow repos:>0", "sort": "followers", "name": "airflow_devs"},
    {"query_suffix": "language:sql repos:>2", "sort": "joined", "name": "sql_devs"},

    # === DEVOPS SPECIFIC ===
    {"query_suffix": "language:hcl repos:>1", "sort": "joined", "name": "terraform_devs"},
    {"query_suffix": "language:shell kubernetes repos:>0", "sort": "followers", "name": "k8s_devs"},
    {"query_suffix": "language:go docker repos:>0", "sort": "followers", "name": "docker_go"},
    {"query_suffix": "language:python ansible repos:>0", "sort": "followers", "name": "ansible_devs"},

    # === SECURITY SPECIFIC ===
    {"query_suffix": "language:python security repos:>0", "sort": "followers", "name": "security_python"},
    {"query_suffix": "language:go security repos:>0", "sort": "followers", "name": "security_go"},
    {"query_suffix": "language:rust repos:>2", "sort": "joined", "name": "rust_security"},

    # === MOBILE SPECIFIC ===
    {"query_suffix": "language:swift ios repos:>1", "sort": "followers", "name": "ios_swift"},
    {"query_suffix": "language:kotlin android repos:>1", "sort": "followers", "name": "android_kotlin"},
    {"query_suffix": "language:dart flutter repos:>0", "sort": "followers", "name": "flutter_devs"},

    # === FULL-STACK INDICATORS ===
    {"query_suffix": "language:javascript language:python repos:>3", "sort": "joined", "name": "js_python_fullstack"},
    {"query_suffix": "language:typescript language:go repos:>2", "sort": "joined", "name": "ts_go_fullstack"},

    # === FOLLOWER RANGES (Catch mid-tier) ===
    {"query_suffix": "repos:>3 followers:1..10", "sort": "joined", "name": "followers_1_10"},
    {"query_suffix": "repos:>3 followers:10..50", "sort": "joined", "name": "followers_10_50"},
    {"query_suffix": "repos:>2 followers:0", "sort": "repositories", "name": "no_followers"},
]

# Track which strategy/city was used last (persists across runs via DB)
class IndexerState:
    """
    Track indexer state to rotate through strategies, cities, and regions.

    PRIORITY ORDER:
    1. Europe (40% of runs) - TOP PRIORITY
    2. India (30% of runs) - Building India database
    3. Asia + Middle East + Australia (20% of runs)
    4. US (10% of runs) - Already have 65k profiles
    """

    def __init__(self):
        self.current_strategy_index = 0

        # City indices for each region
        self.us_city_index = 0
        self.india_city_index = 0
        self.europe_city_index = 0
        self.middle_east_city_index = 0
        self.asia_city_index = 0
        self.australia_city_index = 0

        # Region rotation counter
        self.run_counter = 0

        # Region configuration
        self.regions = {
            "Europe": {
                "cities": EUROPE_TARGET_CITIES,
                "city_to_country": EUROPE_CITY_TO_COUNTRY,
                "priority": 1,
            },
            "India": {
                "cities": INDIA_TARGET_CITIES,
                "city_to_country": {c: "India" for c in INDIA_TARGET_CITIES},
                "priority": 2,
            },
            "Asia": {
                "cities": ASIA_TARGET_CITIES,
                "city_to_country": ASIA_CITY_TO_COUNTRY,
                "priority": 3,
            },
            "Middle East": {
                "cities": MIDDLE_EAST_TARGET_CITIES,
                "city_to_country": MIDDLE_EAST_CITY_TO_COUNTRY,
                "priority": 3,
            },
            "Australia": {
                "cities": AUSTRALIA_TARGET_CITIES,
                "city_to_country": AUSTRALIA_CITY_TO_COUNTRY,
                "priority": 3,
            },
            "United States": {
                "cities": US_TARGET_CITIES,
                "city_to_country": {c: "United States" for c in US_TARGET_CITIES},
                "priority": 4,
            },
        }

    def get_next_region(self) -> str:
        """
        Get next region based on priority distribution.

        Distribution per 10 runs:
        - Europe: 4 runs (40%)
        - India: 3 runs (30%)
        - Asia/Middle East/Australia: 2 runs (20%)
        - US: 1 run (10%)
        """
        self.run_counter += 1
        cycle_position = self.run_counter % 10

        if cycle_position in [1, 2, 3, 4]:
            return "Europe"
        elif cycle_position in [5, 6, 7]:
            return "India"
        elif cycle_position in [8, 9]:
            # Rotate between Asia, Middle East, Australia
            sub_regions = ["Asia", "Middle East", "Australia"]
            return sub_regions[(self.run_counter // 10) % 3]
        else:  # cycle_position == 0
            return "United States"

    def get_next_cities(self, region: str, count: int = 8) -> list[str]:
        """Get next N cities for the specified region."""
        if region == "Europe":
            cities_list = EUROPE_TARGET_CITIES
            start_idx = self.europe_city_index
            self.europe_city_index = (self.europe_city_index + count) % len(cities_list)
        elif region == "India":
            cities_list = INDIA_TARGET_CITIES
            start_idx = self.india_city_index
            self.india_city_index = (self.india_city_index + count) % len(cities_list)
        elif region == "Asia":
            cities_list = ASIA_TARGET_CITIES
            start_idx = self.asia_city_index
            self.asia_city_index = (self.asia_city_index + count) % len(cities_list)
        elif region == "Middle East":
            cities_list = MIDDLE_EAST_TARGET_CITIES
            start_idx = self.middle_east_city_index
            self.middle_east_city_index = (self.middle_east_city_index + count) % len(cities_list)
        elif region == "Australia":
            cities_list = AUSTRALIA_TARGET_CITIES
            start_idx = self.australia_city_index
            self.australia_city_index = (self.australia_city_index + count) % len(cities_list)
        else:  # United States
            cities_list = US_TARGET_CITIES
            start_idx = self.us_city_index
            self.us_city_index = (self.us_city_index + count) % len(cities_list)

        cities = []
        for i in range(count):
            idx = (start_idx + i) % len(cities_list)
            cities.append(cities_list[idx])

        return cities

    def get_next_strategies(self, count: int = 5) -> list[dict]:
        """Get next N strategies to use."""
        strategies = []
        for i in range(count):
            idx = (self.current_strategy_index + i) % len(SEARCH_STRATEGIES)
            strategies.append(SEARCH_STRATEGIES[idx])
        self.current_strategy_index = (self.current_strategy_index + count) % len(SEARCH_STRATEGIES)
        return strategies

    def get_country_for_city(self, city: str, region: str) -> str:
        """Get country name for a city in a region."""
        city_lower = city.lower()
        region_config = self.regions.get(region, {})
        city_to_country = region_config.get("city_to_country", {})
        return city_to_country.get(city_lower, region)


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
    recent_date_90 = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    recent_push_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    query_suffix = query_suffix.replace("{recent_date}", recent_date_90)
    query_suffix = query_suffix.replace("{recent_date_90}", recent_date_90)
    query_suffix = query_suffix.replace("{recent_push_date}", recent_push_date)

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


def process_and_upsert_user(username: str, city: str, country_hint: str, db: Session, existing_usernames: set) -> bool:
    """Process a user and upsert to database. Returns True if new profile added."""

    # Skip if already processed this run
    if username in existing_usernames:
        return False

    # Fetch details
    details = fetch_user_details(username)
    if not details:
        return False

    # Skip organizations
    if details.get("type") == "Organization":
        return False

    # Fetch repos
    languages, total_stars, total_forks = fetch_user_repos(username)

    # Parse location - handles all regions
    location_raw = details.get("location", "")
    location_info = parse_location(location_raw) or {}

    # Determine country from location or use hint
    if location_info and location_info.get("country"):
        location_country = location_info.get("country")
        location_city = location_info.get("city", city)
        location_state = location_info.get("state")  # May be None for non-US
    else:
        # Use the hint from search
        location_country = country_hint
        location_city = city.title()
        location_state = None

    # Detect roles (multi-role detection)
    primary_role, all_roles = detect_all_roles(details.get("bio", ""), languages)

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
        location_city=location_city,
        location_state=location_state,
        location_country=location_country,
        primary_languages=languages,
        all_languages={lang: 1 for lang in languages},
        detected_role=primary_role,
        detected_roles=all_roles,
        public_repos=public_repos,
        followers=followers,
        following=details.get("following", 0),
        total_stars=total_stars,
        total_forks=total_forks,
        github_created_at=created_at,
        last_active_at=updated_at,
        developer_score=score,
        source="perpetual_indexer",
        account_type=details.get("type", "User"),
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
            "detected_role": stmt.excluded.detected_role,
            "detected_roles": stmt.excluded.detected_roles,
            "developer_score": stmt.excluded.developer_score,
            "last_active_at": stmt.excluded.last_active_at,
            "account_type": stmt.excluded.account_type,
            "updated_at": datetime.now(timezone.utc),
        }
    )

    db.execute(stmt)
    existing_usernames.add(username)
    return True


def run_perpetual_index():
    """
    Main function called by scheduler every 1 hour.
    Rotates through regions with Europe as priority.
    """
    start_time = time.time()
    logger.info("Starting perpetual indexer run...")

    db = SessionLocal()
    processed = 0
    new_profiles = 0
    db_inserts = 0

    try:
        db_existing = set(
            row[0] for row in db.query(GithubDeveloper.github_username).all()
        )
        logger.info(f"   Loaded {len(db_existing)} existing usernames from DB")

        existing_usernames = set()

        # Get region for this run (priority-based rotation)
        region = indexer_state.get_next_region()

        cities = indexer_state.get_next_cities(region, 8)
        strategies = indexer_state.get_next_strategies(5)

        logger.info(f"   🌍 Region: {region}")
        logger.info(f"   Cities: {cities}")
        logger.info(f"   Strategies: {[s['name'] for s in strategies]}")

        for city in cities:
            for strategy in strategies:
                if processed >= MAX_PROFILES_PER_RUN:
                    break

                # Get country for this city
                country_for_city = indexer_state.get_country_for_city(city, region)

                logger.info(f"   Searching {city} ({country_for_city}) with {strategy['name']}...")

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

                        # Skip organization accounts
                        if user.get("type") == "Organization":
                            continue

                        try:
                            is_new = process_and_upsert_user(username, city, country_for_city, db, existing_usernames)
                            processed += 1
                            if is_new:
                                new_profiles += 1
                                if username not in db_existing:
                                    db_inserts += 1

                            if processed % 100 == 0:
                                db.commit()
                                logger.info(f"   Processed {processed}, new (dedup): {new_profiles}, new (DB inserts): {db_inserts}")
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

    db = SessionLocal()
    try:
        total = db.query(func.count(GithubDeveloper.id)).scalar()
    finally:
        db.close()

    logger.info(f"✅ Perpetual indexer complete")
    logger.info(f"   🌍 Region: {region}")
    logger.info(f"   Processed: {processed}")
    logger.info(f"   New (in-memory dedup): {new_profiles}")
    logger.info(f"   New (actual DB inserts): {db_inserts}")
    logger.info(f"   Updated (existing): {new_profiles - db_inserts}")
    logger.info(f"   Total in DB: {total}")
    logger.info(f"   Time: {elapsed:.1f}s")


# For direct testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_perpetual_index()
