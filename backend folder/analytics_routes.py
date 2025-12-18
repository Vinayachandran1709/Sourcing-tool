from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict
from database import get_db
from analytics_service import AnalyticsService

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# Request Models
class TrackEventRequest(BaseModel):
    event_type: str
    event_data: Optional[Dict] = None

# ===== DASHBOARD METRICS =====

@router.get("/dashboard")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Get comprehensive dashboard metrics
    
    Returns:
    - User counts (total, free, paid, trial, active)
    - Signup trends (today, week, month)
    - Conversion metrics
    - Revenue metrics (MRR, ARR, ARPU)
    - Churn metrics
    - Usage statistics
    """
    metrics = AnalyticsService.get_dashboard_metrics(db)
    return {
        "success": True,
        "data": metrics
    }

# ===== CONVERSION FUNNEL =====

@router.get("/funnel")
def get_conversion_funnel(days: int = 30, db: Session = Depends(get_db)):
    """
    Get conversion funnel analysis
    
    Args:
        days: Number of days to analyze (default 30)
    
    Returns:
        Funnel stages: Signup → Trial Started → Trial Active → Paid
        Conversion rates between each stage
    """
    funnel = AnalyticsService.get_conversion_funnel(db, days)
    return {
        "success": True,
        "data": funnel
    }

# ===== USER COHORTS =====

@router.get("/cohorts")
def get_user_cohorts(db: Session = Depends(get_db)):
    """
    Get user cohorts grouped by signup month
    
    Shows signup counts and conversion rates by cohort
    """
    cohorts = AnalyticsService.get_user_cohorts(db)
    return {
        "success": True,
        "data": cohorts
    }

# ===== TOP USERS =====

@router.get("/top-users")
def get_top_users(limit: int = 10, db: Session = Depends(get_db)):
    """
    Get most active users by search count
    
    Args:
        limit: Number of users to return (default 10)
    """
    top_users = AnalyticsService.get_top_users(db, limit)
    return {
        "success": True,
        "data": top_users,
        "total": len(top_users)
    }

# ===== ENGAGEMENT METRICS =====

@router.get("/engagement")
def get_engagement_metrics(days: int = 30, db: Session = Depends(get_db)):
    """
    Get user engagement metrics
    
    Returns:
    - DAU, WAU, MAU (Daily/Weekly/Monthly Active Users)
    - Average searches and emails per user
    - Stickiness ratios
    """
    engagement = AnalyticsService.get_engagement_metrics(db, days)
    return {
        "success": True,
        "data": engagement
    }

# ===== CUSTOM EVENT TRACKING =====

@router.post("/track-event")
def track_event(
    request: TrackEventRequest,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Track custom analytics event
    
    Event types:
    - user_signup
    - trial_started
    - first_search
    - first_email_sent
    - subscription_activated
    - subscription_canceled
    - limit_reached
    """
    AnalyticsService.track_event(db, user_id, request.event_type, request.event_data)
    return {
        "success": True,
        "message": "Event tracked"
    }

# ===== QUICK STATS =====

@router.get("/quick-stats")
def get_quick_stats(db: Session = Depends(get_db)):
    """Get quick overview stats for admin dashboard"""
    
    from models import User, EmailCampaign
    
    total_users = db.query(User).count()
    paid_users = db.query(User).filter(User.plan == "starter").count()
    active_campaigns = db.query(EmailCampaign).filter(
        EmailCampaign.status == "active"
    ).count()
    
    return {
        "total_users": total_users,
        "paid_users": paid_users,
        "active_campaigns": active_campaigns,
        "conversion_rate": round((paid_users / total_users * 100) if total_users > 0 else 0, 2)
    }