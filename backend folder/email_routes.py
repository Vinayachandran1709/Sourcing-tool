from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from email_templates_service import EmailTemplatesService
from campaign_service import CampaignService
from auth_middleware import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/api/emails", tags=["Email Campaigns"])

# ===== REQUEST MODELS =====

class CreateTemplateRequest(BaseModel):
    name: str
    template_type: str  # "initial", "followup1", "followup2", "custom"
    subject: str
    body: str

class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None

class SendCampaignRequest(BaseModel):
    profile_ids: List[int]
    campaign_name: str
    sender_name: str
    sender_company: str
    role: str  # Job role being hired for
    enable_followups: bool = True

class MarkRepliedRequest(BaseModel):
    reply_content: Optional[str] = None


# ===== TEMPLATE ENDPOINTS =====

@router.post("/templates/create-defaults")
def create_default_templates(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create default email templates for user"""
    user_id = current_user["id"]
    EmailTemplatesService.create_default_templates(db, user_id)
    return {"message": "Default templates created"}


@router.get("/templates")
def get_templates(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all templates for user"""
    user_id = current_user["id"]
    templates = EmailTemplatesService.get_user_templates(db, user_id)
    
    return {
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "template_type": t.template_type,
                "subject": t.subject,
                "body": t.body,
                "is_default": t.is_default,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in templates
        ]
    }


@router.post("/templates/create")
def create_template(
    request: CreateTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create custom template"""
    user_id = current_user["id"]
    template = EmailTemplatesService.create_template(
        db, user_id, request.name, request.template_type, request.subject, request.body
    )
    return {
        "message": "Template created",
        "template_id": template.id
    }


@router.put("/templates/{template_id}")
def update_template(
    template_id: int,
    request: UpdateTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update template"""
    user_id = current_user["id"]
    template = EmailTemplatesService.update_template(
        db, template_id, user_id, request.name, request.subject, request.body
    )
    return {
        "message": "Template updated",
        "template": {
            "id": template.id,
            "name": template.name,
            "subject": template.subject
        }
    }


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete template"""
    user_id = current_user["id"]
    result = EmailTemplatesService.delete_template(db, template_id, user_id)
    return result


# ===== CAMPAIGN ENDPOINTS =====

@router.post("/campaigns/send")
def send_campaign(
    request: SendCampaignRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send bulk email campaign with automated follow-ups"""
    user_id = current_user["id"]
    
    user_variables = {
        "sender_name": request.sender_name,
        "sender_company": request.sender_company,
        "company": request.sender_company,
        "role": request.role
    }
    
    results = CampaignService.send_bulk_campaign(
        db, user_id, request.profile_ids, request.campaign_name, 
        user_variables, request.enable_followups
    )
    
    return {
        "message": "Campaign sent",
        "sent": results["sent"],
        "failed": results["failed"],
        "errors": results["errors"]
    }


@router.get("/campaigns")
def get_campaigns(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all campaigns for user"""
    user_id = current_user["id"]
    campaigns = CampaignService.get_user_campaigns(db, user_id, status)
    return {
        "campaigns": campaigns,
        "total": len(campaigns)
    }


@router.post("/campaigns/{campaign_id}/reply")
def mark_campaign_replied(
    campaign_id: int,
    request: MarkRepliedRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark campaign as replied (stops follow-ups)"""
    user_id = current_user["id"]
    result = CampaignService.mark_as_replied(db, campaign_id, request.reply_content)
    return result


@router.get("/campaigns/pending-followups")
def get_pending_followups(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get campaigns that need follow-ups (for background worker)"""
    user_id = current_user["id"]
    campaigns = CampaignService.get_pending_followups(db)
    
    return {
        "pending": [
            {
                "campaign_id": c.id,
                "profile_id": c.profile_id,
                "next_action": getattr(c, "next_action", None),
                "days_since_last": (
                    (datetime.now(timezone.utc) - c.initial_sent_at).days 
                    if c.initial_sent_at else 0
                )
            }
            for c in campaigns
        ],
        "total": len(campaigns)
    }