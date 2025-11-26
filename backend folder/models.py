from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSON  # NEW: Import JSON type
from database import Base
from datetime import datetime

class Profile(Base):
    """
    Enhanced Profile model with new fields for:
    - Language distribution
    - Top repositories
    - Activity tracking
    - Developer scoring
    """
    __tablename__ = "profiles"
    
    # ===== EXISTING COLUMNS (Don't change these) =====
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
    last_fetched = Column(DateTime, default=datetime.utcnow)
    
    # ===== NEW COLUMNS (Added for enhanced MVP) =====
    
    # Languages distribution: {"Python": 65, "JavaScript": 20, "Go": 15}
    languages_data = Column(JSON, nullable=True)
    
    # Top 5 repositories with stats
    # Format: [
    #   {
    #     "name": "awesome-project",
    #     "description": "A cool project",
    #     "stars": 234,
    #     "forks": 12,
    #     "url": "https://github.com/user/repo",
    #     "last_updated": "2024-01-10"
    #   },
    #   ...
    # ]
    top_repos = Column(JSON, nullable=True)
    
    # Last time developer was active (last commit/activity)
    last_active_date = Column(DateTime, nullable=True)
    
    # Total stars across all repositories
    total_stars = Column(Integer, default=0)
    
    # Calculated developer score (0-100)
    developer_score = Column(Integer, default=0)


# Keep OutreachLog model as-is (no changes needed)
class OutreachLog(Base):
    __tablename__ = "outreach_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer)
    email_sent_at = Column(DateTime, default=datetime.utcnow)
    email_status = Column(String)
    error_message = Column(String, nullable=True)