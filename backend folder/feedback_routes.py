from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
import logging

from database import get_db
from models import User, Feedback
from auth_middleware import get_current_user

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]
from email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

ALLOWED_CATEGORIES = {"bug", "payment", "feature", "general", "other"}


class FeedbackRequest(BaseModel):
    category: str
    message: str
    page_url: str = None
    browser_info: str = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v not in ALLOWED_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(ALLOWED_CATEGORIES)}")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError("Message must be at least 10 characters")
        return v.strip()


@router.post("/submit")
def submit_feedback(
    request: FeedbackRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Submit feedback from authenticated user"""
    try:
        # Save to database
        feedback = Feedback(
            user_id=current_user.id,
            category=request.category,
            message=request.message,
            page_url=request.page_url,
            browser_info=request.browser_info,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)

        # Send email notification to admin
        _send_admin_notification(current_user, request, feedback.created_at)

        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "feedback_id": feedback.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to submit feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to submit feedback")


@router.get("/history")
def get_feedback_history(
    current_user: CurrentUser,
    db: DbSession,
):
    """Get user's feedback history"""
    feedbacks = (
        db.query(Feedback)
        .filter(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .limit(50)
        .all()
    )

    return {
        "success": True,
        "feedbacks": [
            {
                "id": f.id,
                "category": f.category,
                "message": f.message,
                "status": f.status,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None,
            }
            for f in feedbacks
        ],
    }


def _send_admin_notification(user: User, request: FeedbackRequest, timestamp):
    """Send email notification to admin about new feedback"""
    category_labels = {
        "bug": "Bug / Technical Issue",
        "payment": "Payment Issue",
        "feature": "Feature Request",
        "general": "General Feedback",
        "other": "Other",
    }

    subject = f"[TalentBox Feedback] {category_labels.get(request.category, request.category)} from {user.email}"

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff5f2; border-left: 4px solid #FF6B35; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <h2 style="margin: 0 0 8px 0; color: #FF6B35;">New Feedback Received</h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">{timestamp.strftime('%B %d, %Y at %I:%M %p UTC') if timestamp else 'Just now'}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #374151; width: 140px;">Category</td>
                <td style="padding: 12px 0; color: #1a1a1a;">{category_labels.get(request.category, request.category)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">User Email</td>
                <td style="padding: 12px 0; color: #1a1a1a;">{user.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">User Name</td>
                <td style="padding: 12px 0; color: #1a1a1a;">{user.name or 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">Company</td>
                <td style="padding: 12px 0; color: #1a1a1a;">{user.company or 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">Plan</td>
                <td style="padding: 12px 0; color: #1a1a1a;">{user.plan} ({user.subscription_status})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">Page URL</td>
                <td style="padding: 12px 0; color: #1a1a1a;">{request.page_url or 'N/A'}</td>
            </tr>
        </table>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">Message</h3>
            <p style="margin: 0; color: #1a1a1a; white-space: pre-wrap;">{request.message}</p>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
            <p>Browser: {request.browser_info or 'N/A'}</p>
        </div>
    </body>
    </html>
    """

    try:
        result = EmailService.send_single_email(
            to_email="vinay@talentbox.co",
            subject=subject,
            body_html=body_html,
            sender_email="noreply@talentbox.co",
            sender_name="TalentBox Feedback",
        )
        if result["success"]:
            logger.info(f"Feedback notification sent for user {user.email}")
        else:
            logger.warning(f"Failed to send feedback notification: {result.get('error')}")
    except Exception as e:
        logger.error(f"Error sending feedback notification: {e}")
