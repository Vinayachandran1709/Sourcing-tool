from sqlalchemy.orm import Session
from sqlalchemy import or_
from models import Profile, ProfileView, SearchHistory
from datetime import datetime, timedelta, timezone  # ⭐ ADD timezone
import logging

logger = logging.getLogger(__name__)

class ProfileCacheService:
    """Handles profile caching and smart search"""
    
    @staticmethod
    def save_profiles_to_db(db: Session, profiles_data: list) -> list:
        """
        Save multiple profiles to database, avoiding duplicates.
        
        Args:
            db: Database session
            profiles_data: List of profile dictionaries from GitHub
        
        Returns:
            List of saved Profile objects
        """
        saved_profiles = []
        updated_count = 0
        new_count = 0
        
        for profile_data in profiles_data:
            username = profile_data.get("username")
            
            # Check if exists
            existing = db.query(Profile).filter(
                Profile.github_username == username
            ).first()
            
            if existing:
                # Update existing profile
                existing.name = profile_data.get("name")
                existing.email = profile_data.get("email")
                existing.location = profile_data.get("location")
                existing.bio = profile_data.get("bio")
                existing.public_repos = profile_data.get("public_repos", 0)
                existing.contributions_last_year = profile_data.get("contributions", 0)
                existing.total_stars = profile_data.get("total_stars", 0)
                existing.last_active_date = profile_data.get("last_active_date")
                existing.languages_data = profile_data.get("languages")
                existing.top_repos = profile_data.get("top_repos")
                existing.avatar_url = profile_data.get("avatar_url")
                existing.portfolio_url = profile_data.get("portfolio_url")
                
                # ✅ FIXED: Replace datetime.utcnow() with datetime.now(timezone.utc)
                existing.cached_at = datetime.now(timezone.utc)
                existing.last_fetched = datetime.now(timezone.utc)
                
                # Recalculate score
                existing.developer_score = existing.calculate_developer_score()
                
                db.commit()
                db.refresh(existing)
                saved_profiles.append(existing)
                updated_count += 1
                
            else:
                # Create new profile
                new_profile = Profile(
                    github_username=username,
                    name=profile_data.get("name"),
                    email=profile_data.get("email"),
                    location=profile_data.get("location"),
                    bio=profile_data.get("bio"),
                    public_repos=profile_data.get("public_repos", 0),
                    primary_language=profile_data.get("languages", {}).get(list(profile_data.get("languages", {}).keys())[0] if profile_data.get("languages") else None),
                    contributions_last_year=profile_data.get("contributions", 0),
                    total_stars=profile_data.get("total_stars", 0),
                    last_active_date=profile_data.get("last_active_date"),
                    languages_data=profile_data.get("languages"),
                    top_repos=profile_data.get("top_repos"),
                    avatar_url=profile_data.get("avatar_url"),
                    portfolio_url=profile_data.get("portfolio_url"),
                    
                    # ✅ FIXED: Replace datetime.utcnow() with datetime.now(timezone.utc)
                    cached_at=datetime.now(timezone.utc),
                    last_fetched=datetime.now(timezone.utc),
                    source="github"
                )
                
                # Calculate score
                new_profile.developer_score = new_profile.calculate_developer_score()
                
                db.add(new_profile)
                db.commit()
                db.refresh(new_profile)
                saved_profiles.append(new_profile)
                new_count += 1
        
        logger.info(f"Saved {new_count} new profiles, updated {updated_count} existing profiles")
        return saved_profiles
    
    @staticmethod
    def search_cached_profiles(db: Session, filters: dict) -> list:
        """
        Search profiles in database matching filters.
        Only returns profiles cached in last 30 days (fresh data).
        """
        query = db.query(Profile)
        
        # ✅ FIXED: Only use recent cache (30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        query = query.filter(Profile.cached_at >= thirty_days_ago)
        
        # Apply language filter
        if filters.get("language"):
            query = query.filter(Profile.primary_language.ilike(f"%{filters['language']}%"))
        
        # Apply location filter
        if filters.get("location"):
            query = query.filter(Profile.location.ilike(f"%{filters['location']}%"))
        
        # Apply min_repos filter
        if filters.get("min_repos") and filters["min_repos"] > 0:
            query = query.filter(Profile.public_repos >= filters["min_repos"])
        
        # Order by score
        query = query.order_by(Profile.developer_score.desc())
        
        results = query.limit(500).all()
        logger.info(f"Found {len(results)} cached profiles matching filters")
        return results
    
    @staticmethod
    def merge_and_deduplicate(cached_profiles: list, github_profiles: list) -> list:
        """
        Merge cached + GitHub profiles, remove duplicates.
        Prefer cached profiles (already have calculated scores).
        """
        merged = {}
        
        # Add cached profiles first (priority)
        for profile in cached_profiles:
            merged[profile.github_username] = profile
        
        # Add GitHub profiles (only if not already in cache)
        for profile in github_profiles:
            username = profile.github_username
            if username not in merged:
                merged[username] = profile
        
        result = list(merged.values())
        logger.info(f"Merged result: {len(result)} unique profiles")
        return result
    
    @staticmethod
    def log_search(db: Session, filters: dict, profiles_found: int):
        """Log search history"""
        search_log = SearchHistory(
            filters=filters,
            profiles_found=profiles_found
            # ✅ REMOVED: Don't manually set searched_at, let database handle it
        )
        db.add(search_log)
        db.commit()
    
    @staticmethod
    def log_profile_views(db: Session, profile_ids: list):
        """Log that profiles were viewed in search results"""
        for profile_id in profile_ids:
            view = ProfileView(
                profile_id=profile_id
                # ✅ REMOVED: Don't manually set viewed_at, let database handle it
            )
            db.add(view)
        try:
            db.commit()
        except:
            db.rollback()  # Ignore duplicate view logs