from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSON, ARRAY, JSONB
from sqlalchemy.sql import func
from database import Base
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

    # GraphQL-sourced fields
    followers = Column(Integer, default=0)
    is_hireable = Column(Boolean, default=False)

    # Smart refresh fields
    refresh_category = Column(String(20), default="dormant")  # "active", "moderate", "dormant"
    last_refreshed_at = Column(DateTime(timezone=True), nullable=True)

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


# ===== GITHUB DEVELOPER INDEX MODEL =====

class GithubDeveloper(Base):
    __tablename__ = "github_developers"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String(255), unique=True, nullable=False, index=True)

    # Basic Info
    name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    email = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    profile_url = Column(String(500), nullable=True)
    account_type = Column(String(20), default="User")  # "User" or "Organization"

    # Location (Normalized)
    location_raw = Column(String(255), nullable=True)  # Original from GitHub
    location_city = Column(String(100), nullable=True, index=True)  # Normalized: "san francisco"
    location_state = Column(String(100), nullable=True)  # "california"
    location_country = Column(String(100), default="United States")

    # Technical Info
    primary_languages = Column(ARRAY(String), nullable=True)  # ['Python', 'JavaScript']
    all_languages = Column(JSONB, nullable=True)  # {"Python": 50000, "JavaScript": 30000}
    detected_role = Column(String(100), nullable=True)  # "Frontend Developer"
    detected_roles = Column(ARRAY(String), nullable=True)  # All applicable roles e.g. ["Backend Developer", "AI/ML Engineer"]

    # Activity Metrics
    public_repos = Column(Integer, default=0)
    followers = Column(Integer, default=0)
    following = Column(Integer, default=0)
    total_stars = Column(Integer, default=0)
    total_forks = Column(Integer, default=0)
    contributions_last_year = Column(Integer, default=0)

    # Dates
    github_created_at = Column(DateTime, nullable=True)
    last_active_at = Column(DateTime, nullable=True)

    # Scoring
    developer_score = Column(Integer, default=0, index=True)

    # Metadata
    source = Column(String(50), default="search_api")  # "search_api", "bulk_seed", "user_search"
    indexed_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def calculate_score(self):
        """Calculate developer score based on activity metrics."""
        score = 0

        # Followers (max 25 points)
        if self.followers:
            if self.followers >= 1000:
                score += 25
            elif self.followers >= 500:
                score += 20
            elif self.followers >= 100:
                score += 15
            elif self.followers >= 50:
                score += 10
            elif self.followers >= 10:
                score += 5

        # Repos (max 20 points)
        if self.public_repos:
            if self.public_repos >= 50:
                score += 20
            elif self.public_repos >= 30:
                score += 15
            elif self.public_repos >= 15:
                score += 10
            elif self.public_repos >= 5:
                score += 5

        # Stars (max 25 points)
        if self.total_stars:
            if self.total_stars >= 500:
                score += 25
            elif self.total_stars >= 100:
                score += 20
            elif self.total_stars >= 50:
                score += 15
            elif self.total_stars >= 10:
                score += 10
            elif self.total_stars >= 1:
                score += 5

        # Recent activity (max 15 points)
        if self.last_active_at:
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            if self.last_active_at.tzinfo is None:
                last_active = self.last_active_at.replace(tzinfo=timezone.utc)
            else:
                last_active = self.last_active_at

            days_since_active = (now - last_active).days
            if days_since_active <= 7:
                score += 15
            elif days_since_active <= 30:
                score += 12
            elif days_since_active <= 90:
                score += 8
            elif days_since_active <= 180:
                score += 4

        # Bio present (5 points)
        if self.bio and len(self.bio.strip()) > 20:
            score += 5

        # Email present (5 points)
        if self.email:
            score += 5

        # Multiple languages (5 points)
        if self.primary_languages and len(self.primary_languages) >= 3:
            score += 5

        self.developer_score = min(score, 100)
        return self.developer_score

    __table_args__ = (
        Index('ix_github_developers_city_role', 'location_city', 'detected_role'),
        Index('ix_github_developers_score_desc', developer_score.desc()),
        Index('ix_github_developers_languages', 'primary_languages', postgresql_using='gin'),
    )


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


class Feedback(Base):
    """User feedback and support requests"""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)  # 'bug', 'payment', 'feature', 'general', 'other'
    message = Column(Text, nullable=False)
    page_url = Column(String(500), nullable=True)
    browser_info = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="new")  # 'new', 'in_progress', 'resolved'
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")


# ===== RATE LIMITING & PROTECTION MODELS =====

class SearchLock(Base):
    """Track concurrent search locks per user (PostgreSQL-based, no Redis)"""
    __tablename__ = "search_locks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    locked_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    search_completed = Column(Boolean, default=False)


class RateLimitEvent(Base):
    """Log GitHub API rate limit events for monitoring"""
    __tablename__ = "rate_limit_events"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(20), nullable=False)  # '429', '403', 'secondary'
    status_code = Column(Integer, nullable=False)
    retry_after = Column(Integer, nullable=True)
    rate_limit_remaining = Column(Integer, nullable=True)
    rate_limit_resource = Column(String(50), nullable=True)
    endpoint = Column(String(200), nullable=True)
    occurred_at = Column(DateTime(timezone=True), server_default=func.now())


# ===== SMART REFRESH MODELS =====

class ProfileUnlock(Base):
    """Track which profiles were unlocked by recruiters (for refresh priority)"""
    __tablename__ = "profile_unlocks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())


