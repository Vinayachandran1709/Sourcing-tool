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
        target_profiles: int = 200,  # ✅ OPTIMIZATION #2: Target 120 profiles for MVP
        is_paid_user: bool = False
    ) -> List[Profile]:
        """
        ✅ OPTIMIZED: Cache-first architecture with aggressive early stopping
        
        Target: Return 100-120 profiles in under 2 minutes
        """
        
        logger.info(f"🔍 SEARCH STARTED (TARGET: {target_profiles} profiles)")
        logger.info(f"   Filters: {filters}")
        
        # ✅ OPTIMIZATION #1: Check rate limit ONCE at start
        try:
            await check_github_rate_limit()
        except Exception as e:
            logger.warning(f"Rate limit check failed: {e}")

        # ===== STEP 0: Check Redis search cache =====
        filter_hash = hash_filters(filters)
        cached_usernames = await get_cached_search(filter_hash)
        if cached_usernames is not None:
            logger.info("Redis cache hit for search")
            return db.query(Profile).filter(Profile.github_username.in_(cached_usernames)).all()

        # ===== STEP 1: Search database cache FIRST =====
        logger.info("📦 Searching database cache...")
        try:
            cached_profiles = GitHubIntegrationService._search_database(db, filters)
            logger.info(f"   ✅ Found {len(cached_profiles)} cached profiles")
            print(f"   ✅ Found {len(cached_profiles)} cached profiles")
        except Exception as e:
            logger.error(f"   ❌ Database search failed: {e}", exc_info=True)
            print(f"   ❌ Database search failed: {e}")
            cached_profiles = []
        
        # ===== TIERED SEARCH: Gate GitHub fetch for free users =====
        if len(cached_profiles) < 20 and not is_paid_user:
            logger.info(f"Free user search — returning DB results only ({len(cached_profiles)} profiles)")
            return cached_profiles

        # ✅ Check if we have enough cached profiles
        if len(cached_profiles) >= target_profiles:
            logger.info(f"   ✅ Cache sufficient! Returning {len(cached_profiles)} profiles")
            print(f"   ✅ Cache sufficient! Returning {len(cached_profiles)} profiles (no GitHub fetch needed)")
            return cached_profiles[:target_profiles]
        
        # ===== STEP 2: Fetch ONLY if cache insufficient =====
        profiles_needed = target_profiles - len(cached_profiles)
        logger.info(f"🌐 Need {profiles_needed} more profiles from GitHub...")
        print(f"🌐 Need {profiles_needed} more profiles from GitHub API...")
        
        language = filters.get("languages", [])
        primary_language = language[0] if language and len(language) > 0 else None
        location = filters.get("location")
        min_repos = filters.get("min_repos", 0)
        
        if not primary_language and not location:
            logger.warning("   ⚠️ No language or location specified, cannot fetch from GitHub")
            print("   ⚠️ No language or location specified, returning cached results only")
            return cached_profiles
        
        # Fetch from GitHub
        try:
            from github_service import GITHUB_TOKEN
            if not GITHUB_TOKEN:
                logger.error("⚠️ GITHUB_TOKEN not found in .env!")
                print("⚠️ WARNING: GITHUB_TOKEN missing - only using database cache")
                return cached_profiles
            
            new_profiles = await GitHubIntegrationService._fetch_from_github(
                db, primary_language, location, min_repos, max_github_results,
                profiles_needed
            )
            logger.info(f"   ✅ Fetched and cached {len(new_profiles)} new profiles")
            print(f"   ✅ Fetched and cached {len(new_profiles)} new profiles")
        except Exception as e:
            logger.error(f"   ❌ GitHub fetch failed: {e}", exc_info=True)
            print(f"   ❌ GitHub fetch failed: {e}")
            new_profiles = []
        
        # ===== STEP 3: Combine results =====
        all_profiles = cached_profiles + new_profiles
        
        # Remove duplicates (prefer cached versions)
        seen_usernames = set()
        unique_profiles = []
        
        for profile in all_profiles:
            if profile.github_username not in seen_usernames:
                seen_usernames.add(profile.github_username)
                unique_profiles.append(profile)
        
        logger.info(f"✅ Total unique profiles: {len(unique_profiles)}")
        logger.info(f"   - From cache: {len(cached_profiles)}")
        logger.info(f"   - From GitHub: {len(new_profiles)}")
        
        print(f"\n✅ Total unique profiles: {len(unique_profiles)}")
        print(f"   - From cache: {len(cached_profiles)}")
        print(f"   - From GitHub: {len(new_profiles)}")
        
        await set_cached_search(filter_hash, [p.github_username for p in unique_profiles])
        return unique_profiles[:target_profiles]


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
        db.commit()

        profile_id = result.fetchone()[0]
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
                print(f"   ✅ {details['username']}: Score {profile.developer_score}")
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
            print(f"   ⏭️  Skipping {len(existing_usernames)} already cached profiles")

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
            print(f"   Searching GitHub: language={language}, location={location}")
            users = await search_github_users_paginated(
                language=language,
                location=location,
                min_repos=min_repos,
                max_pages=5,
                target_users=min(250, max_results)
            )

            if not users:
                print("   ⚠️ No users found from GitHub")
                return []

            usernames = [user["login"] for user in users[:max_results]]
            print(f"   Found {len(usernames)} GitHub users")

            process_limit = min(250, len(usernames))
            print(f"   Processing up to {process_limit} profiles...")

            usernames_to_fetch = GitHubIntegrationService._filter_uncached_usernames(
                db, usernames, process_limit
            )

            if not usernames_to_fetch:
                print(f"   ✅ All profiles already in cache!")
                return []

            print(f"   📥 Fetching {len(usernames_to_fetch)} new profiles...")
            new_profiles = []

            for batch_start in range(0, len(usernames_to_fetch), BATCH_SIZE):
                batch_usernames = usernames_to_fetch[batch_start:batch_start + BATCH_SIZE]
                print(f"\n   🔄 Batch {batch_start//BATCH_SIZE + 1} ({len(batch_usernames)} profiles)...")

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
                    print(f"\n   ✅ Target reached! Stopping at {len(new_profiles)} profiles.")
                    break

            return new_profiles

        except Exception as e:
            logger.error(f"❌ GitHub fetch failed: {e}", exc_info=True)
            print(f"❌ GitHub API Error: {e}")
            return []