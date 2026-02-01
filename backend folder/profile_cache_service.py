from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from models import Profile
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

class ProfileCacheService:
    """Handles profile caching and smart search"""
    
    @staticmethod
    def save_profiles_to_db(db: Session, profiles_data: list) -> list:
        """
        Save multiple profiles to database using PostgreSQL upsert.
        Guarantees no duplicates via ON CONFLICT DO UPDATE.

        Args:
            db: Database session
            profiles_data: List of profile dictionaries from GitHub

        Returns:
            List of saved Profile objects
        """
        if not profiles_data:
            return []

        saved_profiles = []

        for profile_data in profiles_data:
            username = profile_data.get("username")
            if not username:
                continue

            languages = profile_data.get("languages", {})
            primary_language = list(languages.keys())[0] if languages else None

            values = {
                "github_username": username,
                "name": profile_data.get("name"),
                "email": profile_data.get("email"),
                "location": profile_data.get("location"),
                "bio": profile_data.get("bio"),
                "public_repos": profile_data.get("public_repos", 0),
                "primary_language": primary_language,
                "contributions_last_year": profile_data.get("contributions", 0),
                "total_stars": profile_data.get("total_stars", 0),
                "last_active_date": profile_data.get("last_active_date"),
                "languages_data": profile_data.get("languages"),
                "top_repos": profile_data.get("top_repos"),
                "avatar_url": profile_data.get("avatar_url"),
                "portfolio_url": profile_data.get("portfolio_url"),
                "cached_at": datetime.now(timezone.utc),
                "last_fetched": datetime.now(timezone.utc),
                "source": "github",
            }

            stmt = pg_insert(Profile).values(**values)
            update_dict = {k: v for k, v in values.items() if k != "github_username"}
            stmt = stmt.on_conflict_do_update(
                index_elements=["github_username"],
                set_=update_dict,
            ).returning(Profile.__table__.c.id)

            try:
                result = db.execute(stmt)
                db.flush()
                profile_id = result.fetchone()[0]
                profile = db.query(Profile).get(profile_id)
                profile.developer_score = profile.calculate_developer_score()
                saved_profiles.append(profile)
            except Exception as e:
                logger.error(f"Failed to upsert {username}: {e}")
                db.rollback()

        db.commit()
        for p in saved_profiles:
            db.refresh(p)

        logger.info(f"Upserted {len(saved_profiles)} profiles")
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
    
    #@staticmethod
    #def log_search(db: Session, filters: dict, profiles_found: int):
     #   """Log search history"""
      #  search_log = SearchHistory(
       #     filters=filters,
        #    profiles_found=profiles_found
         #   # ✅ REMOVED: Don't manually set searched_at, let database handle it
        #)
        #db.add(search_log)
        #db.commit()
    
   # @staticmethod
    #def log_profile_views(db: Session, profile_ids: list):
     #   """Log that profiles were viewed in search results"""
      #  for profile_id in profile_ids:
       #     view = ProfileView(
        #        profile_id=profile_id
         #       # ✅ REMOVED: Don't manually set viewed_at, let database handle it
          #  )
           # db.add(view)
        #try:
         #   db.commit()
        #except:
         #   db.rollback()  # Ignore duplicate view logs