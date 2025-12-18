import razorpay
import os
from typing import Dict, Optional
from dotenv import load_dotenv
import hmac
import hashlib

load_dotenv()

class RazorpayService:
    """Handle Razorpay payment operations"""
    
    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET")
        
        if not self.key_id or not self.key_secret:
            raise ValueError("Razorpay credentials not configured")
        
        self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
    
    # Plan IDs from environment
    PLAN_IDS = {
        "starter_monthly": os.getenv("RAZORPAY_STARTER_MONTHLY_PLAN_ID", "plan_starter_monthly"),
        "starter_annual": os.getenv("RAZORPAY_STARTER_ANNUAL_PLAN_ID", "plan_starter_annual")
    }
    
    def create_subscription(
        self,
        plan_id: str,
        customer_email: str,
        customer_name: str,
        customer_contact: str,
        user_id: int,
        notify_customer: bool = True
    ) -> Dict:
        """
        Create a subscription
        
        Args:
            plan_id: Razorpay plan ID
            customer_email: Customer email
            customer_name: Customer name
            customer_contact: Customer phone (10 digits)
            user_id: Your internal user ID
            notify_customer: Send email to customer
        
        Returns:
            Subscription details with payment link
        """
        try:
            subscription = self.client.subscription.create({
                "plan_id": plan_id,
                "customer_notify": 1 if notify_customer else 0,
                "quantity": 1,
                "total_count": 12,  # 12 billing cycles (1 year for monthly, 1 payment for annual)
                "notes": {
                    "user_id": str(user_id),
                    "plan_type": "starter"
                }
            })
            
            return {
                "subscription_id": subscription["id"],
                "status": subscription["status"],
                "short_url": subscription.get("short_url"),  # Payment link
                "plan_id": subscription["plan_id"],
                "customer_notify": subscription.get("customer_notify", 1)
            }
            
        except Exception as e:
            raise Exception(f"Failed to create subscription: {str(e)}")
    
    def retrieve_subscription(self, subscription_id: str) -> Dict:
        """Retrieve subscription details"""
        try:
            subscription = self.client.subscription.fetch(subscription_id)
            return {
                "id": subscription["id"],
                "status": subscription["status"],
                "plan_id": subscription["plan_id"],
                "current_start": subscription.get("current_start"),
                "current_end": subscription.get("current_end"),
                "charge_at": subscription.get("charge_at"),
                "customer_id": subscription.get("customer_id")
            }
        except Exception as e:
            raise Exception(f"Failed to retrieve subscription: {str(e)}")
    
    def cancel_subscription(self, subscription_id: str, cancel_at_cycle_end: bool = True) -> Dict:
        """
        Cancel a subscription
        
        Args:
            subscription_id: Razorpay subscription ID
            cancel_at_cycle_end: If True, cancel at end of billing period
        
        Returns:
            Cancellation details
        """
        try:
            if cancel_at_cycle_end:
                # Cancel at end of current period
                subscription = self.client.subscription.cancel(subscription_id, {
                    "cancel_at_cycle_end": 1
                })
            else:
                # Cancel immediately
                subscription = self.client.subscription.cancel(subscription_id, {
                    "cancel_at_cycle_end": 0
                })
            
            return {
                "id": subscription["id"],
                "status": subscription["status"],
                "ended_at": subscription.get("ended_at")
            }
        except Exception as e:
            raise Exception(f"Failed to cancel subscription: {str(e)}")
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify Razorpay webhook signature
        
        Args:
            payload: Raw webhook payload (string)
            signature: X-Razorpay-Signature header
        
        Returns:
            True if signature is valid
        """
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
        
        if not webhook_secret:
            raise ValueError("RAZORPAY_WEBHOOK_SECRET not configured")
        
        try:
            # Generate signature
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            return hmac.compare_digest(expected_signature, signature)
            
        except Exception as e:
            raise ValueError(f"Signature verification failed: {str(e)}")
    
    def create_payment_link(
        self,
        amount: int,
        description: str,
        customer_email: str,
        customer_name: str,
        user_id: int
    ) -> Dict:
        """
        Create a payment link (alternative to subscription)
        
        Args:
            amount: Amount in paise (₹6,500 = 650000 paise)
            description: Payment description
            customer_email: Customer email
            customer_name: Customer name
            user_id: Internal user ID
        
        Returns:
            Payment link details
        """
        try:
            payment_link = self.client.payment_link.create({
                "amount": amount,
                "currency": "INR",
                "description": description,
                "customer": {
                    "name": customer_name,
                    "email": customer_email
                },
                "notify": {
                    "sms": False,
                    "email": True
                },
                "reminder_enable": True,
                "notes": {
                    "user_id": str(user_id)
                },
                "callback_url": f"https://app.talentbox.co/payment/success",
                "callback_method": "get"
            })
            
            return {
                "payment_link_id": payment_link["id"],
                "short_url": payment_link["short_url"],
                "status": payment_link["status"]
            }
            
        except Exception as e:
            raise Exception(f"Failed to create payment link: {str(e)}")