class RefreshJobLog(Base):
    """Log nightly profile refresh job runs"""
    __tablename__ = "refresh_job_log"
    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    profiles_refreshed = Column(Integer, default=0)
    profiles_failed = Column(Integer, default=0)
    status = Column(String(20), default="running")


# ===== NEW MODELS FOR PIVOT (PHASE 1) =====

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    github_username = Column(String(255), nullable=True, index=True)
    linkedin_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    resume_path = Column(String(500), nullable=True)  # Path to uploaded resume file
    avatar_url = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)

    # Onboarding progress
    onboarding_status = Column(String(50), default="pending")
    # Values: pending → github_imported → conversation_started → conversation_complete → profile_ready

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    profile = relationship("CandidateProfile", back_populates="candidate", uselist=False)

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Data from automated import
    github_analysis = Column(JSONB, default={})    # Deep GitHub analysis results
    resume_data = Column(JSONB, default={})         # Parsed resume data
    portfolio_data = Column(JSONB, default={})      # Parsed portfolio data

    # Data from AI conversation
    conversation_data = Column(JSONB, default={})   # Full conversation transcript + extracted data
    career_preferences = Column(JSONB, default={})  # Work style, startup-fit, compensation, etc.
    technical_assessment = Column(JSONB, default={}) # Technical verification results

    # AI-generated profile
    ai_summary = Column(Text, nullable=True)         # 3-4 sentence professional summary
    detected_role = Column(String(100), nullable=True)  # Primary role e.g. "Backend Developer"
    detected_roles = Column(JSONB, default=[])        # All applicable roles
    seniority_level = Column(String(50), nullable=True) # Junior/Mid-Level/Senior/Staff/Expert
    skills = Column(JSONB, default=[])                # Structured skills list with confidence

    # Scores
    engineering_maturity_score = Column(Integer, default=0)  # 0-100
    profile_quality_score = Column(Integer, default=0)       # 0-100

    # Match readiness
    match_ready = Column(Boolean, default=False)  # True when profile is complete enough for matching

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    candidate = relationship("Candidate", back_populates="profile")

class DiscoveredStartup(Base):
    __tablename__ = "discovered_startups"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=True, unique=True, index=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)

    # Funding info
    funding_stage = Column(String(50), nullable=True)  # pre-seed, seed, series_a, series_b, etc.
    funding_amount = Column(String(100), nullable=True)
    investors = Column(JSONB, default=[])  # ["YC", "a16z", "Sequoia"]

    # Company metadata
    team_size = Column(String(50), nullable=True)  # "1-10", "11-50", "51-200", etc.
    category = Column(String(100), nullable=True)  # "AI/ML", "fintech", "devtools", etc.
    location = Column(String(255), nullable=True)
    remote_policy = Column(String(50), nullable=True)  # "remote", "hybrid", "onsite"

    # ATS info
    ats_provider = Column(String(50), nullable=True)  # "greenhouse", "lever", "ashby", etc.
    ats_slug = Column(String(255), nullable=True)
    careers_url = Column(String(500), nullable=True)

    # Tracking
    source = Column(String(50), default="manual")  # "yc", "vc_portfolio", "funding_news", "manual"
    is_active = Column(Boolean, default=True)
    last_crawled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), nullable=True)  # ATS job ID for dedup
    startup_id = Column(Integer, ForeignKey("discovered_startups.id", ondelete="SET NULL"), nullable=True)

    # Company info (denormalized for jobs without a discovered_startup record)
    company_name = Column(String(255), nullable=False)
    company_domain = Column(String(255), nullable=True)
    company_logo_url = Column(String(500), nullable=True)
    funding_stage = Column(String(50), nullable=True)
    investors_summary = Column(String(500), nullable=True)

    # Job details
    title = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    description_text = Column(Text, nullable=True)
    description_html = Column(Text, nullable=True)

    # Structured data (AI-extracted)
    location = Column(String(255), nullable=True)
    remote_policy = Column(String(50), nullable=True)  # "remote", "hybrid", "onsite"
    seniority_level = Column(String(50), nullable=True)
    required_stack = Column(JSONB, default=[])
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    salary_currency = Column(String(10), nullable=True)

    # Source + tracking
    ats_provider = Column(String(50), nullable=True)
    ats_url = Column(String(500), nullable=True)
    apply_url = Column(String(500), nullable=True)
    source = Column(String(50), default="manual")  # "yc", "vc_portfolio", "greenhouse", "lever", "company_posted", "manual"

    # Quality + freshness
    quality_score = Column(Integer, default=50)  # 0-100, AI-scored
    is_engineering = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    is_visible_on_homepage = Column(Boolean, default=True)

    # Company-posted job extras (when companies post directly)
    posted_by_email = Column(String(255), nullable=True)
    posted_by_name = Column(String(255), nullable=True)
    posted_by_phone = Column(String(50), nullable=True)
    company_follow_up_data = Column(JSONB, default={})  # AI follow-up answers

    first_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('ix_job_postings_active_visible', 'is_active', 'is_visible_on_homepage'),
        Index('ix_job_postings_company_title', 'company_domain', 'title'),
    )

class JobMatch(Base):
    __tablename__ = "job_matches"

    id = Column(Integer, primary_key=True, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True)
    github_developer_id = Column(Integer, ForeignKey("github_developers.id", ondelete="SET NULL"), nullable=True)

    match_score = Column(Integer, default=0)  # 0-100
    match_reasons = Column(JSONB, default={})  # {"technical_fit": 85, "startup_fit": 70, ...}

    status = Column(String(50), default="matched")  # matched, sent_to_company, viewed, interview, hired, rejected
    sent_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())