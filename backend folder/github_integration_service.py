from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from models import Profile
from datetime import datetime, timezone, timedelta
import asyncio
from github_service import (
    search_github_users_paginated,
    check_github_rate_limit
)
from github_graphql_service import (
    get_user_details_graphql as get_user_details,
    is_valid_user_data_graphql as is_valid_user_data
)
from typing import List, Dict
import logging
from redis_service import (
    get_cached_search, set_cached_search,
    get_cached_profile, set_cached_profile,
    hash_filters,
)
from archive_search_service import search_developers, count_developers, developer_to_dict, ROLE_TO_LANGUAGES

logger = logging.getLogger(__name__)


def _expand_location_terms(location):
    """Expand a location string into a list of search terms (country + cities)."""
    from filter_service import FilterService
    from filter_service import (
        COUNTRY_UNITED_STATES, COUNTRY_UNITED_KINGDOM, COUNTRY_UNITED_ARAB_EMIRATES
    )

    location_lower = location.lower().strip()
    location_terms = [location]

    # Check if this is a country with predefined cities
    for country, cities in FilterService.COUNTRY_CITIES.items():
        if location_lower == country or location_lower in country or country in location_lower:
            location_terms.extend(cities)
            break

    # Check aliases
    country_aliases = {
        "usa": COUNTRY_UNITED_STATES, "us": COUNTRY_UNITED_STATES,
        "uk": COUNTRY_UNITED_KINGDOM, "uae": COUNTRY_UNITED_ARAB_EMIRATES,
    }
    alias_country = country_aliases.get(location_lower)
    if alias_country and alias_country in FilterService.COUNTRY_CITIES:
        location_terms.append(alias_country)
        location_terms.extend(FilterService.COUNTRY_CITIES[alias_country])

    return list(set(location_terms))


