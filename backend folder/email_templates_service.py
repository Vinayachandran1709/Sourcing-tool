from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models import EmailTemplate, User
from fastapi import HTTPException

class EmailTemplatesService:
    """Handle email template management"""
    
    DEFAULT_TEMPLATES = [
        {
            "name": "Initial Outreach",
            "template_type": "initial",
            "subject": "Exciting opportunity at {{company}}",
            "body": """Hi {{name}},

I came across your GitHub profile and was impressed by your work on {{top_repo}}. 

We're {{company}}, and we're looking for talented {{role}} developers to join our team. Your expertise in {{primary_language}} would be a great fit for our current projects.

Would you be open to a quick chat about this opportunity?

Best regards,
{{sender_name}}
{{sender_company}}"""
        },
        {
            "name": "Follow-up 1",
            "template_type": "followup1",
            "subject": "Re: Opportunity at {{company}}",
            "body": """Hi {{name}},

I wanted to follow up on my previous email about the {{role}} position at {{company}}.

I understand you're busy, but I believe this could be a great opportunity for someone with your skills in {{primary_language}}.

Are you available for a brief 15-minute call this week?

Best,
{{sender_name}}"""
        },
        {
            "name": "Follow-up 2",
            "template_type": "followup2",
            "subject": "Last follow-up: {{company}} opportunity",
            "body": """Hi {{name}},

This is my last follow-up regarding the {{role}} position at {{company}}.

If you're not interested or the timing isn't right, no worries at all. But if you'd like to learn more, I'd be happy to chat.

Let me know!

Thanks,
{{sender_name}}"""
        }
    ]
    
    @staticmethod
    def create_default_templates(db: Session, user_id: int):
        """Create default templates for a new user"""
        for template_data in EmailTemplatesService.DEFAULT_TEMPLATES:
            # Check if already exists
            existing = db.query(EmailTemplate).filter(
                EmailTemplate.user_id == user_id,
                EmailTemplate.template_type == template_data["template_type"],
                EmailTemplate.is_default == True
            ).first()
            
            if not existing:
                template = EmailTemplate(
                    user_id=user_id,
                    name=template_data["name"],
                    template_type=template_data["template_type"],
                    subject=template_data["subject"],
                    body=template_data["body"],
                    is_default=True
                )
                db.add(template)
        
        db.commit()
    
    @staticmethod
    def create_template(db: Session, user_id: int, name: str, template_type: str, 
                       subject: str, body: str) -> EmailTemplate:
        """Create a custom template"""
        template = EmailTemplate(
            user_id=user_id,
            name=name,
            template_type=template_type,
            subject=subject,
            body=body,
            is_default=False
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        return template
    
    @staticmethod
    def get_user_templates(db: Session, user_id: int) -> List[EmailTemplate]:
        """Get all templates for a user"""
        return db.query(EmailTemplate).filter(
            EmailTemplate.user_id == user_id
        ).order_by(EmailTemplate.template_type, EmailTemplate.is_default.desc()).all()
    
    @staticmethod
    def get_template_by_type(db: Session, user_id: int, template_type: str) -> Optional[EmailTemplate]:
        """Get the default template of a specific type"""
        return db.query(EmailTemplate).filter(
            EmailTemplate.user_id == user_id,
            EmailTemplate.template_type == template_type,
            EmailTemplate.is_default == True
        ).first()
    
    @staticmethod
    def update_template(db: Session, template_id: int, user_id: int, 
                       name: Optional[str] = None, subject: Optional[str] = None, 
                       body: Optional[str] = None) -> EmailTemplate:
        """Update a template"""
        template = db.query(EmailTemplate).filter(
            EmailTemplate.id == template_id,
            EmailTemplate.user_id == user_id
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if name:
            template.name = name
        if subject:
            template.subject = subject
        if body:
            template.body = body
        
        db.commit()
        db.refresh(template)
        return template
    
    @staticmethod
    def delete_template(db: Session, template_id: int, user_id: int) -> Dict:
        """Delete a template (cannot delete default templates)"""
        template = db.query(EmailTemplate).filter(
            EmailTemplate.id == template_id,
            EmailTemplate.user_id == user_id
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if template.is_default:
            raise HTTPException(status_code=403, detail="Cannot delete default templates")
        
        db.delete(template)
        db.commit()
        
        return {"message": "Template deleted successfully"}
    
    @staticmethod
    def personalize_template(template: EmailTemplate, variables: Dict) -> Dict:
        """Replace template variables with actual values"""
        subject = template.subject
        body = template.body
        
        # Replace all variables
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"  # {{variable}}
            subject = subject.replace(placeholder, str(value or ""))
            body = body.replace(placeholder, str(value or ""))
        
        return {
            "subject": subject,
            "body": body
        }