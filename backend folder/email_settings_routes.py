from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User
from auth_middleware import get_current_user
from usage_service import UsageService

router = APIRouter(prefix="/api/email-settings", tags=["Email Settings"])

# ===== REQUEST MODELS =====

class UpdateEmailSettingsRequest(BaseModel):
    sender_email: EmailStr
    email_template: str

class UpdateSenderEmailRequest(BaseModel):
    sender_email: EmailStr

class UpdateTemplateRequest(BaseModel):
    email_template: str

# ===== DEFAULT TEMPLATE =====

DEFAULT_EMAIL_TEMPLATE = """Hi {{name}},

I came across your GitHub profile and was impressed by your work on {{top_repo}}.

We're {{company}}, and we're looking for talented developers to join our team. Your expertise in {{primary_language}} would be a great fit for our current projects.

Would you be open to a quick chat about this opportunity?

Best regards,
{{sender_name}}"""

# ===== ENDPOINTS =====

@router.get("/settings")
def get_email_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's email settings (sender email + template).
    Returns default template if none set.
    """
    sender_email = current_user.sender_email or ""
    email_template = current_user.email_template or DEFAULT_EMAIL_TEMPLATE
    
    return {
        "sender_email": sender_email,
        "email_template": email_template,
        "has_sender_email": bool(sender_email),
        "has_custom_template": bool(current_user.email_template),
        "sender_email_verified": getattr(current_user, 'sender_email_verified', False)
    }


@router.post("/settings")
def update_email_settings(
    settings: UpdateEmailSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update both sender email and template.
    """
    current_user.sender_email = settings.sender_email
    current_user.email_template = settings.email_template
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "success": True,
        "message": "Email settings updated successfully",
        "sender_email": current_user.sender_email,
        "email_template": current_user.email_template
    }


@router.post("/sender-email")
def update_sender_email(
    request: UpdateSenderEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get email usage stats (used/remaining this month).
    """
    usage = UsageService.check_email_limit(db, current_user.id)
    
    return {
        "plan": current_user.plan,
        "usage": usage
    }