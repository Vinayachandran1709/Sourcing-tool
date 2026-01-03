from sqlalchemy.orm import Session
from models import Profile
from datetime import datetime, timezone
import asyncio
from github_service import (
    search_github_users_paginated,
    get_user_details,
    is_valid_user_data
)
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class GitHubIntegrationService:
    """
    Integration layer that:
    1. Searches cached profiles in database
    2. Fetches new profiles from GitHub API
    3. Caches new profiles
    4. Returns combined results
    """
    
    @staticmethod
    async def search_and_cache_profiles(
        db: Session,
        filters: Dict,
        max_github_results: int = 150,
        target_profiles: int = 200  # ✅ FIX #3: Target minimum
    ) -> List[Profile]:
        """
        ✅ FIX #3: CACHE-FIRST ARCHITECTURE
        
        1. Query database first
        2. Only fetch from GitHub if cache < target
        3. Return cached results immediately
        """
        
        logger.info(f"🔍 HYBRID SEARCH STARTED (TARGET: {target_profiles} profiles)")
        logger.info(f"   Filters: {filters}")
        
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
        
        # ✅ FIX #3: Check if we have enough cached profiles
        if len(cached_profiles) >= target_profiles:
            logger.info(f"   ✅ Cache sufficient! Returning {len(cached_profiles)} profiles")
            print(f"   ✅ Cache sufficient! Returning {len(cached_profiles)} profiles (no GitHub fetch needed)")
            return cached_profiles[:target_profiles]  # Return target amount
        
        # ===== STEP 2: Fetch ONLY if cache insufficient =====
        profiles_needed = target_profiles - len(cached_profiles)
        logger.info(f"🌐 Cache insufficient. Fetching {profiles_needed} more from GitHub...")
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
            # ✅ VALIDATE: Check if GitHub token exists
            from github_service import GITHUB_TOKEN
            if not GITHUB_TOKEN:
                logger.error("⚠️ GITHUB_TOKEN not found in .env! GitHub API will fail.")
                print("⚠️ WARNING: GITHUB_TOKEN missing - only using database cache")
                return cached_profiles
            
            new_profiles = await GitHubIntegrationService._fetch_from_github(
                db, primary_language, location, min_repos, max_github_results
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
        
        # ✅ FIX #3: Return target amount
        return unique_profiles[:target_profiles]


    @staticmethod
    def _search_database(db: Session, filters: Dict) -> List[Profile]:
        """
        ✅ FIX #3: Enhanced database search
        Search more aggressively to reduce GitHub API dependency
        """
        query = db.query(Profile)
        
        # Language filter - check BOTH primary_language AND languages_data
        languages = filters.get("languages", [])
        if languages:
            from sqlalchemy import or_, cast, String
            
            # Build conditions for both fields
            conditions = []
            
            # Check primary_language
            for lang in languages:
                conditions.append(Profile.primary_language.ilike(f"%{lang}%"))
            
            # Check languages_data JSON field
            for lang in languages:
                # SQLite/PostgreSQL JSON search
                conditions.append(cast(Profile.languages_data, String).ilike(f"%{lang}%"))
            
            query = query.filter(or_(*conditions))
        
        # Location filter - more flexible matching
        location = filters.get("location")
        if location:
            query = query.filter(Profile.location.ilike(f"%{location}%"))
        
        # Min score filter
        min_score = filters.get("min_score", 0)
        if min_score > 0:
            query = query.filter(Profile.developer_score >= min_score)
        
        # Sort by score
        query = query.order_by(Profile.developer_score.desc())
        
        # ✅ FIX #3: Increase limit to fetch more from cache
        return query.limit(300).all()  # Was 100, now 300    
    
    @staticmethod
    async def _fetch_from_github(
        db: Session,
        language: str,
        location: str,
        min_repos: int,
        max_results: int
    ) -> List[Profile]:
        """
        Fetch new profiles from GitHub and cache them
        
        ✅ FIX #6: Enhanced error handling with try/except for profile saving
        """
        
        try:
            # Search GitHub
            print(f"   Searching GitHub: language={language}, location={location}")
            users = await search_github_users_paginated(
                language=language,
                location=location,
                min_repos=min_repos,
                max_pages=6,  # ✅ OPTIMIZED: 6 pages = 180 users
                target_users=min(180, max_results)  # ✅ EARLY STOPPING
            )            
            
            if not users:
                print("   ⚠️ No users found from GitHub")
                return []
            
            # Get usernames
            usernames = [user["login"] for user in users[:max_results]]
            print(f"   Found {len(usernames)} GitHub users")
            
            # Fetch detailed profiles
            print(f"   Fetching detailed profiles...")
            new_profiles = []
            
            # ✅ INCREASED LIMIT: Process up to 50 profiles (was 20)
            process_limit = min(150, len(usernames))  # ✅ Process up to 150
            print(f"   Processing {process_limit} profiles...")
            
            # ✅ FIX: PARALLEL PROCESSING - Process 8 profiles simultaneously
            BATCH_SIZE = 8  # Process 8 profiles at once
            
            # Helper function to process single profile
            async def process_single_profile(username: str, index: int):
                try:
                    # Check if already in database
                    existing = db.query(Profile).filter(
                        Profile.github_username == username
                    ).first()
                    
                    if existing:
                        print(f"   [{index}/{process_limit}] {username} - cached")
                        return None
                    
                    print(f"   [{index}/{process_limit}] {username}...", end=" ")
                    
                    # Fetch full details
                    details = await get_user_details(username)
                    
                    if not details:
                        print("❌")
                        return None
                    
                    if not is_valid_user_data(details):
                        print("⏭️")
                        return None
                    
                    # Create Profile object
                    profile = Profile(
                        github_username=details["username"],
                        name=details.get("name"),
                        email=details.get("email"),
                        location=details.get("location"),
                        bio=details.get("bio"),
                        public_repos=details.get("public_repos", 0),
                        primary_language=list(details.get("languages", {}).keys())[0] if details.get("languages") else None,
                        contributions_last_year=details.get("contributions", 0),
                        portfolio_url=details.get("portfolio_url"),
                        avatar_url=details.get("avatar_url"),
                        total_stars=details.get("total_stars", 0),
                        languages_data=details.get("languages"),
                        top_repos=details.get("top_repos"),
                        last_active_date=details.get("last_active_date"),
                        cached_at=datetime.now(timezone.utc),
                        source="github"
                    )
                    
                    # Calculate score
                    profile.developer_score = profile.calculate_developer_score()
                    
                    # Detect roles
                    try:
                        from role_detection_service import RoleDetectionService
                        profile.detected_roles = RoleDetectionService.detect_roles(profile)
                        profile.roles_analyzed_at = datetime.now(timezone.utc)
                    except:
                        profile.detected_roles = []
                    
                    # Save to database
                    try:
                        db.add(profile)
                        db.commit()
                        db.refresh(profile)
                        
                        logger.info(f"✅ Saved {username}: Score {profile.developer_score}")
                        print(f"✅ {profile.developer_score}")
                        return profile
                    except Exception as save_error:
                        logger.error(f"❌ Failed to save {username}: {save_error}")
                        print(f"❌")
                        db.rollback()
                        return None
                        
                except Exception as e:
                    print(f"❌")
                    logger.error(f"Error processing {username}: {e}")
                    db.rollback()
                    return None
            
            # Process profiles in parallel batches
            for batch_start in range(0, process_limit, BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, process_limit)
                batch_usernames = usernames[batch_start:batch_end]
                
                print(f"\n   🔄 Processing batch {batch_start//BATCH_SIZE + 1} ({len(batch_usernames)} profiles)...")
                
                # Process batch in parallel
                tasks = [
                    process_single_profile(username, batch_start + i + 1)
                    for i, username in enumerate(batch_usernames)
                ]
                
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Collect successful profiles
                for result in batch_results:
                    if result and not isinstance(result, Exception):
                        new_profiles.append(result)
                
                # Early stopping if we have enough
                if len(new_profiles) >= profiles_needed:
                    print(f"\n   ✅ Target reached! Stopping early.")
                    break
                
                # Short cooldown between batches (not between individual profiles)
                await asyncio.sleep(0.5)
            
            return new_profiles            
        except Exception as e:
            logger.error(f"❌ GitHub fetch failed: {e}", exc_info=True)
            print(f"❌ GitHub API Error: {e}")
            print(f"   Falling back to database cache only")
            # Don't return empty - let the hybrid search continue with cache
            return []