from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from search_history_service import SearchHistoryService

router = APIRouter(prefix="/api/search-history", tags=["Search History"])

# Request Models
class TrackProfileViewRequest(BaseModel):
    profile_id: int
    viewed_from: str = "direct"  # "search", "saved_list", "email_campaign", "direct"
    search_history_id: Optional[int] = None

# ===== SEARCH HISTORY =====

@router.get("/")
def get_search_history(
    user_id: int = Query(..., description="User ID"),
    limit: int = Query(50, ge=1, le=100),
    days: Optional[int] = Query(None, description="Filter to last N days"),
    db: Session = Depends(get_db)
):
    """
    Get user's search history
    
    Returns list of past searches with parameters and metadata
    """
    
    searches = SearchHistoryService.get_user_search_history(db, user_id, limit, days)
    
    result = []
    for search in searches:
        result.append({
            "id": search.id,
            "search_type": search.search_type,
            "keywords": search.keywords,
            "role": search.role,
            "location": search.location,
            "min_followers": search.min_followers,
            "min_repos": search.min_repos,
            "languages": search.languages,
            "frameworks": search.frameworks,
            "min_score": search.min_score,
            "results_count": search.results_count,
            "search_date": search.search_date.isoformat(),
            "last_recreated": search.last_recreated.isoformat() if search.last_recreated else None
        })
    
    return {
        "success": True,
        "data": result,
        "total": len(result)
    }

@router.get("/{search_id}")
def get_search_details(
    search_id: int,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific search"""
    
    search = SearchHistoryService.get_search_by_id(db, search_id, user_id)
    
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    
    return {
        "success": True,
        "data": {
            "id": search.id,
            "search_type": search.search_type,
            "keywords": search.keywords,
            "role": search.role,
            "location": search.location,
            "min_followers": search.min_followers,
            "min_repos": search.min_repos,
            "languages": search.languages,
            "frameworks": search.frameworks,
            "min_score": search.min_score,
            "results_count": search.results_count,
            "search_date": search.search_date.isoformat(),
            "last_recreated": search.last_recreated.isoformat() if search.last_recreated else None
        }
    }

@router.post("/{search_id}/recreate")
def recreate_search(
    search_id: int,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Get parameters to recreate a past search
    
    Returns all search parameters needed to rerun the search
    """
    
    params = SearchHistoryService.recreate_search(db, search_id, user_id)
    
    if not params:
        raise HTTPException(status_code=404, detail="Search not found")
    
    return {
        "success": True,
        "message": "Search parameters retrieved",
        "search_params": params
    }

@router.delete("/{search_id}")
def delete_search(
    search_id: int,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """Delete a search from history"""
    
    deleted = SearchHistoryService.delete_search(db, search_id, user_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Search not found")
    
    return {
        "success": True,
        "message": "Search deleted from history"
    }

@router.get("/statistics/overview")
def get_search_statistics(
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """Get search history statistics"""
    
    stats = SearchHistoryService.get_search_statistics(db, user_id)
    
    return {
        "success": True,
        "data": stats
    }

# ===== PROFILE VIEWS =====

@router.post("/profile-views/track")
def track_profile_view(
    request: TrackProfileViewRequest,
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """
    Track when user views a profile
    
    viewed_from options:
    - "search": From search results
    - "saved_list": From a saved list
    - "email_campaign": From email campaign
    - "direct": Direct access
    """
    
    view = SearchHistoryService.track_profile_view(
        db,
        user_id,
        request.profile_id,
        request.viewed_from,
        request.search_history_id
    )
    
    return {
        "success": True,
        "message": "Profile view tracked",
        "view_count": view.view_count
    }

@router.get("/profile-views/")
def get_profile_views(
    user_id: int = Query(..., description="User ID"),
    limit: int = Query(50, ge=1, le=100),
    days: Optional[int] = Query(None, description="Filter to last N days"),
    db: Session = Depends(get_db)
):
    """
    Get user's profile view history
    
    Returns list of profiles with view metadata
    """
    
    views = SearchHistoryService.get_user_profile_views(db, user_id, limit, days)
    
    return {
        "success": True,
        "data": views,
        "total": len(views)
    }

@router.get("/profile-views/statistics/overview")
def get_profile_view_stats(
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
):
    """Get profile view statistics"""
    
    stats = SearchHistoryService.get_profile_view_stats(db, user_id)
    
    return {
        "success": True,
        "data": stats
    }