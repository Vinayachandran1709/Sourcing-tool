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
        max_github_results: int = 50
    ) -> List[Profile]:
        """
        Main search function that combines database cache + GitHub API
        
        ✅ FIX #4: Enhanced logging throughout the search process
        """
        
        logger.info(f"🔍 HYBRID SEARCH STARTED")
        logger.info(f"   Filters: {filters}")
        
        # ===== STEP 1: Search database cache =====
        logger.info("📦 Searching database cache...")
        try:
            cached_profiles = GitHubIntegrationService._search_database(db, filters)
            logger.info(f"   ✅ Found {len(cached_profiles)} cached profiles")
            print(f"   ✅ Found {len(cached_profiles)} cached profiles")
        except Exception as e:
            logger.error(f"   ❌ Database search failed: {e}", exc_info=True)
            print(f"   ❌ Database search failed: {e}")
            cached_profiles = []
        
        # ===== STEP 2: Fetch new profiles from GitHub =====
        logger.info("🌐 Fetching new profiles from GitHub API...")
        
        language = filters.get("languages", [])
        primary_language = language[0] if language and len(language) > 0 else None
        location = filters.get("location")
        min_repos = filters.get("min_repos", 0)
        
        if not primary_language and not location:
            logger.warning("   ⚠️ No language or location specified, skipping GitHub search")
            print("   ⚠️ No language or location specified, skipping GitHub search")
            return cached_profiles
        
        # Fetch from GitHub
        try:
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
        
        return unique_profiles    
    
    @staticmethod
    def _search_database(db: Session, filters: Dict) -> List[Profile]:
        """Search existing cached profiles"""
        query = db.query(Profile)
        
        # Language filter
        languages = filters.get("languages", [])
        if languages:
            from sqlalchemy import or_
            language_conditions = [
                Profile.primary_language.ilike(f"%{lang}%") for lang in languages
            ]
            query = query.filter(or_(*language_conditions))
        
        # Location filter
        location = filters.get("location")
        if location:
            query = query.filter(Profile.location.ilike(f"%{location}%"))
        
        # Min score filter
        min_score = filters.get("min_score", 0)
        if min_score > 0:
            query = query.filter(Profile.developer_score >= min_score)
        
        # Sort by score
        query = query.order_by(Profile.developer_score.desc())
        
        return query.limit(100).all()
    
    
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
                max_pages=2  # 2 pages = 60 users max
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
            
            for i, username in enumerate(usernames[:20], 1):  # Limit to 20 for speed
                try:
                    # Check if already in database
                    existing = db.query(Profile).filter(
                        Profile.github_username == username
                    ).first()
                    
                    if existing:
                        print(f"   [{i}/{len(usernames[:20])}] {username} - already cached")
                        continue
                    
                    print(f"   [{i}/{len(usernames[:20])}] {username}...", end=" ")
                    
                    # Fetch full details
                    details = await get_user_details(username)
                    
                    if not details:
                        print("❌ Failed")
                        continue
                    
                    if not is_valid_user_data(details):
                        print("⏭️ Invalid")
                        continue
                    
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
                    
                    # NEW: Detect roles
                    from role_detection_service import RoleDetectionService
                    profile.detected_roles = RoleDetectionService.detect_roles(profile)
                    profile.roles_analyzed_at = datetime.now(timezone.utc)
                                        
                    # ✅ FIX #6: Wrap database save in try/except with detailed logging
                    try:
                        db.add(profile)
                        db.commit()
                        db.refresh(profile)
                        
                        new_profiles.append(profile)
                        logger.info(f"✅ Saved {username}: Score {profile.developer_score}")
                        print(f"✅ Score: {profile.developer_score}")
                    except Exception as save_error:
                        logger.error(f"❌ Failed to save {username}: {save_error}")
                        print(f"❌ Save failed: {save_error}")
                        db.rollback()
                        continue
                    
                    # Rate limit protection
                    if i % 5 == 0:
                        print(f"   💤 Cooling down...")
                        await asyncio.sleep(2)
                    
                except Exception as e:
                    print(f"❌ Error: {e}")
                    logger.error(f"Error processing {username}: {e}", exc_info=True)
                    db.rollback()
                    continue
            
            return new_profiles
            
        except Exception as e:
            logger.error(f"GitHub fetch failed: {e}", exc_info=True)
            return []