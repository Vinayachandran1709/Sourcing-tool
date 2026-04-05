from sqlalchemy.orm import Session
from sqlalchemy import text
from models import User, UsageLog
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

class UsageService:
    """Handle usage limits and tracking"""

    PLAN_LIMITS = {
        "free_trial": {
            "searches": 25,
            "profile_unlocks": 50,
            "emails": 50,
            "csv_exports": 5,
            "saved_profiles": 50,
        },
        "starter": {
            "searches": 500,
            "profile_unlocks": 1000,
            "emails": 1000,
            "csv_exports": 50,
            "saved_profiles": -1,  # -1 means unlimited
        },
        "growth": {
            "searches": -1,  # unlimited
            "profile_unlocks": 3000,
            "emails": 3000,
            "csv_exports": -1,  # unlimited
            "saved_profiles": -1,  # unlimited
        },
    }

    @staticmethod
    def _maybe_reset_billing_cycle(db: Session, user: User):
        """Reset usage counters when a new billing cycle starts (paid plans)."""
        if user.plan not in ("starter", "growth") or user.subscription_status != "active":
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

    # Maps action_type to the DB column and limit key
    _ACTION_MAP = {
        "search": {"column": "usage_searches", "limit_key": "searches", "label": "searches", "usage_type": "searches"},
        "profile_view": {"column": "usage_profile_views", "limit_key": "profile_unlocks", "label": "profile unlocks", "usage_type": "profile_unlocks"},
        "email_sent": {"column": "usage_emails_sent", "limit_key": "emails", "label": "emails", "usage_type": "email_credits"},
    }

    @staticmethod
    def check_limit(db: Session, user_id: int, action_type: str, count: int = 1) -> bool:
        """
        Atomically check AND reserve usage in a single UPDATE ... WHERE statement.
        This prevents race conditions when multiple sessions share the same credentials.

        The counter is incremented at check time. If the action later fails,
        callers should call rollback_usage() to return the reserved slot.
        """
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

        # Get plan limits
        plan_key = user.plan if user.plan in UsageService.PLAN_LIMITS else "free_trial"
        limits = UsageService.PLAN_LIMITS[plan_key]

        action_info = UsageService._ACTION_MAP.get(action_type)
        if not action_info:
            return True

        limit = limits[action_info["limit_key"]]
        if limit == -1:
            return True  # Unlimited

        col = action_info["column"]

        # Atomic increment-if-under-limit using UPDATE ... WHERE
        # This is safe under concurrent access: only one session wins the row lock.
        result = db.execute(
            text(f"""
                UPDATE users
                SET {col} = COALESCE({col}, 0) + :count
                WHERE id = :user_id
                  AND COALESCE({col}, 0) + :count <= :limit
                RETURNING {col}
            """),
            {"user_id": user_id, "count": count, "limit": limit}
        )
        row = result.fetchone()
        db.commit()

        if row is None:
            # The WHERE clause failed — user is at or over the limit
            current_usage = getattr(user, col, 0) or 0
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "LIMIT_EXCEEDED",
                    "message": f"{action_info['label'].capitalize()} limit exceeded. You have used {current_usage} of {limit} {action_info['label']}.",
                    "current_usage": current_usage,
                    "limit": limit,
                    "usage_type": action_info["usage_type"],
                    "upgrade_url": "/pricing"
                }
            )

        # Refresh the user object so callers see updated count
        db.refresh(user)
        return True

    @staticmethod
    def rollback_usage(db: Session, user_id: int, action_type: str, count: int = 1):
        """
        Return a reserved usage slot if the action failed after check_limit().
        This decrements the counter that was atomically incremented.
        """
        action_info = UsageService._ACTION_MAP.get(action_type)
        if not action_info:
            return
        col = action_info["column"]
        db.execute(
            text(f"""
                UPDATE users
                SET {col} = GREATEST(COALESCE({col}, 0) - :count, 0)
                WHERE id = :user_id
            """),
            {"user_id": user_id, "count": count}
        )
        db.commit()
    
    @staticmethod
    def check_email_limit(db: Session, user_id: int) -> dict:
        """
        Check if user can send more emails.
        - Free trial: 50 emails total (lifetime)
        - Starter: 1,000 emails per billing cycle
        - Growth: 3,000 emails per billing cycle
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
        limit = limits["emails"]

        from models import EmailOutreach

        if user.plan in ("starter", "growth") and user.next_billing_date:
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
        Free trial: 5 total (lifetime, not monthly)
        Starter: 50 per billing cycle
        Growth: Unlimited
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
    def log_usage(db: Session, user_id: int, action_type: str, details: dict = None,
                  increment_counter: bool = False):
        """
        Log usage to the UsageLog table for analytics.

        NOTE: When called after check_limit(), the counter is already incremented
        atomically, so increment_counter should be False (the default).
        Set increment_counter=True only when logging usage that didn't go through
        check_limit() (e.g., campaign emails).
        """
        if increment_counter:
            action_info = UsageService._ACTION_MAP.get(action_type)
            if action_info:
                col = action_info["column"]
                db.execute(
                    text(f"""
                        UPDATE users
                        SET {col} = COALESCE({col}, 0) + 1
                        WHERE id = :user_id
                    """),
                    {"user_id": user_id}
                )

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
        
        saved_profiles_limit = limits.get("saved_profiles", -1)

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
                "profile_unlocks": {
                    "used": user.usage_profile_views,
                    "limit": limits["profile_unlocks"],
                    "unlimited": limits["profile_unlocks"] == -1
                },
                "emails": {
                    "used": user.usage_emails_sent,
                    "limit": limits["emails"],
                    "unlimited": limits["emails"] == -1
                },
                "csv_exports": {
                    "used": getattr(user, 'usage_csv_exports', 0),
                    "limit": limits["csv_exports"],
                    "unlimited": limits["csv_exports"] == -1
                },
                "saved_profiles": {
                    "limit": saved_profiles_limit,
                    "unlimited": saved_profiles_limit == -1
                }
            },
            "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None
        }