class GitHubIntegrationService:
    """
    ✅ OPTIMIZED Integration layer for MVP:
    - Target: 120 profiles (reduced from 400)
    - Batch size: 25 (increased from 12)
    - No cooldown between batches
    - Early stopping at 100-120 profiles
    - Single rate limit check at start
    """
    
    @staticmethod
    async def search_and_cache_profiles(
        db: Session,
        filters: Dict,
        max_github_results: int = 250,
        target_profiles: int = 200,
        is_paid_user: bool = False
    ) -> list:
        """
        Search for developer profiles - archive database first, live API as supplement.

        New Flow:
        1. Query github_developers table (primary source)
        2. If < 500 results AND paid user, supplement with live GitHub API
        3. Return combined results sorted by score
        """
        role = filters.get("role")
        location = filters.get("location")
        min_score = filters.get("min_score", 0)

        # Map language filters to role if no explicit role
        if not role:
            languages = filters.get("languages", [])
            if languages:
                primary_lang = languages[0] if languages else None
                if primary_lang:
                    for r, langs in ROLE_TO_LANGUAGES.items():
                        if primary_lang in langs:
                            role = r
                            break

        logger.info(f"🔍 Search request: role={role}, location={location}")

        # STEP 1: Search archive database (fast, no rate limits)
        try:
            archive_results = search_developers(
                db=db,
                role=role,
                location=location,
                limit=1500,  # Fetch extra for filtering
                min_score=min_score,
            )

            total_count = count_developers(db, role, location, min_score)

            logger.info(f"Archive returned {len(archive_results)} profiles (total: {total_count})")

            # Convert to dict format
            profiles = [developer_to_dict(dev) for dev in archive_results]
        except Exception as e:
            logger.error(f"Archive search failed: {e}", exc_info=True)
            profiles = []
            total_count = 0

        # STEP 2: If we have enough from archive, return immediately
        if len(profiles) >= 500:
            logger.info(f"Archive sufficient! Returning {len(profiles)} profiles")
            return profiles[:1000]  # Cap at 1000 for performance

        # STEP 3: Fall back to old Profile table search to supplement
        logger.info(f"📦 Supplementing with Profile table cache...")
        try:
            cached_profiles = GitHubIntegrationService._search_database(db, filters)
            logger.info(f"Profile table returned {len(cached_profiles)} profiles")
        except Exception as e:
            logger.error(f"   Profile table search failed: {e}", exc_info=True)
            cached_profiles = []

        # Merge: archive dicts + Profile objects (main.py handles both types)
        seen_usernames = {p["github_username"] for p in profiles}
        for profile in cached_profiles:
            if profile.github_username not in seen_usernames:
                seen_usernames.add(profile.github_username)
                profiles.append(profile)  # Append Profile object; main.py handles both

        combined_count = len(profiles)
        logger.info(f"Combined results: {combined_count} profiles")

        # STEP 4: If still insufficient and paid user, supplement with live API
        if combined_count < 200 and is_paid_user:
            logger.info(f"🌐 Supplementing with live GitHub API for paid user...")
            language = filters.get("languages", [])
            primary_language = language[0] if language and len(language) > 0 else None
            loc = filters.get("location")
            min_repos = filters.get("min_repos", 0)

            if primary_language or loc:
                try:
                    await check_github_rate_limit()
                    new_profiles = await GitHubIntegrationService._fetch_from_github(
                        db, primary_language, loc, min_repos, max_github_results,
                        200 - combined_count
                    )
                    for p in new_profiles:
                        if p.github_username not in seen_usernames:
                            seen_usernames.add(p.github_username)
                            profiles.append(p)
                    logger.info(f"Live API added {len(new_profiles)} profiles")
                except Exception as e:
                    logger.error(f"Live API supplement failed: {e}")

        logger.info(f"Final result: {len(profiles)} profiles")
        return profiles[:target_profiles]


    @staticmethod
    def _search_database(db: Session, filters: Dict) -> List[Profile]:
        """
        Enhanced database search with increased limit
        """
        query = db.query(Profile)

        # Language filter - check BOTH primary_language AND languages_data
        languages = filters.get("languages", [])
        if languages:
            from sqlalchemy import or_, cast, String
            conditions = [Profile.primary_language.ilike(f"%{lang}%") for lang in languages]
            conditions += [cast(Profile.languages_data, String).ilike(f"%{lang}%") for lang in languages]
            query = query.filter(or_(*conditions))

        # Location filter - expand country to include all its predefined cities
        location = filters.get("location")
        if location:
            from sqlalchemy import or_
            location_terms = _expand_location_terms(location)
            location_filters = [Profile.location.ilike(f"%{term}%") for term in location_terms]
            query = query.filter(or_(*location_filters))

        # Min score filter
        min_score = filters.get("min_score", 0)
        if min_score > 0:
            query = query.filter(Profile.developer_score >= min_score)

        # Sort by score
        query = query.order_by(Profile.developer_score.desc())

        return query.limit(200).all()
    
    @staticmethod
    def _upsert_profile(db: Session, details: dict) -> Profile:
        """
        Insert a new profile or update an existing one using PostgreSQL
        ON CONFLICT DO UPDATE. Returns the Profile object.
        """
        languages = details.get("languages", {})
        primary_language = list(languages.keys())[0] if languages else None

        values = {
            "github_username": details["username"],
            "name": details.get("name"),
            "email": details.get("email"),
            "location": details.get("location"),
            "bio": details.get("bio"),
            "public_repos": details.get("public_repos", 0),
            "primary_language": primary_language,
            "contributions_last_year": details.get("contributions", 0),
            "portfolio_url": details.get("portfolio_url"),
            "avatar_url": details.get("avatar_url"),
            "total_stars": details.get("total_stars", 0),
            "languages_data": details.get("languages"),
            "top_repos": details.get("top_repos"),
            "last_active_date": details.get("last_active_date"),
            "cached_at": datetime.now(timezone.utc),
            "source": "github",
            "followers": details.get("followers", 0),
            "is_hireable": details.get("is_hireable", False),
        }

        stmt = pg_insert(Profile).values(**values)
        update_dict = {k: v for k, v in values.items() if k != "github_username"}
        stmt = stmt.on_conflict_do_update(
            index_elements=["github_username"],
            set_=update_dict,
        ).returning(Profile.__table__.c.id)

        result = db.execute(stmt)
        profile_id = result.fetchone()[0]  # Fetch before commit (cursor closes after commit with NullPool)
        db.commit()
        profile = db.query(Profile).get(profile_id)

        profile.developer_score = profile.calculate_developer_score()

        # Set refresh category based on contributions
        from profile_refresh_service import categorize_profile
        profile.refresh_category = categorize_profile(profile)

        try:
            from role_detection_service import RoleDetectionService
            profile.detected_roles = RoleDetectionService.detect_roles(profile)
            profile.roles_analyzed_at = datetime.now(timezone.utc)
        except Exception:
            profile.detected_roles = []

        db.commit()
        db.refresh(profile)
        return profile

    @staticmethod
    async def _save_batch_results(db, batch_results, new_profiles):
        """Save valid batch results using upsert, appending to new_profiles."""
        for details in batch_results:
            if isinstance(details, Exception) or not details:
                continue
            if not is_valid_user_data(details):
                continue
            try:
                profile = GitHubIntegrationService._upsert_profile(db, details)
                new_profiles.append(profile)
                await set_cached_profile(details['username'], details, details.get('contributions', 0))
                logger.info(f"Upserted {details['username']}: Score {profile.developer_score}")
            except Exception as e:
                logger.error(f"❌ Failed to upsert {details.get('username', 'unknown')}: {e}")
                db.rollback()

    @staticmethod
    def _filter_uncached_usernames(db, usernames, process_limit):
        """Return usernames not already cached within last 30 days."""
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        existing_rows = db.query(Profile.github_username).filter(
            Profile.github_username.in_(usernames[:process_limit]),
            Profile.cached_at >= thirty_days_ago
        ).all()
        existing_usernames = {row[0] for row in existing_rows}

        if existing_usernames:
            logger.info(f"Skipping {len(existing_usernames)} already cached profiles")

        return [u for u in usernames[:process_limit] if u not in existing_usernames]

    @staticmethod
    async def _fetch_from_github(
        db: Session,
        language: str,
        location: str,
        min_repos: int,
        max_results: int,
        profiles_needed: int = 120
    ) -> List[Profile]:
        """
        Fetch profiles from GitHub with batching and early stopping.
        """
        BATCH_SIZE = 25

        try:
            logger.info(f"Searching GitHub: language={language}, location={location}")
            users = await search_github_users_paginated(
                language=language,
                location=location,
                min_repos=min_repos,
                max_pages=5,
                target_users=min(250, max_results)
            )

            if not users:
                logger.info("No users found from GitHub")
                return []

            usernames = [user["login"] for user in users[:max_results]]
            logger.info(f"Found {len(usernames)} GitHub users")

            process_limit = min(250, len(usernames))
            logger.info(f"Processing up to {process_limit} profiles...")

            usernames_to_fetch = GitHubIntegrationService._filter_uncached_usernames(
                db, usernames, process_limit
            )

            if not usernames_to_fetch:
                logger.info("All profiles already in cache")
                return []

            logger.info(f"Fetching {len(usernames_to_fetch)} new profiles...")
            new_profiles = []

            for batch_start in range(0, len(usernames_to_fetch), BATCH_SIZE):
                batch_usernames = usernames_to_fetch[batch_start:batch_start + BATCH_SIZE]
                logger.info(f"Batch {batch_start//BATCH_SIZE + 1} ({len(batch_usernames)} profiles)...")

                async def _fetch_staggered(username, index):
                    """Stagger request starts by 0.2s to avoid burst."""
                    await asyncio.sleep(index * 0.2)
                    return await get_user_details(username)

                tasks = []
                for i, u in enumerate(batch_usernames):
                    cached = await get_cached_profile(u)
                    if cached is not None:
                        logger.info(f"Profile cache hit for {u}")
                        continue
                    tasks.append(_fetch_staggered(u, i))
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)

                await GitHubIntegrationService._save_batch_results(db, batch_results, new_profiles)

                if len(new_profiles) >= profiles_needed:
                    logger.info(f"Target reached! Stopping at {len(new_profiles)} profiles.")
                    break

            return new_profiles

        except Exception as e:
            logger.error(f"❌ GitHub fetch failed: {e}", exc_info=True)
            logger.error(f"GitHub API Error: {e}")
            return []