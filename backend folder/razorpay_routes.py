from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from razorpay_service import RazorpayService
from razorpay_webhook_handler import RazorpayWebhookHandler
from models import User
import logging
import json

router = APIRouter(prefix="/api/razorpay", tags=["Razorpay Payments"])
logger = logging.getLogger(__name__)

# Request Models
class CreateSubscriptionRequest(BaseModel):
    plan: str = "starter"  # "starter"
    billing_cycle: str = "monthly"  # "monthly" or "annual"
    customer_name: str
    customer_contact: str  # 10-digit phone number

class UpdateCompanyInfoRequest(BaseModel):
    company_website: Optional[str] = None
    career_page_link: Optional[str] = None

# ===== SUBSCRIPTION ENDPOINTS =====

@router.post("/create-subscription")
def create_subscription(
    request: CreateSubscriptionRequest,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """Create Razorpay subscription"""
    
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already subscribed
    if user.plan != "free" and user.subscription_status == "active":
        raise HTTPException(status_code=400, detail="User already has active subscription")
    
    try:
        # Initialize Razorpay service
        razorpay_service = RazorpayService()
        
        # Get plan ID
        plan_key = f"{request.plan}_{request.billing_cycle}"
        plan_id = razorpay_service.PLAN_IDS.get(plan_key)
        
        if not plan_id:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {plan_key}")
        
        # Create subscription
        subscription = razorpay_service.create_subscription(
            plan_id=plan_id,
            customer_email=user.email,
            customer_name=request.customer_name,
            customer_contact=request.customer_contact,
            user_id=user.id,
            notify_customer=True
        )
        
        return {
            "success": True,
            "subscription_id": subscription["subscription_id"],
            "payment_link": subscription["short_url"],
            "status": subscription["status"],
            "message": "Subscription created! Please complete payment using the link."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscription/{subscription_id}")
def get_subscription_status(subscription_id: str):
    """Get subscription details"""
    try:
        razorpay_service = RazorpayService()
        subscription = razorpay_service.retrieve_subscription(subscription_id)
        return subscription
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel-subscription")
def cancel_subscription(
    cancel_at_cycle_end: bool = True,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """Cancel user's subscription"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.razorpay_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    
    try:
        razorpay_service = RazorpayService()
        result = razorpay_service.cancel_subscription(
            user.razorpay_subscription_id,
            cancel_at_cycle_end
        )
        
        # Update user status
        if cancel_at_cycle_end:
            user.subscription_status = "canceling"
        else:
            user.plan = "free"
            user.subscription_status = "canceled"
        
        db.commit()
        
        return {
            "success": True,
            "message": "Subscription canceled" if not cancel_at_cycle_end else "Subscription will cancel at period end",
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== COMPANY INFO =====

@router.post("/update-company-info")
def update_company_info(
    request: UpdateCompanyInfoRequest,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """Update company information (collected after payment)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if request.company_website:
        user.company_website = request.company_website
    
    if request.career_page_link:
        user.career_page_link = request.career_page_link
    
    db.commit()
    
    return {
        "success": True,
        "message": "Company information updated"
    }

# ===== WEBHOOK ENDPOINT =====

@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Razorpay webhooks
    
    Events handled:
    - subscription.activated
    - subscription.charged
    - subscription.cancelled
    - subscription.halted
    - payment.failed
    """
    
    # Get raw body for signature verification
    body = await request.body()
    payload = body.decode('utf-8')
    
    # Get signature from header
    signature = request.headers.get("X-Razorpay-Signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")
    
    try:
        # Verify webhook signature
        razorpay_service = RazorpayService()
        is_valid = razorpay_service.verify_webhook_signature(payload, signature)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse event data
        event_data = json.loads(payload)
        event_type = event_data.get("event")
        
        logger.info(f"Received webhook: {event_type}")
        
        # Handle different event types
        if event_type == "subscription.activated":
            RazorpayWebhookHandler.handle_subscription_activated(event_data, db)
        
        elif event_type == "subscription.charged":
            RazorpayWebhookHandler.handle_subscription_charged(event_data, db)
        
        elif event_type == "subscription.cancelled":
            RazorpayWebhookHandler.handle_subscription_cancelled(event_data, db)
        
        elif event_type == "subscription.halted":
            RazorpayWebhookHandler.handle_subscription_halted(event_data, db)
        
        elif event_type == "payment.failed":
            RazorpayWebhookHandler.handle_payment_failed(event_data, db)
        
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Webhook handler error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== SUBSCRIPTION INFO =====

@router.get("/subscription-info")
def get_subscription_info(user_id: int = 1, db: Session = Depends(get_db)):
    """Get current subscription information"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "plan": user.plan,
        "billing_cycle": user.billing_cycle,
        "subscription_status": user.subscription_status,
        "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None,
        "next_billing_date": user.next_billing_date.isoformat() if user.next_billing_date else None,
        "razorpay_subscription_id": user.razorpay_subscription_id,
        "company_website": user.company_website,
        "career_page_link": user.career_page_link
    }