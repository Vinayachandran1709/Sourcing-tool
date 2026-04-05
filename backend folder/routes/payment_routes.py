import os
import sys
import json
import hmac
import hashlib
import traceback
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import razorpay

logger = logging.getLogger(__name__)

# Add parent directory to path so we can import root-level modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth_middleware import get_current_user, get_current_user_no_subscription_check
from database import get_db

CurrentUser = Annotated[object, Depends(get_current_user)]
# For payment endpoints — allows expired-trial users to still upgrade
CurrentUserAnyStatus = Annotated[object, Depends(get_current_user_no_subscription_check)]
DbSession = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/api/payments", tags=["payments"])

# ============================================
# Initialize Razorpay Client
# ============================================

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")

if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    logger.warning("Razorpay credentials not configured!")
    razorpay_client = None
else:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ============================================
# Plan Configuration
# ============================================

PLANS = {
    "starter": {
        "name": "Starter",
        "price_monthly_usd": 39,
        "price_annual_usd": 390,
        "features": [
            "500 searches per month",
            "1,000 profile unlocks per month",
            "Send up to 1,000 emails per month",
            "50 CSV exports per month",
            "Unlimited saved profiles",
            "Access to 200,000+ developers",
            "Role, location & language filters",
            "Quality scores (0-100)",
            "Quick filters (iOS, Android, React, etc.)",
            "Email support",
        ],
    },
    "growth": {
        "name": "Growth",
        "price_monthly_usd": 79,
        "price_annual_usd": 790,
        "features": [
            "Unlimited searches",
            "3,000 profile unlocks per month",
            "Send up to 3,000 emails per month",
            "Unlimited CSV exports",
            "Unlimited saved profiles",
            "Access to 200,000+ developers",
            "All filters & quick filters",
            "Advanced quality scores",
            "Priority support (same-day response)",
        ],
    },
}

# USD to INR conversion (Razorpay requires INR for Indian merchants)
# Update this periodically or use a live rate API
USD_TO_INR_RATE = float(os.getenv("USD_TO_INR_RATE", "85.0"))

# ============================================
# Pydantic Models
# ============================================

class CreateOrderRequest(BaseModel):
    plan: str
    billing_cycle: str  # "monthly" or "annual"
    is_renewal: bool = False

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str
    billing_cycle: str

class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None

# ============================================
# Helper Functions
# ============================================

def get_plan_price(plan_name: str, billing_cycle: str) -> dict:
    """Get plan price in both USD and INR"""
    plan = PLANS.get(plan_name.lower())
    if not plan:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan_name}")

    if billing_cycle == "monthly":
        price_usd = plan["price_monthly_usd"]
    elif billing_cycle == "annual":
        price_usd = plan["price_annual_usd"]
    else:
        raise HTTPException(status_code=400, detail=f"Invalid billing cycle: {billing_cycle}")

    price_inr = int(price_usd * USD_TO_INR_RATE * 100)  # Razorpay expects paise

    return {
        "price_usd": price_usd,
        "price_inr": price_inr,
        "price_inr_display": price_usd * USD_TO_INR_RATE
    }

def calculate_next_billing_date(billing_cycle: str) -> datetime:
    """Calculate next billing date based on cycle"""
    now = datetime.now(timezone.utc)
    if billing_cycle == "monthly":
        return now + timedelta(days=30)
    elif billing_cycle == "annual":
        return now + timedelta(days=365)
    return now + timedelta(days=30)

def generate_receipt_id(user_id: int) -> str:
    """Generate unique receipt ID"""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"TB-{user_id}-{timestamp}"

def log_subscription_event(db: Session, user_id: int, event_type: str, old_plan: str, new_plan: str,
                           old_status: str, new_status: str, triggered_by: str, metadata: dict = None):
    """Log subscription changes for audit trail"""
    try:
        db.execute(text("""
            INSERT INTO subscription_events
            (user_id, event_type, old_plan, new_plan, old_status, new_status, triggered_by, metadata)
            VALUES (:user_id, :event_type, :old_plan, :new_plan, :old_status, :new_status, :triggered_by, :metadata)
        """), {
            "user_id": user_id,
            "event_type": event_type,
            "old_plan": old_plan,
            "new_plan": new_plan,
            "old_status": old_status,
            "new_status": new_status,
            "triggered_by": triggered_by,
            "metadata": json.dumps(metadata) if metadata else None,
        })
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log subscription event: {e}")

