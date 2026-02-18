from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models import EmailCampaign, Profile, User
from usage_service import UsageService
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

# ⭐ SETUP LOGGING
logger = logging.getLogger(__name__)


class CampaignService:
    """Handle email campaign management and sending"""
    
    @staticmethod
    def create_campaign(db: Session, user_id: int, profile_id: int, 
                       campaign_name: Optional[str] = None, 
                       enable_followups: bool = True) -> EmailCampaign:
        """Create a new email campaign for a profile"""
        campaign = EmailCampaign(
            user_id=user_id,
            profile_id=profile_id,
            campaign_name=campaign_name,
            enable_followups=enable_followups,
            status="pending"
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        return campaign
    
    @staticmethod
    def get_profile_variables(profile: Profile) -> Dict:
        """Extract variables from profile for template personalization"""
        # Get top repo name
        top_repo = ""
        if profile.top_repos and len(profile.top_repos) > 0:
            top_repo = profile.top_repos[0].get("name", "")
        
        # Get primary language
        primary_language = profile.primary_language or "your tech stack"
        
        return {
            "name": profile.name or profile.github_username,
            "github_username": profile.github_username,
            "primary_language": primary_language,
            "top_repo": top_repo,
            "location": profile.location or "your area",
            "bio": profile.bio or ""
        }
    
    @staticmethod
    def send_email_smtp(sender_email: str, sender_password: str, 
                       recipient_email: str, subject: str, body: str) -> bool:
        """Send email via SMTP (Gmail)"""
        try:
            msg = MIMEMultipart()
            msg["From"] = sender_email
            msg["To"] = recipient_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))
            
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"✅ Email sent to {recipient_email}")
            print(f"✅ Email sent to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send email to {recipient_email}: {e}")
            print(f"❌ Failed to send email to {recipient_email}: {e}")
            return False
    
    @staticmethod
    def send_initial_email(db: Session, campaign_id: int, user_variables: Dict) -> Dict:
        """Send initial campaign email"""
        
        # ⭐ ADD LOGGING
        logger.info(f"Sending initial email for campaign {campaign_id}")
        
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Check usage limits
        try:
            UsageService.check_limit(db, campaign.user_id, "email_sent")
        except HTTPException as e:
            campaign.status = "failed"
            db.commit()
            raise e
        
        # Get profile
        profile = db.query(Profile).filter(Profile.id == campaign.profile_id).first()
        if not profile or not profile.email:
            raise HTTPException(status_code=400, detail="Profile has no email")
        
        # Get user
        user = db.query(User).filter(User.id == campaign.user_id).first()
        
        # Prepare variables
        profile_vars = CampaignService.get_profile_variables(profile)
        all_vars = {**profile_vars, **user_variables}

        # Get subject and body from user_variables and personalize
        subject = user_variables.get("subject", "Opportunity for you")
        body = user_variables.get("body", "")
        for key, value in all_vars.items():
            subject = subject.replace("{{" + key + "}}", str(value))
            body = body.replace("{{" + key + "}}", str(value))
        personalized = {"subject": subject, "body": body}
        
        # Get email credentials
        sender_email = os.getenv("COMPANY_EMAIL")
        sender_password = os.getenv("COMPANY_EMAIL_PASSWORD")
        
        if not sender_email or not sender_password:
            raise HTTPException(status_code=500, detail="Email credentials not configured")
        
        # Send email
        success = CampaignService.send_email_smtp(
            sender_email, sender_password,
            profile.email,
            personalized["subject"],
            personalized["body"]
        )
        
        if success:
            campaign.initial_sent_at = datetime.now(timezone.utc)
            campaign.status = "active"
            UsageService.log_usage(db, campaign.user_id, "email_sent", {"campaign_id": campaign_id}, increment_counter=True)
            db.commit()
            
            logger.info(f"Initial email sent successfully for campaign {campaign_id}")
            
            return {
                "success": True,
                "message": "Initial email sent",
                "campaign_id": campaign_id
            }
        else:
            campaign.status = "failed"
            db.commit()
            raise HTTPException(status_code=500, detail="Failed to send email")
    
    @staticmethod
    def send_bulk_campaign(db: Session, user_id: int, profile_ids: List[int], 
                          campaign_name: str, user_variables: Dict, 
                          enable_followups: bool = True) -> Dict:
        """
        Create and send campaigns to multiple profiles.
        ⭐ NOW WITH TRANSACTION ROLLBACK using savepoints!
        """
        results = {
            "sent": 0,
            "failed": 0,
            "errors": []
        }
        
        logger.info(f"Starting bulk campaign for user {user_id}, {len(profile_ids)} profiles")
        
        for profile_id in profile_ids:
            # ⭐ CREATE SAVEPOINT for each campaign (allows individual rollback)
            savepoint = db.begin_nested()
            
            try:
                # Create campaign
                campaign = CampaignService.create_campaign(
                    db, user_id, profile_id, campaign_name, enable_followups
                )
                
                # Send initial email
                CampaignService.send_initial_email(db, campaign.id, user_variables)
                
                # ⭐ COMMIT this individual campaign
                savepoint.commit()
                results["sent"] += 1
                
            except Exception as e:
                # ⭐ ROLLBACK only this campaign, continue with others
                savepoint.rollback()
                results["failed"] += 1
                results["errors"].append(f"Profile {profile_id}: {str(e)}")
                logger.error(f"❌ Failed to send to profile {profile_id}: {e}")
                print(f"❌ Failed to send to profile {profile_id}: {e}")
        
        # ⭐ COMMIT all successful campaigns
        db.commit()
        
        logger.info(f"Bulk campaign complete: {results['sent']} sent, {results['failed']} failed")
        
        return results
    
    @staticmethod
    def get_pending_followups(db: Session) -> List[EmailCampaign]:
        """Get campaigns that need follow-up emails sent"""
        now = datetime.now(timezone.utc)
        
        campaigns = db.query(EmailCampaign).filter(
            EmailCampaign.enable_followups == True,
            EmailCampaign.replied_at.is_(None),
            EmailCampaign.status == "active"
        ).all()
        
        pending = []
        
        for campaign in campaigns:
            # Check if needs followup1 (3 days after initial)
            if campaign.initial_sent_at and not campaign.followup1_sent_at:
                days_since_initial = (now - campaign.initial_sent_at).days
                if days_since_initial >= 3:
                    campaign.next_action = "followup1"
                    pending.append(campaign)
            
            # Check if needs followup2 (4 days after followup1)
            elif campaign.followup1_sent_at and not campaign.followup2_sent_at:
                days_since_followup1 = (now - campaign.followup1_sent_at).days
                if days_since_followup1 >= 4:
                    campaign.next_action = "followup2"
                    pending.append(campaign)
        
        return pending
    
    @staticmethod
    def send_followup(db: Session, campaign_id: int, followup_type: str, 
                     user_variables: Dict) -> Dict:
        """Send a follow-up email"""
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Check if already sent
        if followup_type == "followup1" and campaign.followup1_sent_at:
            return {"message": "Followup 1 already sent"}
        if followup_type == "followup2" and campaign.followup2_sent_at:
            return {"message": "Followup 2 already sent"}
        
        # Get profile
        profile = db.query(Profile).filter(Profile.id == campaign.profile_id).first()
        if not profile or not profile.email:
            raise HTTPException(status_code=400, detail="Profile has no email")
        
        # Prepare variables
        profile_vars = CampaignService.get_profile_variables(profile)
        all_vars = {**profile_vars, **user_variables}

        # Get subject and body from user_variables and personalize
        subject = user_variables.get("subject", f"Following up - {followup_type}")
        body = user_variables.get("body", "")
        for key, value in all_vars.items():
            subject = subject.replace("{{" + key + "}}", str(value))
            body = body.replace("{{" + key + "}}", str(value))
        personalized = {"subject": subject, "body": body}
        
        # Get email credentials
        sender_email = os.getenv("COMPANY_EMAIL")
        sender_password = os.getenv("COMPANY_EMAIL_PASSWORD")
        
        # Send email (but DON'T count toward usage - followups are free)
        success = CampaignService.send_email_smtp(
            sender_email, sender_password,
            profile.email,
            personalized["subject"],
            personalized["body"]
        )
        
        if success:
            if followup_type == "followup1":
                campaign.followup1_sent_at = datetime.now(timezone.utc)
            elif followup_type == "followup2":
                campaign.followup2_sent_at = datetime.now(timezone.utc)
                campaign.status = "completed"  # No more followups
            
            db.commit()
            
            return {
                "success": True,
                "message": f"{followup_type} sent",
                "campaign_id": campaign_id
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send follow-up")
    
    @staticmethod
    def mark_as_replied(db: Session, campaign_id: int, reply_content: Optional[str] = None) -> Dict:
        """Mark campaign as replied (stops follow-ups)"""
        campaign = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign.replied_at = datetime.now(timezone.utc)
        campaign.reply_content = reply_content
        campaign.status = "replied"
        
        db.commit()
        
        return {"message": "Campaign marked as replied", "campaign_id": campaign_id}
    
    @staticmethod
    def get_user_campaigns(db: Session, user_id: int, status: Optional[str] = None) -> List[Dict]:
        """Get all campaigns for a user"""
        query = db.query(EmailCampaign).filter(EmailCampaign.user_id == user_id)
        
        if status:
            query = query.filter(EmailCampaign.status == status)
        
        campaigns = query.order_by(EmailCampaign.created_at.desc()).all()
        
        result = []
        for campaign in campaigns:
            profile = db.query(Profile).filter(Profile.id == campaign.profile_id).first()
            
            result.append({
                "id": campaign.id,
                "campaign_name": campaign.campaign_name,
                "profile": {
                    "id": profile.id if profile else None,
                    "name": profile.name if profile else None,
                    "github_username": profile.github_username if profile else None,
                    "email": profile.email if profile else None
                },
                "status": campaign.status,
                "initial_sent_at": campaign.initial_sent_at,
                "followup1_sent_at": campaign.followup1_sent_at,
                "followup2_sent_at": campaign.followup2_sent_at,
                "replied_at": campaign.replied_at,
                "enable_followups": campaign.enable_followups,
                "created_at": campaign.created_at
            })
        
        return result