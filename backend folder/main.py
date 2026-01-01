from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime, timezone, timedelta
import logging
import sys

# ⭐ CONFIGURE LOGGING (Windows-compatible, no emojis in console)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("talentbox.log", encoding='utf-8'),  # File supports UTF-8
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Configure StreamHandler to avoid emoji issues on Windows
for handler in logging.root.handlers:
    if isinstance(handler, logging.StreamHandler) and handler.stream == sys.stdout:
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

# Import routers
from auth_routes import router as auth_router
from waitlist_routes import router as waitlist_router
from lists_routes import router as lists_router
from email_routes import router as email_router
from razorpay_routes import router as razorpay_router
from analytics_routes import router as analytics_router
from search_history_routes import router as search_history_router

# Import services
from filter_service import FilterService
from usage_service import UsageService
from database import get_db
from models import User, Profile, EmailOutreach, SearchHistory
from auth_middleware import get_current_user
from profile_cache_service import ProfileCacheService
from email_service import EmailService
from search_history_service import SearchHistoryService


# ===== INITIALIZE FASTAPI APP =====

# ===== CONFIGURE CORS ORIGINS FIRST =====

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


# ===== INITIALIZE FASTAPI APP =====

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="TalentBox API",
    version="2.0.0",  # ✅ Updated version
    description="API for GitHub developer sourcing and recruitment"
)

# Log initialization
logger.info("TalentBox API initialized - Version 2.0.0 (FIXED)")
logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
logger.info(f"CORS origins: {CORS_ORIGINS}")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def startup_event():
    """Validate critical configurations on startup"""
    logger.info("🚀 TalentBox API Starting Up...")
    
    # Validate GitHub Token
    from github_service import GITHUB_TOKEN
    if not GITHUB_TOKEN:
        logger.error("⚠️ CRITICAL: GITHUB_TOKEN not found in .env!")
        logger.error("   → GitHub API searches will fail")
        logger.error("   → Only database cache will work")
    else:
        logger.info(f"✅ GitHub Token found (length: {len(GITHUB_TOKEN)})")
    
    # Validate Database
    try:
        from sqlalchemy import text
        from database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
    
    # Validate JWT Secret
    from auth_middleware import SECRET_KEY
    if not SECRET_KEY:
        logger.error("⚠️ CRITICAL: JWT_SECRET_KEY not found!")
    else:
        logger.info("✅ JWT Secret configured")
    
    logger.info("🎯 Startup validation complete\n")


