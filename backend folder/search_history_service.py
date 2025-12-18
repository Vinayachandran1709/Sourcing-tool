from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import SearchHistory, ProfileView, Profile, User
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

class SearchHistoryService:
    """Handle search history and profile view tracking"""
    
    @staticmethod
    def save_search(
        db: Session,
        user_id: int,
        search_params: Dict,
        results_count: int,
        top_profile_id: Optional[int] = None
    ) -> SearchHistory:
        """
        Save search to history with full parameters
        
        Args:
            user_id: User performing search
            search_params: Complete search parameters dict
            results_count: Number of results returned
            top_profile_id: ID of top result (optional)
        """
        
        search_history = SearchHistory(
            user_id=user_id,
            search_type=search_params.get("search_type", "general"),
            keywords=search_params.get("keywords"),
            role=search_params.get("role"),
            location=search_params.get("location"),
            min_followers=search_params.get("min_followers"),
            min_repos=search_params.get("min_repos"),
            languages=search_params.get("languages", []),
            frameworks=search_params.get("frameworks", []),
            min_score=search_params.get("min_score"),
            results_count=results_count,
            top_profile_id=top_profile_id
        )
        
        db.add(search_history)
        db.commit()
        db.refresh(search_history)
        
        return search_history
    
    @staticmethod
    def get_user_search_history(
        db: Session,
        user_id: int,
        limit: int = 50,
        days: Optional[int] = None
    ) -> List[SearchHistory]:
        """
        Get user's search history
        
        Args:
            user_id: User ID
            limit: Number of searches to return
            days: Filter to last N days (optional)
        """
        
        query = db.query(SearchHistory).filter(
            SearchHistory.user_id == user_id
        )
        
        # Filter by time if specified
        if days:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            query = query.filter(SearchHistory.search_date >= cutoff_date)
        
        # Order by most recent first
        query = query.order_by(desc(SearchHistory.search_date)).limit(limit)
        
        return query.all()
    
    @staticmethod
    def get_search_by_id(db: Session, search_id: int, user_id: int) -> Optional[SearchHistory]:
        """Get specific search by ID (with user validation)"""
        
        return db.query(SearchHistory).filter(
            SearchHistory.id == search_id,
            SearchHistory.user_id == user_id
        ).first()
    
    @staticmethod
    def recreate_search(db: Session, search_id: int, user_id: int) -> Dict:
        """
        Get parameters to recreate a past search
        
        Returns dict with all search parameters
        """
        
        search = SearchHistoryService.get_search_by_id(db, search_id, user_id)
        
        if not search:
            return None
        
        # Update last_recreated timestamp
        search.last_recreated = datetime.now(timezone.utc)
        db.commit()
        
        # Return search parameters
        return {
            "search_type": search.search_type,
            "keywords": search.keywords,
            "role": search.role,
            "location": search.location,
            "min_followers": search.min_followers,
            "min_repos": search.min_repos,
            "languages": search.languages or [],
            "frameworks": search.frameworks or [],
            "min_score": search.min_score
        }
    
    @staticmethod
    def delete_search(db: Session, search_id: int, user_id: int) -> bool:
        """Delete a search from history"""
        
        search = db.query(SearchHistory).filter(
            SearchHistory.id == search_id,
            SearchHistory.user_id == user_id
        ).first()
        
        if search:
            db.delete(search)
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def track_profile_view(
        db: Session,
        user_id: int,
        profile_id: int,
        viewed_from: str = "direct",
        search_history_id: Optional[int] = None
    ) -> ProfileView:
        """
        Track when user views a profile
        
        Args:
            user_id: User viewing profile
            profile_id: Profile being viewed
            viewed_from: Source ("search", "saved_list", "email_campaign", "direct")
            search_history_id: Related search ID (optional)
        """
        
        # Check if view already exists
        existing_view = db.query(ProfileView).filter(
            ProfileView.user_id == user_id,
            ProfileView.profile_id == profile_id
        ).first()
        
        if existing_view:
            # Update existing view
            existing_view.last_viewed = datetime.now(timezone.utc)
            existing_view.view_count += 1
            existing_view.viewed_from = viewed_from  # Update source
            if search_history_id:
                existing_view.search_history_id = search_history_id
            db.commit()
            db.refresh(existing_view)
            return existing_view
        else:
            # Create new view
            profile_view = ProfileView(
                user_id=user_id,
                profile_id=profile_id,
                viewed_from=viewed_from,
                search_history_id=search_history_id
            )
            db.add(profile_view)
            db.commit()
            db.refresh(profile_view)
            return profile_view
    
    @staticmethod
    def get_user_profile_views(
        db: Session,
        user_id: int,
        limit: int = 50,
        days: Optional[int] = None
    ) -> List[Dict]:
        """
        Get user's profile view history
        
        Returns list of profiles with view metadata
        """
        
        query = db.query(ProfileView).filter(
            ProfileView.user_id == user_id
        )
        
        # Filter by time if specified
        if days:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            query = query.filter(ProfileView.last_viewed >= cutoff_date)
        
        # Order by most recent first
        views = query.order_by(desc(ProfileView.last_viewed)).limit(limit).all()
        
        # Format response with profile data
        result = []
        for view in views:
            profile = db.query(Profile).filter(Profile.id == view.profile_id).first()
            if profile:
                result.append({
                    "view_id": view.id,
                    "profile_id": profile.id,
                    "username": profile.github_username,
                    "name": profile.name,
                    "location": profile.location,
                    "bio": profile.bio,
                    "avatar_url": profile.avatar_url,
                    "score": profile.developer_score,
                    "viewed_from": view.viewed_from,
                    "first_viewed": view.first_viewed.isoformat(),
                    "last_viewed": view.last_viewed.isoformat(),
                    "view_count": view.view_count
                })
        
        return result
    
    @staticmethod
    def get_profile_view_stats(db: Session, user_id: int) -> Dict:
        """Get profile view statistics for user"""
        
        # Total unique profiles viewed
        total_profiles = db.query(ProfileView).filter(
            ProfileView.user_id == user_id
        ).count()
        
        # Total views (including repeat views)
        total_views = db.query(ProfileView).filter(
            ProfileView.user_id == user_id
        ).count()
        
        # Views this week
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        views_this_week = db.query(ProfileView).filter(
            ProfileView.user_id == user_id,
            ProfileView.last_viewed >= week_ago
        ).count()
        
        # Most viewed profiles
        most_viewed = db.query(ProfileView).filter(
            ProfileView.user_id == user_id
        ).order_by(desc(ProfileView.view_count)).limit(5).all()
        
        most_viewed_list = []
        for view in most_viewed:
            profile = db.query(Profile).filter(Profile.id == view.profile_id).first()
            if profile:
                most_viewed_list.append({
                    "username": profile.github_username,
                    "name": profile.name,
                    "view_count": view.view_count
                })
        
        return {
            "total_profiles_viewed": total_profiles,
            "total_views": total_views,
            "views_this_week": views_this_week,
            "most_viewed": most_viewed_list
        }
    
    @staticmethod
    def get_search_statistics(db: Session, user_id: int) -> Dict:
        """Get search history statistics"""
        
        # Total searches
        total_searches = db.query(SearchHistory).filter(
            SearchHistory.user_id == user_id
        ).count()
        
        # Searches this week
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        searches_this_week = db.query(SearchHistory).filter(
            SearchHistory.user_id == user_id,
            SearchHistory.search_date >= week_ago
        ).count()
        
        # Average results per search
        from sqlalchemy import func
        avg_results = db.query(func.avg(SearchHistory.results_count)).filter(
            SearchHistory.user_id == user_id
        ).scalar() or 0
        
        # Most common search type
        search_types = db.query(
            SearchHistory.search_type,
            func.count(SearchHistory.id).label('count')
        ).filter(
            SearchHistory.user_id == user_id
        ).group_by(SearchHistory.search_type).all()
        
        search_types_dict = {st[0]: st[1] for st in search_types}
        
        return {
            "total_searches": total_searches,
            "searches_this_week": searches_this_week,
            "average_results_per_search": round(avg_results, 1),
            "searches_by_type": search_types_dict
        }