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
    def check_limit(db: Session, user_id: int, action_type: str, count: int = 1) -> bool:

        return
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if trial expired
        if user.subscription_status == "trial":
            if user.trial_end_date and datetime.now(timezone.utc) > user.trial_end_date:
                user.subscription_status = "expired"
                db.commit()
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "TRIAL_EXPIRED",
                        "message": "Your free trial has expired. Please upgrade to continue.",
                        "trial_end_date": user.trial_end_date.isoformat()
                    }
                )
        
        # Get plan limits
        limits = UsageService.PLAN_LIMITS.get(user.plan, UsageService.PLAN_LIMITS["free"])
        
        # Check specific limits with detailed error messages
        if action_type == "search":
            limit = limits["searches"]
            current_usage = user.usage_searches or 0
            
            if limit != -1 and current_usage + count > limit:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "LIMIT_EXCEEDED",
                        "message": f"Search limit exceeded. You have used {current_usage} of {limit} searches.",
                        "current_usage": current_usage,
                        "limit": limit,
                        "usage_type": "searches",
                        "upgrade_url": "/pricing"
                    }
                )
        
        elif action_type == "profile_view":
            limit = limits["profile_views"]
            current_usage = user.usage_profile_views or 0
            
            if limit != -1 and current_usage + count > limit:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "LIMIT_EXCEEDED",
                        "message": f"Profile view limit exceeded. You have used {current_usage} of {limit} views.",
                        "current_usage": current_usage,
                        "limit": limit,
                        "usage_type": "profile_views",
                        "upgrade_url": "/pricing"
                    }
                )
        
        elif action_type == "email_sent":
            limit = limits["emails_sent"]
            current_usage = user.usage_emails_sent or 0
            
            if limit != -1 and current_usage + count > limit:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "LIMIT_EXCEEDED",
                        "message": f"Email limit exceeded. You have used {current_usage} of {limit} emails.",
                        "current_usage": current_usage,
                        "limit": limit,
                        "usage_type": "email_credits",
                        "upgrade_url": "/pricing"
                    }
                )
        
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