# ⭐ GLOBAL ERROR HANDLERS

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with user-friendly messages"""
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "Invalid input data",
            "details": exc.errors()
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format"""
    logger.warning(f"HTTP {exc.status_code} on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail if isinstance(exc.detail, str) else exc.detail.get("error", "ERROR"),
            "message": exc.detail if isinstance(exc.detail, str) else exc.detail.get("message", str(exc.detail))
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors without exposing internals"""
    logger.error(f"Unexpected error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again later."
        }
    )


# ===== CORS MIDDLEWARE =====

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== INCLUDE ROUTERS =====

app.include_router(waitlist_router)
app.include_router(auth_router)
app.include_router(lists_router)
app.include_router(email_router)
app.include_router(razorpay_router)
app.include_router(analytics_router)
app.include_router(search_history_router)


# ===== REQUEST/RESPONSE MODELS =====

class SearchRequest(BaseModel):
    """Enhanced request model for search"""
    role: Optional[str] = None
    languages: Optional[List[str]] = []
    frameworks: Optional[List[str]] = []
    tools: Optional[List[str]] = []
    min_stars: Optional[int] = 0
    min_contributions: Optional[int] = 0
    recent_activity: Optional[str] = None
    location: Optional[str] = None
    language: Optional[str] = None
    min_repos: Optional[int] = 0

class ProfileResponse(BaseModel):
    """Response model for profile data"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    github_username: str
    name: Optional[str]
    email: Optional[str]
    location: Optional[str]
    bio: Optional[str]
    public_repos: int
    primary_language: Optional[str]
    contributions_last_year: int
    portfolio_url: Optional[str]
    avatar_url: Optional[str]
    selected: bool
    total_stars: int
    developer_score: int
    languages_data: Optional[dict] = None
    top_repos: Optional[list] = None
    last_active_date: Optional[datetime] = None
    last_fetched: Optional[datetime] = None


class EmailRequest(BaseModel):
    """Request model for sending emails"""
    profile_ids: List[int]
    subject: str
    body: str


# ===== ROOT ENDPOINT =====

@app.get("/")
def root():
    """Welcome endpoint"""
    return {
        "message": "TalentBox API - Developer Sourcing Platform",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs"
    }


# ===== SEARCH ENDPOINT =====

@app.post("/api/search-profiles")
async def search_profiles(
    search: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enhanced search with GitHub API integration
    
    ✅ FIX #3: Fixed empty profiles array bug - now properly converts and returns profiles
    """
    user_id = current_user.id
    
    logger.info(f"Search request from user {user_id}: role={search.role}, languages={search.languages}")
    
    # Check usage limits
    try:
        UsageService.check_limit(db, user_id, "search")
    except HTTPException as e:
        return {"error": e.detail, "limit_reached": True}
    
    print("\n" + "="*60)
    print("SEARCH REQUEST RECEIVED")
    print(f"   Role: {search.role or 'Any'}")
    print(f"   Languages: {search.languages or 'Any'}")
    print(f"   Location: {search.location or 'Any'}")
    print("="*60)
    
    # Build filters
    filters = {
        "role": search.role,
        "languages": search.languages or [search.language] if search.language else [],
        "frameworks": search.frameworks,
        "tools": search.tools,
        "min_stars": search.min_stars,
        "min_contributions": search.min_contributions,
        "recent_activity": search.recent_activity,
        "location": search.location,
        "min_repos": search.min_repos or 0
    }
    
    # ⭐ HYBRID SEARCH: Database + GitHub API
    print("\nIMPORTING GitHubIntegrationService...")
    profiles = []
    from_cache = 0
    from_github = 0
    
    try:
        from github_integration_service import GitHubIntegrationService
        print("SUCCESS: GitHubIntegrationService imported")
        
        print("\nCALLING search_and_cache_profiles...")
        profiles = await GitHubIntegrationService.search_and_cache_profiles(
            db, filters, max_github_results=100  # ← INCREASED from 30 to 100
        )
        print(f"SUCCESS: Got {len(profiles)} profiles from hybrid search")
        
        # Count profiles from cache vs GitHub (all are now cached)
        from_cache = len(profiles)
        from_github = 0  # All new profiles are now in cache
        
    except Exception as e:
        print(f"ERROR in GitHubIntegrationService: {type(e).__name__}: {str(e)}")
        logger.error(f"Hybrid search failed: {e}", exc_info=True)
        
        # ✅ FIX #3: CRITICAL BUG FIX - Use FilterService as fallback and CONVERT profiles to dicts
        print("FALLBACK: Using FilterService...")
        try:
            profiles = FilterService.apply_filters(db, filters)
            print(f"FilterService returned {len(profiles)} profiles")
            from_cache = len(profiles)
            from_github = 0
        except Exception as filter_error:
            print(f"ERROR in FilterService fallback: {filter_error}")
            logger.error(f"FilterService fallback failed: {filter_error}", exc_info=True)
            profiles = []
    
    print(f"\nFINAL: Returning {len(profiles)} profiles\n")
    logger.info(f"Search found {len(profiles)} profiles")
    
    # Log usage
    UsageService.log_usage(db, user_id, "search", filters)
    
    # Save search history
    search_params = {
        "search_type": "role-based" if search.role else "general",
        "keywords": None,
        "role": search.role,
        "location": search.location,
        "min_followers": None,
        "min_repos": search.min_repos if search.min_repos else 0,
        "languages": search.languages if search.languages else [],
        "frameworks": search.frameworks if search.frameworks else [],
        "min_score": None
    }
    
    top_profile_id = profiles[0].id if profiles and len(profiles) > 0 else None
    SearchHistoryService.save_search(db, user_id, search_params, len(profiles), top_profile_id)
    
    # ✅ FIX #3: Convert Profile objects to dicts properly
    profile_dicts = []
    for profile in profiles[:200]:  # Limit to 200 profiles
        if isinstance(profile, dict):
            # Already a dict
            profile_dicts.append(profile)
        else:
            # Convert Profile object to dict
            profile_dict = {
                "id": profile.id,
                "github_username": profile.github_username,
                "name": profile.name,
                "email": profile.email,
                "location": profile.location,
                "bio": profile.bio,
                "public_repos": profile.public_repos,
                "primary_language": profile.primary_language,
                "total_stars": getattr(profile, 'total_stars', 0),
                "developer_score": getattr(profile, 'developer_score', 0),
                "avatar_url": getattr(profile, 'avatar_url', None),
                "total_contributions": getattr(profile, 'contributions_last_year', 0),
                "followers": getattr(profile, 'followers', 0),
                "languages_data": getattr(profile, 'languages_data', None),
                "top_repos": getattr(profile, 'top_repos', None),
                "selected": False
            }
            profile_dicts.append(profile_dict)
    
    return {
        "success": True,
        "total_found": len(profiles),
        "profiles": profile_dicts,
        "from_cache": from_cache,
        "from_github": from_github
    }


# ===== GET ALL PROFILES =====

@app.get("/api/profiles", response_model=List[ProfileResponse])
def get_all_profiles(
    min_score: int = 0,
    max_score: int = 100,
    min_stars: int = 0,
    has_email: bool = None,
    location: str = None,
    language: str = None,
    active_within_days: int = None,
    sort_by: str = "score",
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all profiles with optional filters and sorting"""
    user_id = current_user.id
    
    try:
        UsageService.check_limit(db, user_id, "profile_view")
    except HTTPException as e:
        return {"error": e.detail, "limit_reached": True}
    
    query = db.query(Profile)
    
    # Apply filters
    if min_score > 0:
        query = query.filter(Profile.developer_score >= min_score)
    
    if max_score < 100:
        query = query.filter(Profile.developer_score <= max_score)
    
    if min_stars > 0:
        query = query.filter(Profile.total_stars >= min_stars)
    
    if has_email is not None:
        if has_email:
            query = query.filter(Profile.email.isnot(None), Profile.email != "")
        else:
            from sqlalchemy import or_
            query = query.filter(or_(Profile.email.is_(None), Profile.email == ""))
    
    if location:
        query = query.filter(Profile.location.ilike(f"%{location}%"))
    
    if language:
        query = query.filter(Profile.primary_language.ilike(language))
    
    if active_within_days:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=active_within_days)
        query = query.filter(Profile.last_active_date >= cutoff_date)
    
    # Apply sorting
    if sort_by == "score":
        query = query.order_by(Profile.developer_score.desc())
    elif sort_by == "stars":
        query = query.order_by(Profile.total_stars.desc())
    elif sort_by == "repos":
        query = query.order_by(Profile.public_repos.desc())
    elif sort_by == "activity":
        query = query.order_by(Profile.last_active_date.desc())
    else:
        query = query.order_by(Profile.developer_score.desc())
    
    query = query.limit(limit)
    profiles = query.all()
    
    # Log usage
    for _ in profiles:
        UsageService.log_usage(db, user_id, "profile_view")
    
    return profiles


# ===== GET SINGLE PROFILE =====

@app.get("/api/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile_details(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full details for a specific profile"""
    
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile with ID {profile_id} not found")
    
    return profile


# ===== TOGGLE PROFILE SELECTION =====

@app.patch("/api/profiles/{profile_id}/toggle-select")
def toggle_profile_selection(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle selection status of a profile"""
    
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile with ID {profile_id} not found")
    
    profile.selected = not profile.selected
    db.commit()
    db.refresh(profile)
    
    return {
        "id": profile.id,
        "username": profile.github_username,
        "selected": profile.selected
    }


# ===== GET SELECTED PROFILES =====

@app.get("/api/selected-profiles", response_model=List[ProfileResponse])
def get_selected_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all profiles marked as selected"""
    
    profiles = db.query(Profile).filter(Profile.selected == True).all()
    return profiles


# ===== SEND BULK EMAILS =====

@app.post("/api/send-bulk-emails")
def send_bulk_emails(
    email_request: EmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send bulk emails to selected profiles"""
    user_id = current_user.id
    
    logger.info(f"Bulk email request from user {user_id} for {len(email_request.profile_ids)} profiles")
    
    # Check email limits
    try:
        UsageService.check_limit(db, user_id, "email_sent")
    except HTTPException as e:
        raise e
    
    # Get email credentials
    company_email = os.getenv("COMPANY_EMAIL")
    company_password = os.getenv("COMPANY_EMAIL_PASSWORD")
    
    if not company_email or not company_password:
        raise HTTPException(
            status_code=500,
            detail="Email credentials not configured. Add COMPANY_EMAIL and COMPANY_EMAIL_PASSWORD to .env"
        )
    
    # Get profiles
    profiles = db.query(Profile).filter(Profile.id.in_(email_request.profile_ids)).all()
    
    if not profiles:
        raise HTTPException(status_code=404, detail="No profiles found")
    
    # Prepare recipients
    recipients = []
    for p in profiles:
        if p.email and '@' in p.email:
            recipients.append({
                "email": p.email,
                "name": p.name or p.github_username
            })
    
    if not recipients:
        raise HTTPException(status_code=400, detail="None of the selected profiles have valid email addresses")
    
    # Send emails
    print(f"\n📧 Sending emails to {len(recipients)} developers...")
    results = EmailService.send_bulk_emails(
        company_email=company_email,
        company_password=company_password,
        recipients=recipients,
        subject=email_request.subject,
        body_template=email_request.body
    )
    
    # Log outreach
    for profile in profiles:
        if profile.email and '@' in profile.email:
            status = "sent" if any(r["email"] == profile.email for r in recipients) else "failed"
            outreach_log = EmailOutreach(
                profile_id=profile.id,
                subject=email_request.subject,
                body=email_request.body,
                status=status,
                company_email=company_email
            )
            db.add(outreach_log)
    
    UsageService.log_usage(db, user_id, "email_sent", {"count": len(recipients)})
    db.commit()
    
    logger.info(f"Bulk email complete: {results['sent']} sent, {results['failed']} failed")
    print(f"✅ Sent: {results['sent']}, Failed: {results['failed']}\n")
    
    return {
        "sent": results["sent"],
        "failed": results["failed"],
        "errors": results["errors"],
        "recipients": [r["email"] for r in recipients]
    }


# ===== GET OUTREACH HISTORY =====

@app.get("/api/outreach-history")
def get_outreach_history(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get email outreach history"""
    user_id = current_user.id
    
    outreach_logs = db.query(EmailOutreach).order_by(
        EmailOutreach.sent_at.desc()
    ).limit(limit).all()
    
    results = []
    for log in outreach_logs:
        profile = db.query(Profile).filter(Profile.id == log.profile_id).first()
        if profile:
            results.append({
                "id": log.id,
                "profile": {
                    "id": profile.id,
                    "name": profile.name,
                    "github_username": profile.github_username,
                    "email": profile.email
                },
                "subject": log.subject,
                "status": log.status,
                "sent_at": log.sent_at.isoformat() if log.sent_at else None,
                "company_email": log.company_email
            })
    
    return {
        "outreach_history": results,
        "total": len(results)
    }


# ===== FILTER BY SCORE =====

@app.post("/api/filter-by-score")
def filter_by_score(
    profile_ids: List[int],
    min_score: int = 0,
    max_score: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Filter profiles by developer score"""
    
    profiles = db.query(Profile).filter(Profile.id.in_(profile_ids)).all()
    filtered = FilterService.filter_by_score(profiles, min_score, max_score)
    
    return {
        "total": len(filtered),
        "profiles": filtered
    }


# ===== GET USAGE STATS =====

@app.get("/api/usage-stats")
def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current usage statistics for user"""
    user_id = current_user.id
    stats = UsageService.get_usage_stats(db, user_id)
    return stats


# ===== HEALTH CHECK =====

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    """Check if API is running"""
    try:
        # Test database connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ===== VERSION CHECK (for debugging) =====

@app.get("/api/version-check")
def version_check():
    """Verify which version of code is running - for debugging only"""
    return {
        "version": "FIXED_VERSION_2.0",
        "fixes_applied": [
            "Fix #3: Empty profiles array bug - proper profile dict conversion",
            "Fix #4: Enhanced logging in github_integration_service", 
            "Fix #5: FilterService debug logs with logging import",
            "Fix #6: Profile saving error handling with try/except",
            "Fix #7: Missing logging import in filter_service"
        ],
        "critical_fixes": [
            "GitHubIntegrationService class indentation fixed",
            "async keyword properly added to search_and_cache_profiles",
            "Profile conversion to dicts in fallback path"
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "All fixes applied ✅"
    }


# ===== RUN WITH UVICORN =====

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)