# ============================================
# API Endpoints
# ============================================
@router.post("/create-order")
async def create_order(request: CreateOrderRequest, current_user: CurrentUserAnyStatus, db: DbSession):
    """
    Create a Razorpay order for payment
    Returns order details to initialize Razorpay checkout on frontend
    """
    if not razorpay_client:
        logger.error("Razorpay client not initialized. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars.")
        raise HTTPException(status_code=500, detail="Payment system not configured. Razorpay credentials missing on server.")

    try:
        user_id = current_user.id
        user_email = current_user.email
        user_name = current_user.name or "Customer"

        # Validate plan
        if request.plan.lower() not in PLANS:
            raise HTTPException(status_code=400, detail=f"Invalid plan: {request.plan}")

        # Get pricing
        pricing = get_plan_price(request.plan, request.billing_cycle)
        receipt_id = generate_receipt_id(user_id)

        # Create Razorpay order
        try:
            order_data = {
                "amount": pricing["price_inr"],  # Amount in paise
                "currency": "INR",
                "receipt": receipt_id,
                "notes": {
                    "user_id": str(user_id),
                    "user_email": user_email,
                    "plan": request.plan,
                    "billing_cycle": request.billing_cycle,
                    "is_renewal": str(request.is_renewal),
                    "price_usd": str(pricing["price_usd"])
                }
            }

            order = razorpay_client.order.create(data=order_data)

        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to create payment order: {str(e)}")

        # Store order in database
        try:
            db.execute(text("""
                INSERT INTO payment_history
                (user_id, razorpay_order_id, amount, currency, amount_inr, plan_name, billing_cycle, status, receipt)
                VALUES (:user_id, :order_id, :amount, :currency, :amount_inr, :plan_name, :billing_cycle, :status, :receipt)
            """), {
                "user_id": user_id,
                "order_id": order["id"],
                "amount": pricing["price_usd"],
                "currency": "USD",
                "amount_inr": pricing["price_inr_display"],
                "plan_name": request.plan,
                "billing_cycle": request.billing_cycle,
                "status": "created",
                "receipt": receipt_id,
            })

            db.execute(text("""
                UPDATE users SET razorpay_order_id = :order_id WHERE id = :user_id
            """), {"order_id": order["id"], "user_id": user_id})

            db.commit()

        except Exception as e:
            db.rollback()
            logger.error(f"Database error storing order: {e}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to store order in database: {str(e)}")

        # Return order details for frontend
        return {
            "success": True,
            "order_id": order["id"],
            "amount": pricing["price_inr"],
            "amount_usd": pricing["price_usd"],
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID,
            "name": "TalentBox",
            "description": f"{PLANS[request.plan.lower()]['name']} Plan - {request.billing_cycle.capitalize()}",
            "prefill": {
                "name": user_name,
                "email": user_email
            },
            "notes": {
                "plan": request.plan,
                "billing_cycle": request.billing_cycle
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_order: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected payment error: {str(e)}")

@router.post("/verify")
async def verify_payment(request: VerifyPaymentRequest, current_user: CurrentUserAnyStatus, db: DbSession):
    """
    Verify Razorpay payment signature and activate subscription
    Called after successful payment on frontend
    """
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment system not configured")

    user_id = current_user.id

    # Verify signature
    try:
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
    except razorpay.errors.SignatureVerificationError:
        # Update payment status to failed
        try:
            db.execute(text("""
                UPDATE payment_history
                SET status = 'signature_failed', error_message = 'Invalid payment signature'
                WHERE razorpay_order_id = :order_id
            """), {"order_id": request.razorpay_order_id})
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # Get payment details from Razorpay
    try:
        payment = razorpay_client.payment.fetch(request.razorpay_payment_id)
    except Exception as e:
        logger.error(f"Failed to fetch payment details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch payment details")

    # Update database
    try:
        # Get current user data for event logging
        result = db.execute(text("SELECT plan, subscription_status FROM users WHERE id = :user_id"), {"user_id": user_id})
        old_user = result.fetchone()
        old_plan = old_user[0] if old_user else "free_trial"
        old_status = old_user[1] if old_user else "active"

        # Calculate dates
        now = datetime.now(timezone.utc)
        next_billing = calculate_next_billing_date(request.billing_cycle)

        # Get plan details
        plan_config = PLANS.get(request.plan.lower(), PLANS["starter"])
        price_usd = plan_config["price_monthly_usd"] if request.billing_cycle == "monthly" else plan_config["price_annual_usd"]

        # Update payment_history
        db.execute(text("""
            UPDATE payment_history
            SET status = 'captured',
                razorpay_payment_id = :payment_id,
                razorpay_signature = :signature,
                payment_method = :method,
                paid_at = :paid_at
            WHERE razorpay_order_id = :order_id
        """), {
            "payment_id": request.razorpay_payment_id,
            "signature": request.razorpay_signature,
            "method": payment.get("method", "unknown"),
            "paid_at": now,
            "order_id": request.razorpay_order_id,
        })

        # Update user subscription
        db.execute(text("""
            UPDATE users SET
                plan = :plan,
                subscription_status = 'active',
                billing_cycle = :billing_cycle,
                subscription_amount = :amount,
                next_billing_date = :next_billing,
                last_payment_date = :last_payment,
                trial_end_date = NULL,
                usage_searches = 0,
                usage_profile_views = 0,
                usage_emails_sent = 0,
                auto_renew = TRUE,
                razorpay_order_id = NULL
            WHERE id = :user_id
        """), {
            "plan": request.plan.lower(),
            "billing_cycle": request.billing_cycle,
            "amount": price_usd,
            "next_billing": next_billing,
            "last_payment": now,
            "user_id": user_id,
        })

        db.commit()

        # Log subscription event
        log_subscription_event(
            db, user_id,
            "subscription_activated",
            old_plan, request.plan.lower(),
            old_status, "active",
            "payment_verified",
            {"payment_id": request.razorpay_payment_id, "amount_usd": price_usd}
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Database error updating subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate subscription")

    return {
        "success": True,
        "message": "Payment verified and subscription activated",
        "subscription": {
            "plan": request.plan,
            "billing_cycle": request.billing_cycle,
            "status": "active",
            "next_billing_date": next_billing.isoformat()
        }
    }

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """
    Handle Razorpay webhook events
    Processes: payment.captured, payment.failed, order.paid
    """
    # Get raw body for signature verification
    body = await request.body()
    body_str = body.decode('utf-8')

    # Get signature from headers
    signature = request.headers.get("X-Razorpay-Signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    # Verify webhook signature
    if RAZORPAY_WEBHOOK_SECRET:
        expected_signature = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            logger.warning("Webhook signature verification failed")
            raise HTTPException(status_code=400, detail="Invalid signature")

    # Parse event
    try:
        event = json.loads(body_str)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("event")
    payload = event.get("payload", {})

    logger.info(f"Received webhook event: {event_type}")

    # Webhook doesn't have access to FastAPI DI, so we create a session manually
    from database import SessionLocal
    db = SessionLocal()
    try:
        if event_type == "payment.captured":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")

            db.execute(text("""
                UPDATE payment_history
                SET status = 'captured',
                    razorpay_payment_id = :payment_id,
                    payment_method = :method,
                    paid_at = NOW()
                WHERE razorpay_order_id = :order_id AND status != 'captured'
            """), {
                "payment_id": payment_id,
                "method": payment_entity.get("method"),
                "order_id": order_id,
            })
            db.commit()

        elif event_type == "payment.failed":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            error_desc = payment_entity.get("error_description", "Payment failed")

            db.execute(text("""
                UPDATE payment_history
                SET status = 'failed',
                    error_message = :error_desc
                WHERE razorpay_order_id = :order_id
            """), {"error_desc": error_desc, "order_id": order_id})
            db.commit()

        elif event_type == "order.paid":
            order_entity = payload.get("order", {}).get("entity", {})
            order_id = order_entity.get("id")

            db.execute(text("""
                UPDATE payment_history
                SET status = 'captured'
                WHERE razorpay_order_id = :order_id AND status = 'created'
            """), {"order_id": order_id})
            db.commit()

    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        db.rollback()
    finally:
        db.close()

    return {"status": "ok"}

@router.get("/status")
async def get_subscription_status(current_user: CurrentUserAnyStatus, db: DbSession):
    """
    Get current subscription status for the user
    Used by frontend to refresh subscription data
    """
    user_id = current_user.id

    result = db.execute(text("""
        SELECT
            plan,
            subscription_status,
            billing_cycle,
            subscription_amount,
            next_billing_date,
            trial_end_date,
            auto_renew,
            last_payment_date,
            usage_searches,
            usage_profile_views,
            usage_emails_sent
        FROM users WHERE id = :user_id
    """), {"user_id": user_id})

    user = result.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan = user[0] or "free_trial"

    # Import PLAN_LIMITS from usage_service for consistent limit lookups
    from usage_service import UsageService
    plan_limits = UsageService.PLAN_LIMITS.get(plan, UsageService.PLAN_LIMITS["free_trial"])
    limits = {
        "searches": plan_limits.get("searches", 25),
        "profile_unlocks": plan_limits.get("profile_unlocks", 50),
        "emails": plan_limits.get("emails", 50)
    }

    return {
        "success": True,
        "subscription": {
            "plan": plan,
            "plan_display": "Free Trial" if plan in ["free_trial", "free"] else PLANS.get(plan, {}).get("name", plan.capitalize()),
            "status": user[1] or "active",
            "billing_cycle": user[2] or "monthly",
            "amount": float(user[3]) if user[3] else 0,
            "next_billing_date": user[4].isoformat() if user[4] else None,
            "trial_end_date": user[5].isoformat() if user[5] else None,
            "auto_renew": user[6] if user[6] is not None else True,
            "last_payment_date": user[7].isoformat() if user[7] else None
        },
        "usage": {
            "searches": {"used": user[8] or 0, "limit": limits["searches"]},
            "profile_unlocks": {"used": user[9] or 0, "limit": limits["profile_unlocks"]},
            "emails": {"used": user[10] or 0, "limit": limits["emails"]}
        }
    }

@router.get("/history")
async def get_payment_history(current_user: CurrentUserAnyStatus, db: DbSession):
    """
    Get payment history for the user (only successful payments)
    """
    user_id = current_user.id

    result = db.execute(text("""
        SELECT
            razorpay_order_id,
            razorpay_payment_id,
            amount,
            currency,
            plan_name,
            billing_cycle,
            status,
            payment_method,
            created_at,
            paid_at,
            receipt
        FROM payment_history
        WHERE user_id = :user_id AND status = 'captured'
        ORDER BY paid_at DESC
        LIMIT 20
    """), {"user_id": user_id})

    payments = result.fetchall()

    history = []
    for p in payments:
        history.append({
            "order_id": p[0],
            "payment_id": p[1],
            "amount": float(p[2]) if p[2] else 0,
            "currency": p[3],
            "plan": p[4],
            "billing_cycle": p[5],
            "status": p[6],
            "payment_method": p[7],
            "created_at": p[8].isoformat() if p[8] else None,
            "paid_at": p[9].isoformat() if p[9] else None,
            "receipt": p[10]
        })

    return {
        "success": True,
        "payments": history
    }

@router.post("/cancel")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Cancel user's subscription
    User retains access until end of billing period
    """
    user_id = current_user.id

    result = db.execute(text("""
        SELECT plan, subscription_status, next_billing_date
        FROM users WHERE id = :user_id
    """), {"user_id": user_id})

    user = result.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_plan = user[0]
    current_status = user[1]
    next_billing = user[2]

    if current_plan in ["free_trial", "free"]:
        raise HTTPException(status_code=400, detail="No active subscription to cancel")

    if current_status == "cancelled":
        raise HTTPException(status_code=400, detail="Subscription already cancelled")

    try:
        # Mark as cancelled (but don't remove access until billing period ends)
        db.execute(text("""
            UPDATE users SET
                subscription_status = 'cancelled',
                auto_renew = FALSE
            WHERE id = :user_id
        """), {"user_id": user_id})

        db.commit()

        # Log cancellation
        log_subscription_event(
            db, user_id,
            "subscription_cancelled",
            current_plan, current_plan,
            current_status, "cancelled",
            "user_requested",
            {"reason": request.reason, "access_until": next_billing.isoformat() if next_billing else None}
        )

        return {
            "success": True,
            "message": "Subscription cancelled",
            "access_until": next_billing.isoformat() if next_billing else None
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Cancellation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

@router.get("/plans")
async def get_available_plans():
    """
    Get available subscription plans (public endpoint)
    """
    from usage_service import UsageService
    plans_response = []
    for key, plan in PLANS.items():
        plan_limits = UsageService.PLAN_LIMITS.get(key, {})
        plans_response.append({
            "id": key,
            "name": plan["name"],
            "price_monthly": plan["price_monthly_usd"],
            "price_annual": plan["price_annual_usd"],
            "features": plan["features"],
            "limits": {
                "searches": plan_limits.get("searches", 0),
                "profile_unlocks": plan_limits.get("profile_unlocks", 0),
                "emails": plan_limits.get("emails", 0)
            }
        })

    return {
        "success": True,
        "plans": plans_response,
        "currency": "USD"
    }

@router.get("/health")
async def payment_health_check():
    """
    Diagnostic endpoint to check payment system configuration.
    Checks Razorpay credentials and database tables.
    """
    checks = {
        "razorpay_key_id": bool(RAZORPAY_KEY_ID),
        "razorpay_key_secret": bool(RAZORPAY_KEY_SECRET),
        "razorpay_webhook_secret": bool(RAZORPAY_WEBHOOK_SECRET),
        "razorpay_client_initialized": razorpay_client is not None,
        "payment_history_table": False,
        "subscription_events_table": False,
        "users_payment_columns": False,
    }

    from database import SessionLocal
    db = SessionLocal()
    try:
        # Check payment_history table
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'payment_history'
            )
        """))
        checks["payment_history_table"] = result.scalar()

        # Check subscription_events table
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'subscription_events'
            )
        """))
        checks["subscription_events_table"] = result.scalar()

        # Check users table has payment columns
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'razorpay_order_id'
            )
        """))
        checks["users_payment_columns"] = result.scalar()
    except Exception as e:
        checks["db_error"] = str(e)
    finally:
        db.close()

    all_ok = all(v for k, v in checks.items() if k != "db_error")
    return {
        "success": all_ok,
        "checks": checks,
        "message": "All payment systems configured" if all_ok else "Some checks failed - see details"
    }
