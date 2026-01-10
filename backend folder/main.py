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
import asyncio

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
from email_settings_routes import router as email_settings_router
from razorpay_routes import router as razorpay_router

# Import services
from filter_service import FilterService
from usage_service import UsageService
from database import get_db
from models import User, Profile, EmailOutreach
from auth_middleware import get_current_user
from profile_cache_service import ProfileCacheService
from email_service import EmailService

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
app.include_router(email_settings_router)
app.include_router(razorpay_router)

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
    # ✅ FIX #1: Properly handle languages array
    languages_list = []
    if search.languages and len(search.languages) > 0:
        languages_list = search.languages
    elif search.language:
        languages_list = [search.language]
    
    filters = {
        "role": search.role,
        "languages": languages_list,
        "frameworks": search.frameworks or [],
        "tools": search.tools or [],
        "min_stars": search.min_stars or 0,
        "min_contributions": search.min_contributions or 0,
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
        # ✅ FIX #3: Pass target_profiles parameter
        profiles = await GitHubIntegrationService.search_and_cache_profiles(
            db, 
            filters, 
            max_github_results=150,  # Max to fetch from GitHub if needed
            target_profiles=200  # Target total profiles to return
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
    
    # ===== CHECK EMAIL LIMITS =====
    usage = UsageService.check_email_limit(db, user_id)
    
    if not usage["can_send"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "EMAIL_LIMIT_EXCEEDED",
                "message": f"Email limit reached. You've used {usage['used']}/{usage['limit']} emails this month.",
                "usage": usage
            }
        )
    
    # Check if trying to send more than remaining
    if len(email_request.profile_ids) > usage["remaining"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "EMAIL_LIMIT_EXCEEDED",
                "message": f"Cannot send {len(email_request.profile_ids)} emails. Only {usage['remaining']} remaining this month.",
                "usage": usage
            }
        )
    
    # ===== USE USER'S SENDER EMAIL =====
    sender_email = current_user.sender_email
    
    if not sender_email:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "SENDER_EMAIL_NOT_SET",
                "message": "Please set your sender email in settings first"
            }
        )
    
    # Get password from env (or user's password if stored)
    company_password = os.getenv("COMPANY_EMAIL_PASSWORD")
    
    if not company_password:
        raise HTTPException(
            status_code=500,
            detail="Email credentials not configured. Add COMPANY_EMAIL_PASSWORD to .env"
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
        company_email=sender_email,
        company_password=company_password,
        recipients=recipients,
        subject=email_request.subject,
        body_template=email_request.body
    )
    
    # Log outreach WITH user_id
    for profile in profiles:
        if profile.email and '@' in profile.email:
            status = "sent" if any(r["email"] == profile.email for r in recipients) else "failed"
            outreach_log = EmailOutreach(
                user_id=user_id,  # ← ADD THIS
                profile_id=profile.id,
                subject=email_request.subject,
                body=email_request.body,
                status=status,
                company_email=sender_email
            )
            db.add(outreach_log)
    
    db.commit()
    
    # Get updated usage
    updated_usage = UsageService.check_email_limit(db, user_id)
    
    logger.info(f"Bulk email complete: {results['sent']} sent, {results['failed']} failed")
    print(f"✅ Sent: {results['sent']}, Failed: {results['failed']}\n")
    
    return {
        "sent": results["sent"],
        "failed": results["failed"],
        "errors": results["errors"],
        "recipients": [r["email"] for r in recipients],
        "usage": updated_usage  # ← RETURN UPDATED USAGE
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

# ===== CHECK CSV EXPORT LIMIT =====

@app.get("/api/check-csv-limit")
def check_csv_limit(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user can export CSV"""
    usage = UsageService.check_csv_limit(db, current_user.id)
    return usage


# ===== LOG CSV EXPORT =====

@app.post("/api/log-csv-export")
def log_csv_export(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log a CSV export"""
    UsageService.log_csv_export(db, current_user.id)
    return {"success": True}

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


# ===== STREAMING SEARCH ENDPOINT (POST with proper auth) =====

from fastapi.responses import StreamingResponse
import json

from fastapi.responses import StreamingResponse
import json

@app.post("/api/search-profiles-stream")
async def search_profiles_stream(
    search: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ OPTIMIZED STREAMING SEARCH - Target < 2 minutes
    
    Optimizations:
    - Target: 120 profiles (was 350)
    - Smooth progress (no phases)
    - Batch size: 25 (was 12)
    - No cooldown between batches
    """
    
    async def event_stream():
        """Generator that yields SSE events"""
        
        try:
            # ===== PHASE 1: Start search =====
            yield f"data: {json.dumps({'type': 'status', 'message': 'Searching for developers...', 'phase': 0})}\n\n"
            
            # Build filters
            languages_list = []
            if search.languages and len(search.languages) > 0:
                languages_list = search.languages
            elif search.language:
                languages_list = [search.language]
            
            filters = {
                "role": search.role,
                "languages": languages_list,
                "location": search.location,
                "min_repos": search.min_repos or 0
            }
            
            # ===== PHASE 2: Return Cached Profiles =====
            from github_integration_service import GitHubIntegrationService
            
            logger.info("📦 Fetching cached profiles...")
            cached_profiles = GitHubIntegrationService._search_database(db, filters)
            
            # Convert to dicts
            cached_dicts = []
            for profile in cached_profiles[:120]:  # ✅ Limit to 120
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
                    "contributions_last_year": getattr(profile, 'contributions_last_year', 0),
                    "followers": getattr(profile, 'followers', 0),
                    "languages_data": getattr(profile, 'languages_data', None),
                    "top_repos": getattr(profile, 'top_repos', None),
                    "selected": False
                }
                cached_dicts.append(profile_dict)
            
            # Send initial results
            logger.info(f"✅ Sending {len(cached_dicts)} initial results")
            yield f"data: {json.dumps({'type': 'profiles', 'profiles': cached_dicts, 'count': len(cached_dicts)})}\n\n"
            
            # Check if we need more
            target_profiles = 200  # ✅ OPTIMIZATION #2: Reduced from 350
            if len(cached_profiles) >= target_profiles:
                logger.info(f"✅ Search complete")
                yield f"data: {json.dumps({'type': 'complete', 'total': len(cached_profiles)})}\n\n"
                return
            
            # ===== PHASE 3: Fetch New Profiles =====
            profiles_needed = target_profiles - len(cached_profiles)
            logger.info(f"🔍 Searching for {profiles_needed} more profiles")
            yield f"data: {json.dumps({'type': 'status', 'message': f'Searching for more developers...'})}\n\n"
            
            # Check if we have language or location
            language = languages_list[0] if languages_list else None
            
            if not language and not search.location:
                logger.warning("⚠️ No language or location, stopping")
                yield f"data: {json.dumps({'type': 'complete', 'total': len(cached_profiles)})}\n\n"
                return
            
            # Import and search
            from github_service import search_github_users_paginated, get_user_details, is_valid_user_data
            from models import Profile
            from role_detection_service import RoleDetectionService
            
            # Search GitHub
            logger.info(f"🔍 Searching GitHub: language={language}, location={search.location}")
            users = await search_github_users_paginated(
                language=language,
                location=search.location,
                min_repos=search.min_repos or 0,
                max_pages=5,  # ✅ Reduced from 10
                target_users=150  # ✅ Reduced from 300
            )
            
            if not users:
                logger.warning("⚠️ No users found from GitHub")
                yield f"data: {json.dumps({'type': 'complete', 'total': len(cached_profiles)})}\n\n"
                return
            
            usernames = [user["login"] for user in users[:150]]  # ✅ Reduced from 300
            total_to_process = min(150, len(usernames))  # ✅ Reduced from 250
            
            logger.info(f"📥 Processing {total_to_process} profiles")
            
            new_profiles_count = 0
            processed_count = 0
            
            # ✅ Filter out existing usernames
            existing_usernames = set(
                username[0] for username in db.query(Profile.github_username)
                .filter(Profile.github_username.in_(usernames[:total_to_process]))
                .all()
            )
            
            usernames_to_fetch = [u for u in usernames[:total_to_process] if u not in existing_usernames]
            
            if existing_usernames:
                logger.info(f"⏭️  Skipping {len(existing_usernames)} already cached profiles")
            
            if not usernames_to_fetch:
                logger.info(f"✅ All profiles already cached")
                yield f"data: {json.dumps({'type': 'complete', 'total': len(cached_profiles)})}\n\n"
                return
            
            logger.info(f"📥 Fetching {len(usernames_to_fetch)} new profiles")
            
            # ✅ OPTIMIZATION #4: BATCH_SIZE increased to 25
            BATCH_SIZE = 25
            
            for batch_start in range(0, len(usernames_to_fetch), BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, len(usernames_to_fetch))
                batch_usernames = usernames_to_fetch[batch_start:batch_end]
                
                # Process batch
                tasks = [get_user_details(username) for username in batch_usernames]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Save profiles
                batch_new_profiles = []
                for details in results:
                    if isinstance(details, Exception) or not details:
                        continue
                    
                    if not is_valid_user_data(details):
                        continue
                    
                    try:
                        profile = Profile(
                            github_username=details["username"],
                            name=details.get("name"),
                            email=details.get("email"),
                            location=details.get("location"),
                            bio=details.get("bio"),
                            public_repos=details.get("public_repos", 0),
                            primary_language=list(details.get("languages", {}).keys())[0] if details.get("languages") else None,
                            contributions_last_year=details.get("contributions", 0),
                            portfolio_url=details.get("portfolio_url"),
                            avatar_url=details.get("avatar_url"),
                            total_stars=details.get("total_stars", 0),
                            languages_data=details.get("languages"),
                            top_repos=details.get("top_repos"),
                            last_active_date=details.get("last_active_date"),
                            cached_at=datetime.now(timezone.utc),
                            source="github"
                        )
                        
                        profile.developer_score = profile.calculate_developer_score()
                        
                        try:
                            profile.detected_roles = RoleDetectionService.detect_roles(profile)
                            profile.roles_analyzed_at = datetime.now(timezone.utc)
                        except:
                            profile.detected_roles = []
                        
                        db.add(profile)
                        db.commit()
                        db.refresh(profile)
                        
                        # Convert to dict
                        profile_dict = {
                            "id": profile.id,
                            "github_username": profile.github_username,
                            "name": profile.name,
                            "email": profile.email,
                            "location": profile.location,
                            "bio": profile.bio,
                            "public_repos": profile.public_repos,
                            "primary_language": profile.primary_language,
                            "total_stars": profile.total_stars,
                            "developer_score": profile.developer_score,
                            "avatar_url": profile.avatar_url,
                            "contributions_last_year": profile.contributions_last_year,
                            "followers": getattr(profile, 'followers', 0),
                            "languages_data": profile.languages_data,
                            "top_repos": profile.top_repos,
                            "selected": False
                        }
                        
                        batch_new_profiles.append(profile_dict)
                        new_profiles_count += 1
                        
                    except Exception as e:
                        logger.error(f"❌ Failed to save profile: {e}")
                        db.rollback()
                
                processed_count += len(results)
                
                # Send new profiles immediately
                if batch_new_profiles:
                    logger.info(f"📤 Sending {len(batch_new_profiles)} new profiles")
                    yield f"data: {json.dumps({'type': 'new_profiles', 'profiles': batch_new_profiles})}\n\n"
                
                # ✅ Send smooth progress update
                progress_percent = int((processed_count / len(usernames_to_fetch)) * 100)
                total_profiles = len(cached_profiles) + new_profiles_count
                
                logger.info(f"📊 Progress: {progress_percent}% - Total: {total_profiles}")
                yield f"data: {json.dumps({'type': 'progress', 'percent': progress_percent, 'total_found': total_profiles})}\n\n"
                
                # ✅ OPTIMIZATION #7: Early stop if target reached
                if new_profiles_count >= profiles_needed:
                    logger.info(f"✅ Target reached! Stopping.")
                    break
                
                # ✅ OPTIMIZATION #5: NO COOLDOWN between batches
            
            # ===== Complete =====
            total_profiles = len(cached_profiles) + new_profiles_count
            logger.info(f"✅ Search complete! Total: {total_profiles}")
            yield f"data: {json.dumps({'type': 'complete', 'total': total_profiles})}\n\n"
            
        except Exception as e:
            logger.error(f"❌ Streaming search error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )
# ===== RUN WITH UVICORN =====

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)