from sqlalchemy import Column, Integer, String, Boolean, DateTime
from database import Base
from datetime import datetime

class Profile(Base):
    """
    Profile table stores GitHub user information.
    Each row represents one developer's profile.
    """
    __tablename__ = "profiles"
    
    # Primary key - unique ID for each profile
    id = Column(Integer, primary_key=True, index=True)
    
    # GitHub username - must be unique
    github_username = Column(String, unique=True, index=True)
    
    # User's real name (optional)
    name = Column(String, nullable=True)
    
    # User's email (optional - not all GitHub profiles have public email)
    email = Column(String, nullable=True)
    
    # User's location (optional - e.g., "San Francisco, CA")
    location = Column(String, nullable=True)
    
    # User's bio/description (optional)
    bio = Column(String, nullable=True)
    
    # Number of public repositories
    public_repos = Column(Integer, default=0)
    
    # Primary programming language (e.g., "Python")
    primary_language = Column(String, nullable=True)
    
    # Approximate contribution count in last year
    contributions_last_year = Column(Integer, default=0)
    
    # User's portfolio/website URL (optional)
    portfolio_url = Column(String, nullable=True)
    
    # User's GitHub avatar image URL
    avatar_url = Column(String, nullable=True)
    
    # Whether this profile is selected for outreach
    selected = Column(Boolean, default=False)
    
    # When this profile was last fetched from GitHub
    last_fetched = Column(DateTime, default=datetime.utcnow)


class OutreachLog(Base):
    """
    OutreachLog table tracks email sending history.
    Each row represents one email sent to a profile.
    """
    __tablename__ = "outreach_logs"
    
    # Primary key - unique ID for each log entry
    id = Column(Integer, primary_key=True, index=True)
    
    # Which profile this email was sent to (links to Profile.id)
    profile_id = Column(Integer)
    
    # When the email was sent
    email_sent_at = Column(DateTime, default=datetime.utcnow)
    
    # Status: 'sent' or 'failed'
    email_status = Column(String)
    
    # Error message if email failed (optional)
    error_message = Column(String, nullable=True)