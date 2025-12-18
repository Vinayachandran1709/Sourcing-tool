from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from models import User, EmailCampaign, SearchHistory, UsageLog, SavedList
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

class AnalyticsService:
    """Handle analytics calculations and tracking"""
    
    @staticmethod
    def get_dashboard_metrics(db: Session) -> Dict:
        """Get real-time dashboard metrics"""
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Total users
        total_users = db.query(func.count(User.id)).scalar()
        
        # Users by plan
        free_users = db.query(func.count(User.id)).filter(User.plan == "free").scalar()
        paid_users = db.query(func.count(User.id)).filter(User.plan == "starter").scalar()
        
        # Trial users (free plan with active trial)
        trial_users = db.query(func.count(User.id)).filter(
            and_(
                User.plan == "free",
                User.subscription_status == "trial",
                User.trial_end_date > now
            )
        ).scalar()
        
        # Active subscribers
        active_subscribers = db.query(func.count(User.id)).filter(
            and_(
                User.plan == "starter",
                User.subscription_status == "active"
            )
        ).scalar()
        
        # New signups today
        signups_today = db.query(func.count(User.id)).filter(
            User.created_at >= today_start
        ).scalar()
        
        # New signups this week
        signups_week = db.query(func.count(User.id)).filter(
            User.created_at >= week_ago
        ).scalar()
        
        # New signups this month
        signups_month = db.query(func.count(User.id)).filter(
            User.created_at >= month_ago
        ).scalar()
        
        # Conversions (users who upgraded from free to paid)
        conversions_total = db.query(func.count(User.id)).filter(
            and_(
                User.plan == "starter",
                User.subscription_start_date.isnot(None)
            )
        ).scalar()
        
        # Conversions this month
        conversions_month = db.query(func.count(User.id)).filter(
            and_(
                User.plan == "starter",
                User.subscription_start_date >= month_ago
            )
        ).scalar()
        
        # Calculate conversion rate
        conversion_rate = (conversions_total / total_users * 100) if total_users > 0 else 0
        
        # Monthly Recurring Revenue (MRR)
        # Monthly: ₹6,500, Annual: ₹65,000 / 12 = ₹5,416.67
        monthly_subscribers = db.query(func.count(User.id)).filter(
            and_(
                User.plan == "starter",
                User.billing_cycle == "monthly",
                User.subscription_status == "active"
            )
        ).scalar()
        
        annual_subscribers = db.query(func.count(User.id)).filter(
            and_(
                User.plan == "starter",
                User.billing_cycle == "annual",
                User.subscription_status == "active"
            )
        ).scalar()
        
        mrr = (monthly_subscribers * 6500) + (annual_subscribers * 5417)
        
        # Annual Recurring Revenue (ARR)
        arr = mrr * 12
        
        # Average Revenue Per User (ARPU)
        arpu = mrr / active_subscribers if active_subscribers > 0 else 0
        
        # Churn (canceled subscriptions this month)
        churned_month = db.query(func.count(User.id)).filter(
            and_(
                User.subscription_status == "canceled",
                User.created_at >= month_ago  # Approximate
            )
        ).scalar()
        
        # Churn rate
        churn_rate = (churned_month / paid_users * 100) if paid_users > 0 else 0
        
        # Usage stats
        total_searches = db.query(func.count(UsageLog.id)).filter(
            UsageLog.action_type == "search"
        ).scalar()
        
        total_emails = db.query(func.count(UsageLog.id)).filter(
            UsageLog.action_type == "email_sent"
        ).scalar()
        
        total_campaigns = db.query(func.count(EmailCampaign.id)).scalar()
        
        total_lists = db.query(func.count(SavedList.id)).scalar()
        
        return {
            "users": {
                "total": total_users,
                "free": free_users,
                "paid": paid_users,
                "trial": trial_users,
                "active_subscribers": active_subscribers
            },
            "signups": {
                "today": signups_today,
                "week": signups_week,
                "month": signups_month
            },
            "conversions": {
                "total": conversions_total,
                "month": conversions_month,
                "rate": round(conversion_rate, 2)
            },
            "revenue": {
                "mrr": mrr,
                "arr": arr,
                "arpu": round(arpu, 2)
            },
            "churn": {
                "month": churned_month,
                "rate": round(churn_rate, 2)
            },
            "usage": {
                "total_searches": total_searches,
                "total_emails": total_emails,
                "total_campaigns": total_campaigns,
                "total_lists": total_lists
            }
        }
    
    @staticmethod
    def get_conversion_funnel(db: Session, days: int = 30) -> Dict:
        """
        Get conversion funnel metrics
        
        Funnel: Visitor → Signup → Trial Active → Paid
        """
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Stage 1: Signups (in time period)
        signups = db.query(func.count(User.id)).filter(
            User.created_at >= cutoff_date
        ).scalar()
        
        # Stage 2: Trial Started (users who signed up and got trial)
        trial_started = db.query(func.count(User.id)).filter(
            and_(
                User.created_at >= cutoff_date,
                User.trial_start_date.isnot(None)
            )
        ).scalar()
        
        # Stage 3: Trial Active (using the product during trial)
        # Consider "active" if they performed at least 1 search
        trial_active = db.query(func.count(User.id.distinct())).join(
            UsageLog, User.id == UsageLog.user_id
        ).filter(
            and_(
                User.created_at >= cutoff_date,
                User.plan == "free",
                UsageLog.action_type == "search"
            )
        ).scalar()
        
        # Stage 4: Converted to Paid
        converted = db.query(func.count(User.id)).filter(
            and_(
                User.created_at >= cutoff_date,
                User.plan == "starter",
                User.subscription_status == "active"
            )
        ).scalar()
        
        # Calculate conversion rates
        signup_to_trial = (trial_started / signups * 100) if signups > 0 else 0
        trial_to_active = (trial_active / trial_started * 100) if trial_started > 0 else 0
        active_to_paid = (converted / trial_active * 100) if trial_active > 0 else 0
        overall_conversion = (converted / signups * 100) if signups > 0 else 0
        
        return {
            "period_days": days,
            "funnel": {
                "signups": {
                    "count": signups,
                    "percentage": 100
                },
                "trial_started": {
                    "count": trial_started,
                    "percentage": round(signup_to_trial, 2),
                    "conversion_from_previous": round(signup_to_trial, 2)
                },
                "trial_active": {
                    "count": trial_active,
                    "percentage": round((trial_active / signups * 100) if signups > 0 else 0, 2),
                    "conversion_from_previous": round(trial_to_active, 2)
                },
                "paid": {
                    "count": converted,
                    "percentage": round(overall_conversion, 2),
                    "conversion_from_previous": round(active_to_paid, 2)
                }
            },
            "overall_conversion_rate": round(overall_conversion, 2)
        }
    
    @staticmethod
    def get_user_cohorts(db: Session) -> Dict:
        """Get user cohorts by signup date"""
        
        # Get users grouped by signup month
        cohorts = db.query(
            func.date_trunc('month', User.created_at).label('cohort_month'),
            func.count(User.id).label('users'),
            func.sum(func.case((User.plan == 'starter', 1), else_=0)).label('paid_users')
        ).group_by('cohort_month').order_by('cohort_month').all()
        
        result = []
        for cohort in cohorts:
            month = cohort.cohort_month.strftime('%Y-%m') if cohort.cohort_month else 'Unknown'
            total = cohort.users
            paid = cohort.paid_users or 0
            conversion = (paid / total * 100) if total > 0 else 0
            
            result.append({
                "month": month,
                "total_signups": total,
                "paid_users": paid,
                "conversion_rate": round(conversion, 2)
            })
        
        return {
            "cohorts": result
        }
    
    @staticmethod
    def get_top_users(db: Session, limit: int = 10) -> List[Dict]:
        """Get most active users by usage"""
        
        # Get users with their total searches
        top_users = db.query(
            User.id,
            User.email,
            User.name,
            User.company,
            User.plan,
            User.subscription_status,
            User.usage_searches,
            User.usage_profile_views,
            User.usage_emails_sent,
            User.created_at
        ).filter(
            User.usage_searches > 0
        ).order_by(
            User.usage_searches.desc()
        ).limit(limit).all()
        
        result = []
        for user in top_users:
            result.append({
                "user_id": user.id,
                "email": user.email,
                "name": user.name,
                "company": user.company,
                "plan": user.plan,
                "status": user.subscription_status,
                "searches": user.usage_searches,
                "profile_views": user.usage_profile_views,
                "emails_sent": user.usage_emails_sent,
                "member_since": user.created_at.strftime('%Y-%m-%d') if user.created_at else None
            })
        
        return result
    
    @staticmethod
    def get_engagement_metrics(db: Session, days: int = 30) -> Dict:
        """Get user engagement metrics"""
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Daily Active Users (DAU) - users who performed any action today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        dau = db.query(func.count(func.distinct(UsageLog.user_id))).filter(
            UsageLog.timestamp >= today_start
        ).scalar()
        
        # Weekly Active Users (WAU)
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        wau = db.query(func.count(func.distinct(UsageLog.user_id))).filter(
            UsageLog.timestamp >= week_ago
        ).scalar()
        
        # Monthly Active Users (MAU)
        mau = db.query(func.count(func.distinct(UsageLog.user_id))).filter(
            UsageLog.timestamp >= cutoff_date
        ).scalar()
        
        # Average searches per user
        total_users_with_searches = db.query(func.count(User.id)).filter(
            User.usage_searches > 0
        ).scalar()
        
        total_searches = db.query(func.sum(User.usage_searches)).scalar() or 0
        avg_searches = total_searches / total_users_with_searches if total_users_with_searches > 0 else 0
        
        # Average emails per user
        total_users_with_emails = db.query(func.count(User.id)).filter(
            User.usage_emails_sent > 0
        ).scalar()
        
        total_emails = db.query(func.sum(User.usage_emails_sent)).scalar() or 0
        avg_emails = total_emails / total_users_with_emails if total_users_with_emails > 0 else 0
        
        return {
            "active_users": {
                "daily": dau,
                "weekly": wau,
                "monthly": mau
            },
            "average_per_user": {
                "searches": round(avg_searches, 2),
                "emails": round(avg_emails, 2)
            },
            "stickiness": {
                "dau_mau_ratio": round((dau / mau * 100) if mau > 0 else 0, 2),
                "wau_mau_ratio": round((wau / mau * 100) if mau > 0 else 0, 2)
            }
        }
    
    @staticmethod
    def track_event(db: Session, user_id: int, event_type: str, event_data: Dict = None):
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
        
        log = UsageLog(
            user_id=user_id,
            action_type=event_type,
            details=event_data or {}
        )
        db.add(log)
        db.commit()