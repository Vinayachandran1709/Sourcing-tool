from sqlalchemy.orm import Session
from models import User, UsageLog
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

class UsageService:
    """Handle usage limits and tracking"""

    PLAN_LIMITS = {
        "free_trial": {
            "searches": 25,
            "profile_views": 40,
            "emails_sent": 15,
            "csv_exports": 10,
            "lists": 1,
            "profiles_per_list": 25,
            "trial_days": 14
        },
        "starter": {
            "searches": 100,
            "profile_views": 300,
            "emails_sent": 300,
            "csv_exports": -1,
            "lists": -1,  # unlimited
            "profiles_per_list": -1,  # unlimited
            "trial_days": 0
        }
    }

    @staticmethod
    def _maybe_reset_billing_cycle(db: Session, user: User):
        """Reset usage counters when a new billing cycle starts (starter plan)."""
        if user.plan != "starter" or user.subscription_status != "active":
            return
        if not user.next_billing_date:
            return

        now = datetime.now(timezone.utc)
        if now >= user.next_billing_date:
            # Reset usage counters for new billing cycle
            user.usage_searches = 0
            user.usage_profile_views = 0
            user.usage_emails_sent = 0
            # Advance billing date by one month (or year)
            if user.billing_cycle == "annual":
                user.next_billing_date = user.next_billing_date + timedelta(days=365)
            else:
                user.next_billing_date = user.next_billing_date + timedelta(days=30)
            user.usage_reset_date = now
            db.commit()

    @staticmethod
    def check_limit(db: Session, user_id: int, action_type: str, count: int = 1) -> bool:

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if trial expired (block after 14 days if not upgraded)
        if user.plan == "free_trial" or user.subscription_status == "trial":
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
            # Also block if subscription_status is already expired
            if user.subscription_status == "expired":
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "TRIAL_EXPIRED",
                        "message": "Your free trial has expired. Please upgrade to continue.",
                        "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None
                    }
                )

        # Reset billing cycle for starter plan if needed
        UsageService._maybe_reset_billing_cycle(db, user)

        # Get plan limits (handle legacy "free" value as "free_trial")
        plan_key = user.plan if user.plan in UsageService.PLAN_LIMITS else "free_trial"
        limits = UsageService.PLAN_LIMITS[plan_key]
        
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
    def check_email_limit(db: Session, user_id: int) -> dict:
        """
        Check if user can send more emails.
        - Free trial: 25 emails total (lifetime)
        - Starter: 300 emails per billing cycle
        Returns usage stats with limit, used, remaining, can_send.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                "limit": 0,
                "used": 0,
                "remaining": 0,
                "can_send": False
            }

        # Check trial expiry first
        if user.plan == "free_trial" or user.subscription_status == "trial":
            if user.trial_end_date and datetime.now(timezone.utc) > user.trial_end_date:
                return {
                    "limit": 0,
                    "used": 0,
                    "remaining": 0,
                    "can_send": False,
                    "trial_expired": True
                }

        # Reset billing cycle for starter if needed
        UsageService._maybe_reset_billing_cycle(db, user)

        # Get plan limit
        plan_key = user.plan if user.plan in UsageService.PLAN_LIMITS else "free_trial"
        limits = UsageService.PLAN_LIMITS[plan_key]
        limit = limits["emails_sent"]

        from models import EmailOutreach

        if user.plan == "starter" and user.next_billing_date:
            # Starter: count emails since billing cycle start (billing_date - 30 days)
            if user.billing_cycle == "annual":
                cycle_start = user.next_billing_date - timedelta(days=365)
            else:
                cycle_start = user.next_billing_date - timedelta(days=30)
            sent_count = db.query(EmailOutreach).filter(
                EmailOutreach.user_id == user_id,
                EmailOutreach.sent_at >= cycle_start
            ).count()
        else:
            # Free trial: count all emails ever sent (lifetime limit)
            sent_count = user.usage_emails_sent or 0

        remaining = max(0, limit - sent_count) if limit != -1 else 999999

        return {
            "limit": limit,
            "used": sent_count,
            "remaining": remaining,
            "can_send": (limit == -1) or (sent_count < limit)
        }
    
    @staticmethod
    def check_csv_limit(db: Session, user_id: int) -> dict:
        """
        Check if user can export more CSVs.
        Free trial: 10 total (lifetime, not monthly)
        Paid plans: Unlimited
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                "limit": 0,
                "used": 0,
                "remaining": 0,
                "can_export": False
            }
        
        # Get plan limit
        plan_key = user.plan if user.plan in UsageService.PLAN_LIMITS else "free_trial"
        limits = UsageService.PLAN_LIMITS[plan_key]
        limit = limits["csv_exports"]
        
        # For free trial, it's LIFETIME limit (not monthly)
        used = getattr(user, 'usage_csv_exports', 0)
        
        remaining = max(0, limit - used) if limit != -1 else 999999
        
        return {
            "limit": limit,
            "used": used,
            "remaining": remaining,
            "can_export": (limit == -1) or (used < limit)
        }

    @staticmethod
    def log_csv_export(db: Session, user_id: int):
        """Log a CSV export"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        # Increment counter
        if not hasattr(user, 'usage_csv_exports'):
            user.usage_csv_exports = 0
        user.usage_csv_exports += 1
        
        # Log detailed usage
        log = UsageLog(
            user_id=user_id,
            action_type="csv_export",
            details={"timestamp": datetime.now(timezone.utc).isoformat()}
        )
        db.add(log)
        db.commit()


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
        
        plan_key = user.plan if user.plan in UsageService.PLAN_LIMITS else "free_trial"
        limits = UsageService.PLAN_LIMITS[plan_key]
        
        return {
            "plan": user.plan,
            "subscription_status": user.subscription_status,
            "billing_cycle": getattr(user, 'billing_cycle', 'monthly') or 'monthly',
            "next_billing_date": user.next_billing_date.isoformat() if getattr(user, 'next_billing_date', None) else None,
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
                },
                "csv_exports": {
                    "used": getattr(user, 'usage_csv_exports', 0),
                    "limit": limits["csv_exports"],
                    "unlimited": limits["csv_exports"] == -1
                }
            },
            "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None
        }