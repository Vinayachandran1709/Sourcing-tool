from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func  # ⭐ ADD THIS
from database import Base
from datetime import datetime, timezone  # ✅ ADD timezone
import math

class Profile(Base):
    """Enhanced Profile model"""
    __tablename__ = "profiles"
    
    # Existing columns
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
    
    # ✅ FIXED: Use server_default=func.now() instead of default=datetime.utcnow
    last_fetched = Column(DateTime(timezone=True), server_default=func.now())
    
    # Enhanced columns
    languages_data = Column(JSON, nullable=True)
    top_repos = Column(JSON, nullable=True)
    last_active_date = Column(DateTime(timezone=True), nullable=True)
    total_stars = Column(Integer, default=0)
    developer_score = Column(Integer, default=0)
    
    # Caching columns
    cached_at = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String, default="github")

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


class OutreachLog(Base):
    """Email outreach tracking"""
    __tablename__ = "outreach_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    
    # ✅ FIXED
    email_sent_at = Column(DateTime(timezone=True), server_default=func.now())
    email_status = Column(String)
    error_message = Column(String, nullable=True)


class SearchHistory(Base):
    """Track all searches performed"""
    __tablename__ = "search_history"
    
    id = Column(Integer, primary_key=True, index=True)
    filters = Column(JSON)
    profiles_found = Column(Integer)
    
    # ✅ FIXED
    searched_at = Column(DateTime(timezone=True), server_default=func.now())


class EmailOutreach(Base):
    """Track bulk email campaigns"""
    __tablename__ = "email_outreach"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    subject = Column(Text)
    body = Column(Text)
    status = Column(String, default="sent")
    
    # ✅ FIXED
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    company_email = Column(String)


class ProfileView(Base):
    """Track which profiles were shown in search results"""
    __tablename__ = "profile_views"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    
    # ✅ FIXED
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())