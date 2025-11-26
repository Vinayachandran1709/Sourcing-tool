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

        # ===== NEW METHOD: Calculate Developer Score =====
    def calculate_developer_score(self):
        """
        Calculate developer score (0-100) based on multiple factors.
        
        Weights:
        - Stars: 30%
        - Repositories: 20%
        - Contributions: 25%
        - Recency: 15%
        - Language diversity: 10%
        
        Returns:
            Integer score between 0 and 100
        """
        
        # ===== DEFINE THRESHOLDS =====
        EXCELLENT_STARS = 1500
        EXCELLENT_REPOS = 80
        EXCELLENT_CONTRIBUTIONS = 700
        MAX_LANGUAGES = 10
        ACTIVE_DAYS_THRESHOLD = 90
        
        # ===== COMPONENT 1: Stars Score (30% weight) =====
        stars_score = self._normalize_score(
            value=self.total_stars or 0,
            excellent_threshold=EXCELLENT_STARS
        )
        
        # ===== COMPONENT 2: Repositories Score (20% weight) =====
        repos_score = self._normalize_score(
            value=self.public_repos or 0,
            excellent_threshold=EXCELLENT_REPOS
        )
        
        # ===== COMPONENT 3: Contributions Score (25% weight) =====
        contributions_score = self._normalize_score(
            value=self.contributions_last_year or 0,
            excellent_threshold=EXCELLENT_CONTRIBUTIONS
        )
        
        # ===== COMPONENT 4: Recency Score (15% weight) =====
        recency_score = self._calculate_recency_score(
            last_active=self.last_active_date,
            threshold_days=ACTIVE_DAYS_THRESHOLD
        )
        
        # ===== COMPONENT 5: Language Diversity Score (10% weight) =====
        num_languages = len(self.languages_data) if self.languages_data else 0
        language_score = self._normalize_score(
            value=num_languages,
            excellent_threshold=MAX_LANGUAGES
        )
        
        # ===== CALCULATE WEIGHTED TOTAL =====
        final_score = (
            (stars_score * 0.30) +      # 30% weight
            (repos_score * 0.20) +      # 20% weight
            (contributions_score * 0.25) +  # 25% weight
            (recency_score * 0.15) +    # 15% weight
            (language_score * 0.10)     # 10% weight
        )
        
        # Round to integer and cap at 100
        score = int(round(final_score))
        return min(100, max(0, score))  # Ensure between 0-100
    
    def _normalize_score(self, value, excellent_threshold):
        """
        Normalize a value to 0-100 scale based on threshold.
        
        Args:
            value: The actual value (e.g., 500 stars)
            excellent_threshold: Value considered "excellent" (e.g., 1500 stars)
        
        Returns:
            Score between 0 and 100
        """
        if value >= excellent_threshold:
            return 100
        
        # Linear scale up to threshold
        score = (value / excellent_threshold) * 100
        return min(100, score)
    
    def _calculate_recency_score(self, last_active, threshold_days):
        """
        Calculate recency score based on last activity date.
        
        Args:
            last_active: datetime object of last activity
            threshold_days: Days to consider "recently active"
        
        Returns:
            Score between 0 and 100
        """
        if not last_active:
            # No activity data, give benefit of doubt
            return 50
        
        # Calculate days since last activity
        now = datetime.now(timezone.utc)
        
        # Ensure last_active is timezone-aware
        if last_active.tzinfo is None:
            from datetime import timezone
            last_active = last_active.replace(tzinfo=timezone.utc)
        
        days_ago = (now - last_active).days
        
        if days_ago <= threshold_days:
            # Recently active: full points
            return 100
        elif days_ago <= threshold_days * 2:
            # Somewhat active: 75 points
            return 75
        elif days_ago <= threshold_days * 4:
            # Moderately inactive: 50 points
            return 50
        elif days_ago <= threshold_days * 8:
            # Quite inactive: 25 points
            return 25
        else:
            # Very inactive (2+ years): minimal points
            return 10


# Keep OutreachLog model as-is (no changes needed)
class OutreachLog(Base):
    __tablename__ = "outreach_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer)
    email_sent_at = Column(DateTime, default=datetime.utcnow)
    email_status = Column(String)
    error_message = Column(String, nullable=True)