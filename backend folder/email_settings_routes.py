from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User
from auth_middleware import get_current_user
from usage_service import UsageService

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/api/email-settings", tags=["Email Settings"])

# ===== REQUEST MODELS =====

class UpdateEmailSettingsRequest(BaseModel):
    sender_email: EmailStr
    sender_name: Optional[str] = None
    email_subject: Optional[str] = None
    email_template: str
    reply_method: Optional[str] = "email"
    reply_link: Optional[str] = ""

class UpdateSenderEmailRequest(BaseModel):
    sender_email: EmailStr

class UpdateTemplateRequest(BaseModel):
    email_template: str

class SendTestEmailRequest(BaseModel):
    test_email: EmailStr

# ===== DEFAULT TEMPLATE =====

DEFAULT_EMAIL_TEMPLATE = """Hi {{name}},

I came across your GitHub profile and was impressed by your work.

We're looking for talented developers to join our team, and I think you'd be a great fit for our projects.

Would you be open to a quick chat about this opportunity?

Best regards"""

# ===== ENDPOINTS =====

@router.get("/settings")
def get_email_settings(
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get user's email settings (all 6 fields).
    Returns default template if none set.
    """
    sender_email = current_user.sender_email or ""
    email_template = current_user.email_template or DEFAULT_EMAIL_TEMPLATE

    return {
        "sender_email": sender_email,
        "sender_name": getattr(current_user, 'sender_name', '') or "",
        "email_subject": getattr(current_user, 'email_subject', '') or "",
        "email_template": email_template,
        "reply_method": getattr(current_user, 'reply_method', 'email') or "email",
        "reply_link": getattr(current_user, 'reply_link', '') or "",
        "has_sender_email": bool(sender_email),
        "has_custom_template": bool(current_user.email_template),
        "sender_email_verified": getattr(current_user, 'sender_email_verified', False)
    }


@router.post("/settings")
def update_email_settings(
    settings: UpdateEmailSettingsRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update all email settings (sender email, name, subject, template, reply method, reply link).
    """
    current_user.sender_email = settings.sender_email
    current_user.email_template = settings.email_template

    # Save all optional fields
    if settings.sender_name is not None:
        current_user.sender_name = settings.sender_name
    if settings.email_subject is not None:
        current_user.email_subject = settings.email_subject
    if settings.reply_method is not None:
        current_user.reply_method = settings.reply_method
    if settings.reply_link is not None:
        current_user.reply_link = settings.reply_link

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Email settings updated successfully",
        "sender_email": current_user.sender_email,
        "sender_name": current_user.sender_name,
        "email_subject": current_user.email_subject,
        "email_template": current_user.email_template,
        "reply_method": current_user.reply_method,
        "reply_link": current_user.reply_link
    }


@router.post("/sender-email")
def update_sender_email(
    request: UpdateSenderEmailRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update only sender email (for first-time setup).
    """
    current_user.sender_email = request.sender_email

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Sender email updated",
        "sender_email": current_user.sender_email
    }


@router.post("/template")
def update_template(
    request: UpdateTemplateRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update only email template.
    """
    current_user.email_template = request.email_template

    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Email template updated",
        "email_template": current_user.email_template
    }


@router.get("/usage")
def get_email_usage(
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get email usage stats (used/remaining this month).
    """
    usage = UsageService.check_email_limit(db, current_user.id)

    return {
        "plan": current_user.plan,
        "usage": usage
    }


# ===== TEST EMAIL ENDPOINT (FOR INTERNAL TESTING) =====

@router.post("/send-test")
def send_test_email(
    request: SendTestEmailRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Send a test email to verify settings are working.
    Uses the user's saved template and settings.
    Does NOT count against email limits.
    """
    from email_service import EmailService
    
    # Get user's email settings
    sender_email = current_user.sender_email
    if not sender_email:
        raise HTTPException(status_code=400, detail="Please configure your sender email first")
    
    sender_name = getattr(current_user, 'sender_name', '') or "TalentBox User"
    email_subject = getattr(current_user, 'email_subject', '') or "Test Email from TalentBox"
    email_template = current_user.email_template or DEFAULT_EMAIL_TEMPLATE
    reply_method = getattr(current_user, 'reply_method', 'email') or 'email'
    reply_link = getattr(current_user, 'reply_link', '') or ''
    
    # Create a fake profile for testing
    test_profile = {
        'id': 0,
        'name': 'Test Developer',
        'github_username': 'test-developer',
        'email': request.test_email
    }
    
    user_settings = {
        'sender_email': sender_email,
        'sender_name': sender_name,
        'email_subject': f"[TEST] {email_subject}",
        'email_template': email_template,
        'reply_method': reply_method,
        'reply_link': reply_link
    }
    
    # Send single test email
    results = EmailService.send_bulk_emails([test_profile], user_settings)
    
    if results['sent'] > 0:
        return {
            "success": True,
            "message": f"Test email sent to {request.test_email}",
            "details": {
                "from": f"{sender_name} <noreply@talentbox.co>",
                "reply_to": sender_email,
                "subject": f"[TEST] {email_subject}",
                "reply_method": reply_method,
                "form_link": reply_link if reply_method == 'form' else None
            }
        }
    else:
        error_msg = results['details'][0].get('error', 'Unknown error') if results['details'] else 'Unknown error'
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {error_msg}")