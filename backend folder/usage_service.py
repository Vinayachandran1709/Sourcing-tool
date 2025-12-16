from sqlalchemy.orm import Session
from models import User, UsageLog
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

class UsageService:
    """Handle usage limits and tracking"""
    
    PLAN_LIMITS = {
        "free": {
            "searches": 5,
            "profile_views": 25,
            "emails_sent": 10,
            "lists": 1,
            "profiles_per_list": 25,
            "trial_days": 14
        },
        "starter": {
            "searches": -1,  # unlimited
            "profile_views": 1000,
            "emails_sent": 300,
            "lists": -1,  # unlimited
            "profiles_per_list": -1,  # unlimited
            "trial_days": 0
        }
    }
    
    @staticmethod
    def check_limit(db: Session, user_id: int, action_type: str) -> bool:
        """Check if user can perform action"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Check if trial expired
        if user.subscription_status == "trial":
            if user.trial_end_date and datetime.now(timezone.utc) > user.trial_end_date:
                user.subscription_status = "expired"
                db.commit()
                raise HTTPException(status_code=403, detail="Free trial expired. Please upgrade to continue.")
        
        # Get plan limits
        limits = UsageService.PLAN_LIMITS.get(user.plan, UsageService.PLAN_LIMITS["free"])
        
        # Check specific limits
        if action_type == "search":
            limit = limits["searches"]
            if limit != -1 and user.usage_searches >= limit:
                raise HTTPException(status_code=403, detail=f"Search limit reached ({limit}). Upgrade to continue.")
        
        elif action_type == "profile_view":
            limit = limits["profile_views"]
            if limit != -1 and user.usage_profile_views >= limit:
                raise HTTPException(status_code=403, detail=f"Profile view limit reached ({limit}). Upgrade to continue.")
        
        elif action_type == "email_sent":
            limit = limits["emails_sent"]
            if limit != -1 and user.usage_emails_sent >= limit:
                raise HTTPException(status_code=403, detail=f"Email limit reached ({limit}). Upgrade to continue.")
        
        return True
    
    @staticmethod
    def log_usage(db: Session, user_id: int, action_type: str, details: dict = None):
        """Log usage and increment counter"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        # Increment usage counter
        if action_type == "search":
            user.usage_searches += 1
        elif action_type == "profile_view":
            user.usage_profile_views += 1
        elif action_type == "email_sent":
            user.usage_emails_sent += 1
        
        # Log detailed usage
        log = UsageLog(
            user_id=user_id,
            action_type=action_type,
            details=details
        )
        db.add(log)
        db.commit()
    
    @staticmethod
    def get_usage_stats(db: Session, user_id: int) -> dict:
        """Get current usage statistics"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}
        
        limits = UsageService.PLAN_LIMITS.get(user.plan, UsageService.PLAN_LIMITS["free"])
        
        return {
            "plan": user.plan,
            "subscription_status": user.subscription_status,
            "usage": {
                "searches": {
                    "used": user.usage_searches,
                    "limit": limits["searches"],
                    "unlimited": limits["searches"] == -1
                },
                "profile_views": {
                    "used": user.usage_profile_views,
                    "limit": limits["profile_views"],
                    "unlimited": limits["profile_views"] == -1
                },
                "emails_sent": {
                    "used": user.usage_emails_sent,
                    "limit": limits["emails_sent"],
                    "unlimited": limits["emails_sent"] == -1
                }
            },
            "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None
        }