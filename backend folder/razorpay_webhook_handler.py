from sqlalchemy.orm import Session
from models import User
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

class RazorpayWebhookHandler:
    """Handle Razorpay webhook events"""
    
    @staticmethod
    def handle_subscription_activated(event_data: dict, db: Session):
        """Handle subscription.activated event"""
        try:
            subscription = event_data.get("payload", {}).get("subscription", {}).get("entity", {})
            
            # Extract data
            subscription_id = subscription.get("id")
            plan_id = subscription.get("plan_id")
            user_id = int(subscription.get("notes", {}).get("user_id", 0))
            status = subscription.get("status")
            current_end = subscription.get("current_end")
            
            if not user_id:
                logger.error("No user_id in subscription notes")
                return
            
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.error(f"User {user_id} not found")
                return
            
            # Determine plan and billing cycle
            from razorpay_service import RazorpayService
            if plan_id == RazorpayService.PLAN_IDS["starter_monthly"]:
                plan = "starter"
                billing_cycle = "monthly"
            elif plan_id == RazorpayService.PLAN_IDS["starter_annual"]:
                plan = "starter"
                billing_cycle = "annual"
            else:
                plan = "starter"
                billing_cycle = "monthly"
            
            # Update user
            user.razorpay_subscription_id = subscription_id
            user.plan = plan
            user.billing_cycle = billing_cycle
            user.subscription_status = "active"
            user.subscription_start_date = datetime.now(timezone.utc)
            
            # Set next billing date
            if current_end:
                user.next_billing_date = datetime.fromtimestamp(current_end, tz=timezone.utc)
            
            # Reset usage
            user.usage_searches = 0
            user.usage_profile_views = 0
            user.usage_emails_sent = 0
            user.usage_reset_date = datetime.now(timezone.utc)
            
            db.commit()
            
            logger.info(f"✅ User {user_id} subscription activated: {subscription_id}")
            
        except Exception as e:
            logger.error(f"Error handling subscription activated: {e}")
            db.rollback()
    
    @staticmethod
    def handle_subscription_charged(event_data: dict, db: Session):
        """Handle subscription.charged event (successful payment)"""
        try:
            payment = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            subscription_id = payment.get("subscription_id")
            
            if not subscription_id:
                return
            
            # Find user
            user = db.query(User).filter(
                User.razorpay_subscription_id == subscription_id
            ).first()
            
            if not user:
                logger.error(f"User with subscription {subscription_id} not found")
                return
            
            # Update status to active (in case it was past_due)
            user.subscription_status = "active"
            
            # Reset usage for new billing cycle
            user.usage_searches = 0
            user.usage_profile_views = 0
            user.usage_emails_sent = 0
            user.usage_reset_date = datetime.now(timezone.utc)
            
            # Update next billing date (add 30 days for monthly, 365 for annual)
            if user.billing_cycle == "monthly":
                user.next_billing_date = datetime.now(timezone.utc) + timedelta(days=30)
            else:
                user.next_billing_date = datetime.now(timezone.utc) + timedelta(days=365)
            
            db.commit()
            
            logger.info(f"✅ Subscription {subscription_id} charged successfully")
            
        except Exception as e:
            logger.error(f"Error handling subscription charged: {e}")
            db.rollback()
    
    @staticmethod
    def handle_subscription_cancelled(event_data: dict, db: Session):
        """Handle subscription.cancelled event"""
        try:
            subscription = event_data.get("payload", {}).get("subscription", {}).get("entity", {})
            subscription_id = subscription.get("id")
            
            # Find user
            user = db.query(User).filter(
                User.razorpay_subscription_id == subscription_id
            ).first()
            
            if not user:
                logger.error(f"User with subscription {subscription_id} not found")
                return
            
            # Downgrade to free plan
            user.plan = "free"
            user.subscription_status = "canceled"
            user.razorpay_subscription_id = None
            
            # Reset usage
            user.usage_searches = 0
            user.usage_profile_views = 0
            user.usage_emails_sent = 0
            
            db.commit()
            
            logger.info(f"✅ Subscription {subscription_id} canceled, user downgraded to free")
            
        except Exception as e:
            logger.error(f"Error handling subscription cancelled: {e}")
            db.rollback()
    
    @staticmethod
    def handle_subscription_halted(event_data: dict, db: Session):
        """Handle subscription.halted event (payment failures)"""
        try:
            subscription = event_data.get("payload", {}).get("subscription", {}).get("entity", {})
            subscription_id = subscription.get("id")
            
            # Find user
            user = db.query(User).filter(
                User.razorpay_subscription_id == subscription_id
            ).first()
            
            if not user:
                return
            
            # Mark as past due
            user.subscription_status = "past_due"
            
            db.commit()
            
            logger.warning(f"⚠️ Subscription {subscription_id} halted due to payment failure")
            
        except Exception as e:
            logger.error(f"Error handling subscription halted: {e}")
            db.rollback()
    
    @staticmethod
    def handle_payment_failed(event_data: dict, db: Session):
        """Handle payment.failed event"""
        try:
            payment = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            subscription_id = payment.get("subscription_id")
            
            if not subscription_id:
                return
            
            # Find user
            user = db.query(User).filter(
                User.razorpay_subscription_id == subscription_id
            ).first()
            
            if not user:
                return
            
            # Mark as past due
            user.subscription_status = "past_due"
            
            db.commit()
            
            logger.warning(f"⚠️ Payment failed for subscription {subscription_id}")
            
        except Exception as e:
            logger.error(f"Error handling payment failed: {e}")
            db.rollback()