from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from models import Profile
from datetime import datetime, timezone, timedelta
import asyncio
from github_service import (
    search_github_users_paginated,
    get_user_details,
    is_valid_user_data,
    check_github_rate_limit
)
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


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
        target_profiles: int = 200  # ✅ OPTIMIZATION #2: Target 120 profiles for MVP
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
            
            conditions = []
            
            for lang in languages:
                conditions.append(Profile.primary_language.ilike(f"%{lang}%"))
            
            for lang in languages:
                conditions.append(cast(Profile.languages_data, String).ilike(f"%{lang}%"))
            
            query = query.filter(or_(*conditions))
        
        # Location filter - expand country to include all its predefined cities
        location = filters.get("location")
        if location:
            from sqlalchemy import or_
            from filter_service import FilterService

            location_lower = location.lower().strip()
            location_terms = [location]

            # Check if this is a country with predefined cities
            for country, cities in FilterService.COUNTRY_CITIES.items():
                if location_lower == country or location_lower in country or country in location_lower:
                    location_terms.extend(cities)
                    break

            # Check aliases
            COUNTRY_ALIASES = {
                "usa": "united states", "us": "united states",
                "uk": "united kingdom", "uae": "united arab emirates",
            }
            alias_country = COUNTRY_ALIASES.get(location_lower)
            if alias_country and alias_country in FilterService.COUNTRY_CITIES:
                location_terms.append(alias_country)
                location_terms.extend(FilterService.COUNTRY_CITIES[alias_country])

            location_terms = list(set(location_terms))
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
    async def _fetch_from_github(
        db: Session,
        language: str,
        location: str,
        min_repos: int,
        max_results: int,
        profiles_needed: int = 120
    ) -> List[Profile]:
        """
        ✅ OPTIMIZED: Fetch profiles from GitHub with aggressive optimizations
        
        Optimizations:
        - Batch size: 25 (was 12)
        - No cooldown between batches (was 0.3s)
        - Process limit: 150 (was 300)
        - Early stopping at target
        """
        
        try:
            # Search GitHub
            print(f"   Searching GitHub: language={language}, location={location}")
            users = await search_github_users_paginated(
                language=language,
                location=location,
                min_repos=min_repos,
                max_pages=5,  # ✅ Reduced from 12
                target_users=min(250, max_results)  # ✅ Reduced from 300
            )
            
            if not users:
                print("   ⚠️ No users found from GitHub")
                return []
            
            # Get usernames
            usernames = [user["login"] for user in users[:max_results]]
            print(f"   Found {len(usernames)} GitHub users")
            
            # ✅ OPTIMIZATION #7: Process up to 150 profiles (was 300)
            process_limit = min(250, len(usernames))
            print(f"   Processing up to {process_limit} profiles...")
            
            # ✅ OPTIMIZATION #4: Batch size 25 (was 12)
            BATCH_SIZE = 25
            
            # ✅ Filter out existing usernames (only skip profiles cached within last 30 days)
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            existing_usernames = set(
                db.query(Profile.github_username)
                .filter(
                    Profile.github_username.in_(usernames[:process_limit]),
                    Profile.cached_at >= thirty_days_ago
                )
                .all()
            )
            existing_usernames = {username[0] for username in existing_usernames}
            usernames_to_fetch = [u for u in usernames[:process_limit] if u not in existing_usernames]
            
            if existing_usernames:
                print(f"   ⏭️  Skipping {len(existing_usernames)} already cached profiles")
            
            if not usernames_to_fetch:
                print(f"   ✅ All profiles already in cache!")
                return []
            
            print(f"   📥 Fetching {len(usernames_to_fetch)} new profiles...")
            
            new_profiles = []
            
            # Process profiles in parallel batches
            for batch_start in range(0, len(usernames_to_fetch), BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, len(usernames_to_fetch))
                batch_usernames = usernames_to_fetch[batch_start:batch_end]
                
                print(f"\n   🔄 Batch {batch_start//BATCH_SIZE + 1} ({len(batch_usernames)} profiles)...")
                
                # Process batch in parallel
                tasks = [get_user_details(username) for username in batch_usernames]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Save profiles using upsert
                for i, details in enumerate(batch_results):
                    if isinstance(details, Exception) or not details:
                        continue

                    if not is_valid_user_data(details):
                        continue

                    try:
                        profile = GitHubIntegrationService._upsert_profile(db, details)
                        new_profiles.append(profile)
                        print(f"   ✅ {details['username']}: Score {profile.developer_score}")
                    except Exception as e:
                        logger.error(f"❌ Failed to upsert {details.get('username', 'unknown')}: {e}")
                        db.rollback()
                
                # ✅ OPTIMIZATION #7: Early stopping
                if len(new_profiles) >= profiles_needed:
                    print(f"\n   ✅ Target reached! Stopping at {len(new_profiles)} profiles.")
                    break
                
                # ✅ OPTIMIZATION #5: NO COOLDOWN (was 0.3s)
                # GitHub rate limit: 5000/hour = safe without cooldown
            
            return new_profiles
            
        except Exception as e:
            logger.error(f"❌ GitHub fetch failed: {e}", exc_info=True)
            print(f"❌ GitHub API Error: {e}")
            return []