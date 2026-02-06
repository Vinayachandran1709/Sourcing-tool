from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from database import Base
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime,
    ARRAY
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import math

# ===== USER MODEL =====

class User(Base):
    """Enhanced User model with subscription tracking"""
    __tablename__ = "users"
    
    # Basic info
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    company = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Subscription info
    plan = Column(String, default="free_trial")  # "free_trial", "starter"
    billing_cycle = Column(String, default="monthly")  # "monthly", "annual"
    subscription_status = Column(String, default="trial")  # "trial", "active", "cancelled", "expired"
    trial_start_date = Column(DateTime(timezone=True), server_default=func.now())
    trial_end_date = Column(DateTime(timezone=True), nullable=True)
    subscription_start_date = Column(DateTime(timezone=True), nullable=True)
    next_billing_date = Column(DateTime(timezone=True), nullable=True)
    
    # Additional info (collected on upgrade)
    company_website = Column(String, nullable=True)
    career_page_link = Column(String, nullable=True)
    
    # Usage tracking (reset monthly)
    usage_searches = Column(Integer, default=0)
    usage_profile_views = Column(Integer, default=0)
    usage_emails_sent = Column(Integer, default=0)
    usage_csv_exports = Column(Integer, default=0) 
    usage_reset_date = Column(DateTime(timezone=True), server_default=func.now())

    # ===== EMAIL OUTREACH FIELDS (ONE TEMPLATE) =====
    sender_email = Column(String, nullable=True)
    sender_name = Column(String, nullable=True)
    email_subject = Column(String, nullable=True)
    email_template = Column(Text, nullable=True)
    reply_method = Column(String, nullable=True)  # "email" or "form"
    reply_link = Column(String, nullable=True)  # URL for application form
    sender_email_verified = Column(Boolean, default=False)

    # Relationships
    saved_lists = relationship("SavedList", back_populates="user")

# ===== PROFILE MODEL =====

class Profile(Base):
    """Enhanced Profile model"""
    __tablename__ = "profiles"
    
    # Existing columns (KEEP ALL OF THESE)
    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    location = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    public_repos = Column(Integer, default=0)
    primary_language = Column(String, nullable=True)
    contributions_last_year = Column(Integer, default=0)
    portfolio_url = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    selected = Column(Boolean, default=False)
    last_fetched = Column(DateTime(timezone=True), server_default=func.now())
    
    # Enhanced columns (KEEP ALL OF THESE)
    languages_data = Column(JSON, nullable=True)
    top_repos = Column(JSON, nullable=True)
    last_active_date = Column(DateTime(timezone=True), nullable=True)
    total_stars = Column(Integer, default=0)
    developer_score = Column(Integer, default=0)
    
    # Caching columns (KEEP ALL OF THESE)
    cached_at = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String, default="github")
    
    # NEW: Role detection
    detected_roles = Column(JSON, nullable=True)  # [{"role": "Backend Developer", "confidence": 0.85}, ...]
    roles_analyzed_at = Column(DateTime(timezone=True), nullable=True)
    
    # NEW: Additional fields
    phone_number = Column(String, nullable=True)  # Fetch but NEVER show to users
    linkedin_url = Column(String, nullable=True)
    twitter_url = Column(String, nullable=True)
    personal_website = Column(String, nullable=True)

    def calculate_developer_score(self):
        """Calculate developer score (0-100)"""
        EXCELLENT_STARS = 3000
        EXCELLENT_REPOS = 100
        EXCELLENT_CONTRIBUTIONS = 1000
        MAX_LANGUAGES = 10
        ACTIVE_DAYS_THRESHOLD = 90
        
        stars_score = self._normalize_score(self.total_stars or 0, EXCELLENT_STARS)
        repos_score = self._normalize_score(self.public_repos or 0, EXCELLENT_REPOS)
        contributions_score = self._normalize_score(self.contributions_last_year or 0, EXCELLENT_CONTRIBUTIONS)
        recency_score = self._calculate_recency_score(self.last_active_date, ACTIVE_DAYS_THRESHOLD)
        
        num_languages = len(self.languages_data) if self.languages_data else 0
        language_score = self._normalize_score(num_languages, MAX_LANGUAGES)
        
        final_score = (
            (stars_score * 0.25) +
            (repos_score * 0.15) +
            (contributions_score * 0.30) +
            (recency_score * 0.20) +
            (language_score * 0.10)
        )
        
        score = int(round(final_score))
        return min(100, max(0, score))
    
    def _normalize_score(self, value, excellent_threshold):
        if value >= excellent_threshold:
            return 100
        ratio = value / excellent_threshold
        score = math.sqrt(ratio) * 100
        return min(100, score)
    
    def _calculate_recency_score(self, last_active, threshold_days):
        if not last_active:
            return 50
        now = datetime.now(timezone.utc)
        if last_active.tzinfo is None:
            last_active = last_active.replace(tzinfo=timezone.utc)
        days_ago = (now - last_active).days
        
        if days_ago <= threshold_days:
            return 100
        elif days_ago <= threshold_days * 2:
            return 75
        elif days_ago <= threshold_days * 4:
            return 50
        elif days_ago <= threshold_days * 8:
            return 25
        else:
            return 10


# ===== EXISTING MODELS (KEEP THESE) =====

class OutreachLog(Base):
    """Email outreach tracking"""
    __tablename__ = "outreach_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    email_sent_at = Column(DateTime(timezone=True), server_default=func.now())
    email_status = Column(String)
    error_message = Column(String, nullable=True)

class EmailOutreach(Base):
    """Track bulk email campaigns"""
    __tablename__ = "email_outreach"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # ← TRACK WHO SENT
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    subject = Column(Text)
    body = Column(Text)
    status = Column(String, default="sent")
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    company_email = Column(String)


# ===== NEW MODELS FOR MVP =====

class SavedList(Base):
    """User's saved candidate lists"""
    __tablename__ = "saved_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="saved_lists")
    profiles = relationship("SavedListProfile", back_populates="saved_list", cascade="all, delete-orphan")


class SavedListProfile(Base):
    """Many-to-many relationship between lists and profiles"""
    __tablename__ = "saved_list_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("saved_lists.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    
    # Relationships
    saved_list = relationship("SavedList", back_populates="profiles")
    profile = relationship("Profile")


class EmailTemplate(Base):
    """Email templates for outreach campaigns"""
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    template_type = Column(String, default="initial")  # "initial", "followup1", "followup2"
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmailCampaign(Base):
    """Track email campaigns with sequences"""
    __tablename__ = "email_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False)
    
    # Campaign details
    campaign_name = Column(String, nullable=True)
    enable_followups = Column(Boolean, default=True)
    
    # Email tracking
    initial_sent_at = Column(DateTime(timezone=True), nullable=True)
    followup1_sent_at = Column(DateTime(timezone=True), nullable=True)
    followup2_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Response tracking
    replied_at = Column(DateTime(timezone=True), nullable=True)
    reply_content = Column(Text, nullable=True)
    
    # Status
    status = Column(String, default="pending")  # "pending", "active", "replied", "completed", "bounced"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UsageLog(Base):
    """Detailed usage logging for analytics"""
    __tablename__ = "usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String, nullable=False)  # "search", "profile_view", "email_sent", "list_created"
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())