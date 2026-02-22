from fastapi import FastAPI, HTTPException, Depends, Request, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from typing import Annotated, List, Optional
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
from routes.payment_routes import router as payment_router
from lists_routes import router as lists_router
from email_settings_routes import router as email_settings_router
from feedback_routes import router as feedback_router

# Import services
from filter_service import FilterService
from usage_service import UsageService
from database import get_db
from models import User, Profile, EmailOutreach
from auth_middleware import get_current_user
from profile_cache_service import ProfileCacheService
from email_service import EmailService
from redis_service import init_redis, get_redis_stats, get_cached_search, set_cached_search, hash_filters

# ===== ANNOTATED DEPENDENCY TYPES =====
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]

# ===== INITIALIZE FASTAPI APP =====

# ===== CONFIGURE CORS ORIGINS FIRST =====

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


# ===== INITIALIZE FASTAPI APP =====

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="TalentBox API",
    version="2.0.1",  # ✅ Updated version for Resend integration
    description="API for GitHub developer sourcing and recruitment"
)

# Log initialization
logger.info("TalentBox API initialized - Version 2.0.1 (Resend Integration)")
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
    
    # Validate Resend API Key
    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key:
        logger.warning("⚠️ RESEND_API_KEY not found - email features will not work")
    else:
        logger.info("✅ Resend API Key configured")
    
    # Validate Database
    try:
        from sqlalchemy import text
        from database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")

    # Auto-run payment migration (safe - uses IF NOT EXISTS)
    try:
        from database import get_db_connection
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Add payment columns to users table
                cur.execute("""
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(50);
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(50);
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10, 2) DEFAULT 0;
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
                """)

                # Create payment_history table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS payment_history (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        razorpay_order_id VARCHAR(50) NOT NULL,
                        razorpay_payment_id VARCHAR(50),
                        razorpay_signature VARCHAR(255),
                        amount DECIMAL(10, 2) NOT NULL,
                        currency VARCHAR(3) DEFAULT 'USD',
                        amount_inr DECIMAL(10, 2),
                        plan_name VARCHAR(50) NOT NULL,
                        billing_cycle VARCHAR(20) NOT NULL,
                        status VARCHAR(20) DEFAULT 'created',
                        payment_method VARCHAR(50),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        paid_at TIMESTAMP WITH TIME ZONE,
                        receipt VARCHAR(100),
                        notes JSONB,
                        error_message TEXT,
                        CONSTRAINT unique_razorpay_order UNIQUE (razorpay_order_id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
                    CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
                """)

                # Create subscription_events table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS subscription_events (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        event_type VARCHAR(50) NOT NULL,
                        old_plan VARCHAR(50),
                        new_plan VARCHAR(50),
                        old_status VARCHAR(20),
                        new_status VARCHAR(20),
                        triggered_by VARCHAR(50),
                        metadata JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
                """)

                # Add GraphQL + rate limiting + smart refresh columns and tables
                cur.execute("""
                    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0;
                    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_hireable BOOLEAN DEFAULT FALSE;
                    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS refresh_category VARCHAR(20) DEFAULT 'dormant';
                    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP WITH TIME ZONE;
                """)

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS search_locks (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        search_completed BOOLEAN DEFAULT FALSE,
                        CONSTRAINT unique_user_lock UNIQUE (user_id)
                    );
                """)

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS rate_limit_events (
                        id SERIAL PRIMARY KEY,
                        event_type VARCHAR(20) NOT NULL,
                        status_code INTEGER NOT NULL,
                        retry_after INTEGER,
                        rate_limit_remaining INTEGER,
                        rate_limit_resource VARCHAR(50),
                        endpoint VARCHAR(200),
                        occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_rate_limit_events_time ON rate_limit_events(occurred_at);
                """)

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS profile_unlocks (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_profile_unlocks_profile ON profile_unlocks(profile_id);
                    CREATE INDEX IF NOT EXISTS idx_profile_unlocks_time ON profile_unlocks(unlocked_at);
                """)

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS refresh_job_log (
                        id SERIAL PRIMARY KEY,
                        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP WITH TIME ZONE,
                        profiles_refreshed INTEGER DEFAULT 0,
                        profiles_failed INTEGER DEFAULT 0,
                        status VARCHAR(20) DEFAULT 'running'
                    );
                """)

                # Backfill refresh categories for existing profiles
                cur.execute("""
                    UPDATE profiles SET refresh_category = 'active' WHERE contributions_last_year >= 300 AND refresh_category = 'dormant';
                    UPDATE profiles SET refresh_category = 'moderate' WHERE contributions_last_year >= 100 AND contributions_last_year < 300 AND refresh_category = 'dormant';
                """)

                conn.commit()
            logger.info("✅ Payment tables verified/created")
        except Exception as e:
            conn.rollback()
            logger.error(f"⚠️ Payment migration error: {e}")
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"⚠️ Could not verify payment tables: {e}")

    # Validate JWT Secret
    from auth_middleware import SECRET_KEY
    if not SECRET_KEY:
        logger.error("⚠️ CRITICAL: JWT_SECRET_KEY not found!")
    else:
        logger.info("✅ JWT Secret configured")
    
    # Initialize background scheduler for nightly profile refresh
    try:
        from scheduler import init_scheduler
        init_scheduler()
        logger.info("✅ Background scheduler initialized")
    except Exception as e:
        logger.error(f"⚠️ Scheduler init failed: {e}")

    # Initialize Redis cache
    await init_redis()

    logger.info("🎯 Startup validation complete\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully shut down scheduler on app shutdown."""
    try:
        from scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass


# ⭐ GLOBAL ERROR HANDLERS

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with user-friendly messages"""
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    
    # Convert errors to JSON-serializable format
    errors = []
    for error in exc.errors():
        error_dict = {
            "type": error.get("type"),
            "loc": error.get("loc"),
            "msg": error.get("msg"),
            "input": str(error.get("input")) if error.get("input") is not None else None
        }
        errors.append(error_dict)
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "Invalid input data",
            "details": errors
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


# ===== ADMIN ENDPOINTS =====

@app.get("/admin/cache-stats")
async def cache_stats(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Return Redis cache statistics. Requires X-Admin-Key header."""
    admin_secret = os.getenv("ADMIN_SECRET_KEY")
    if not admin_secret or x_admin_key != admin_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await get_redis_stats()


# ===== CORS MIDDLEWARE =====

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== INCLUDE ROUTERS =====

app.include_router(auth_router)
app.include_router(payment_router)
app.include_router(lists_router)
app.include_router(email_settings_router)
app.include_router(feedback_router)

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


# ===== ROOT ENDPOINT =====

@app.get("/")
def root():
    """Welcome endpoint"""
    return {
        "message": "TalentBox API - Developer Sourcing Platform",
        "version": "2.0.1",
        "status": "operational",
        "docs": "/docs"
    }


# ===== SEARCH ENDPOINT =====

@app.post("/api/search-profiles")
@limiter.limit("30/minute")
async def search_profiles(
    request: Request,
    response: Response,
    search: SearchRequest,
    current_user: CurrentUser,
    db: DbSession,
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

    # Search cooldown & concurrent lock
    from rate_limit_service import check_search_cooldown, acquire_search_lock, release_search_lock
    check_search_cooldown(db, user_id)
    if not acquire_search_lock(db, user_id):
        raise HTTPException(status_code=429, detail="A search is already in progress. Please wait.")
    
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
        try:
            from github_integration_service import GitHubIntegrationService
            print("SUCCESS: GitHubIntegrationService imported")

            print("\nCALLING search_and_cache_profiles...")
            profiles = await GitHubIntegrationService.search_and_cache_profiles(
                db,
                filters,
                max_github_results=150,
                target_profiles=200
            )
            print(f"SUCCESS: Got {len(profiles)} profiles from hybrid search")
            from_cache = len(profiles)
            from_github = 0

        except Exception as e:
            print(f"ERROR in GitHubIntegrationService: {type(e).__name__}: {str(e)}")
            logger.error(f"Hybrid search failed: {e}", exc_info=True)

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

        # Convert Profile objects to dicts
        def _first_name(full_name):
            if full_name:
                return full_name.split()[0]
            return None

        profile_dicts = []
        for profile in profiles[:200]:
            if isinstance(profile, dict):
                profile["name"] = _first_name(profile.get("name"))
                profile_dicts.append(profile)
            else:
                profile_dict = {
                    "id": profile.id,
                    "github_username": profile.github_username,
                    "name": _first_name(profile.name),
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

        response.headers["Cache-Control"] = "public, max-age=300"
        return {
            "success": True,
            "total_found": len(profiles),
            "profiles": profile_dicts,
            "from_cache": from_cache,
            "from_github": from_github
        }
    finally:
        release_search_lock(db, user_id)


# ===== GET ALL PROFILES =====

@app.get("/api/profiles", response_model=List[ProfileResponse])
def get_all_profiles(
    current_user: CurrentUser,
    db: DbSession,
    min_score: int = 0,
    max_score: int = 100,
    min_stars: int = 0,
    has_email: bool = None,
    location: str = None,
    language: str = None,
    active_within_days: int = None,
    sort_by: str = "score",
    limit: int = 100,
):
    """Get all profiles with optional filters and sorting"""
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
        from filter_service import FilterService
        location_lower = location.lower().strip()
        location_terms = [location]
        for country, cities in FilterService.COUNTRY_CITIES.items():
            if location_lower == country or location_lower in country or country in location_lower:
                location_terms.extend(cities)
                break
        from filter_service import (
            COUNTRY_UNITED_STATES, COUNTRY_UNITED_KINGDOM, COUNTRY_UNITED_ARAB_EMIRATES
        )
        COUNTRY_ALIASES = {"usa": COUNTRY_UNITED_STATES, "us": COUNTRY_UNITED_STATES, "uk": COUNTRY_UNITED_KINGDOM, "uae": COUNTRY_UNITED_ARAB_EMIRATES}
        alias_country = COUNTRY_ALIASES.get(location_lower)
        if alias_country and alias_country in FilterService.COUNTRY_CITIES:
            location_terms.append(alias_country)
            location_terms.extend(FilterService.COUNTRY_CITIES[alias_country])
        location_terms = list(set(location_terms))
        from sqlalchemy import or_ as or_loc
        loc_filters = [Profile.location.ilike(f"%{term}%") for term in location_terms]
        query = query.filter(or_loc(*loc_filters))

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

    return profiles


# ===== GET SINGLE PROFILE =====

@app.get("/api/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile_details(
    profile_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get full details for a specific profile"""
    
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile with ID {profile_id} not found")
    
    return profile


# ===== LOG PROFILE UNLOCK =====

@app.post("/api/profiles/{profile_id}/log-unlock")
def log_profile_unlock(
    profile_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Log that a user unlocked/viewed a profile (increments profile_views usage)"""
    user_id = current_user.id

    # Check if within limits
    UsageService.check_limit(db, user_id, "profile_view")

    # Log the unlock
    UsageService.log_usage(db, user_id, "profile_view", {"profile_id": profile_id})

    # Record unlock for smart refresh priority
    try:
        from models import ProfileUnlock
        unlock_record = ProfileUnlock(user_id=user_id, profile_id=profile_id)
        db.add(unlock_record)
        db.commit()
    except Exception:
        db.rollback()

    # Return updated usage stats
    stats = UsageService.get_usage_stats(db, user_id)
    return {
        "success": True,
        "profile_id": profile_id,
        "usage": stats.get("usage", {})
    }


# ===== TOGGLE PROFILE SELECTION =====

@app.patch("/api/profiles/{profile_id}/toggle-select")
def toggle_profile_selection(
    profile_id: int,
    current_user: CurrentUser,
    db: DbSession,
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
    current_user: CurrentUser,
    db: DbSession,
):
    """Get all profiles marked as selected"""
    
    profiles = db.query(Profile).filter(Profile.selected == True).all()
    return profiles


# ===== SEND BULK EMAILS (UPDATED FOR RESEND) =====

def _validate_email_usage(db, user_id, profile_count):
    """Check email limits, trial expiry, and raise HTTPException if exceeded."""
    usage = UsageService.check_email_limit(db, user_id)

    # Check trial expiry
    if usage.get("trial_expired"):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "TRIAL_EXPIRED",
                "message": "Your free trial has expired. Please upgrade to continue sending emails."
            }
        )

    if not usage["can_send"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "EMAIL_LIMIT_EXCEEDED",
                "message": f"Email limit reached. You've used {usage['used']}/{usage['limit']} emails.",
                "usage": usage
            }
        )

    if profile_count > usage["remaining"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "EMAIL_LIMIT_EXCEEDED",
                "message": f"Cannot send {profile_count} emails. Only {usage['remaining']} remaining.",
                "usage": usage
            }
        )


def _log_sent_emails(db, user, results, user_settings):
    """Log successfully sent emails to the EmailOutreach table."""
    for detail in results['details']:
        if detail['status'] != 'sent':
            continue
        profile = db.query(Profile).filter(Profile.id == detail['profile_id']).first()
        if not profile:
            continue
        outreach = EmailOutreach(
            user_id=user.id,
            profile_id=profile.id,
            subject=user_settings['email_subject'],
            body=user_settings['email_template'],
            status='sent',
            sent_at=datetime.now(timezone.utc)
        )
        db.add(outreach)
    db.commit()


@app.post("/api/send-bulk-emails")
async def send_bulk_emails_endpoint(
    request: dict,
    current_user: CurrentUser,
    db: DbSession,
):
    """Send bulk emails to selected profiles using Resend"""
    try:
        profile_ids = request.get("profile_ids", [])

        if not profile_ids:
            raise HTTPException(status_code=400, detail="No profiles selected")

        user_settings = {
            'sender_email': current_user.sender_email or 'noreply@talentbox.co',
            'sender_name': current_user.sender_name or current_user.name,
            'email_subject': current_user.email_subject or 'Exciting Opportunity',
            'email_template': current_user.email_template or 'Hi {{name}},\n\nWe found your profile interesting!',
            'reply_method': current_user.reply_method or 'email',
            'reply_link': current_user.reply_link or ''
        }

        _validate_email_usage(db, current_user.id, len(profile_ids))

        # Reserve quota upfront to prevent race-condition over-usage
        # (if two requests come in simultaneously, both must claim quota before sending)
        reserved_count = len(profile_ids)
        current_user.usage_emails_sent = (current_user.usage_emails_sent or 0) + reserved_count
        db.commit()

        profiles = db.query(Profile).filter(Profile.id.in_(profile_ids)).all()
        profiles_data = [{
            'id': p.id,
            'name': p.name,
            'github_username': p.github_username,
            'email': p.email
        } for p in profiles]

        results = EmailService.send_bulk_emails(profiles_data, user_settings)

        _log_sent_emails(db, current_user, results, user_settings)

        # Adjust quota: give back credits for failed emails
        if results['failed'] > 0:
            current_user.usage_emails_sent = max(0, (current_user.usage_emails_sent or 0) - results['failed'])
            db.commit()

        return {
            "success": True,
            "sent": results['sent'],
            "failed": results['failed'],
            "message": f"Successfully sent {results['sent']} emails. {results['failed']} failed."
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk email error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ===== FILTER BY SCORE =====

@app.post("/api/filter-by-score")
def filter_by_score(
    profile_ids: List[int],
    current_user: CurrentUser,
    db: DbSession,
    min_score: int = 0,
    max_score: int = 100,
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
    current_user: CurrentUser,
    db: DbSession,
):
    """Get current usage statistics for user"""
    user_id = current_user.id
    stats = UsageService.get_usage_stats(db, user_id)
    return stats

# ===== CHECK CSV EXPORT LIMIT =====

@app.get("/api/check-csv-limit")
def check_csv_limit(
    current_user: CurrentUser,
    db: DbSession,
):
    """Check if user can export CSV"""
    usage = UsageService.check_csv_limit(db, current_user.id)
    return usage


# ===== LOG CSV EXPORT =====

@app.post("/api/log-csv-export")
def log_csv_export(
    current_user: CurrentUser,
    db: DbSession,
):
    """Log a CSV export"""
    UsageService.log_csv_export(db, current_user.id)
    return {"success": True}

# ===== HEALTH CHECK =====

@app.get("/api/health")
def health_check(db: DbSession):
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
        "version": "2.0.1",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ===== VERSION CHECK (for debugging) =====

@app.get("/api/version-check")
def version_check():
    """Verify which version of code is running - for debugging only"""
    return {
        "version": "2.0.1_RESEND",
        "features": [
            "Resend email integration",
            "Sender name support",
            "Email subject customization",
            "Reply method (email/form)",
            "UTM tracking for forms",
            "{{name}} variable with first name only"
        ],
        "fixes_applied": [
            "Fix #3: Empty profiles array bug",
            "Fix #4: Enhanced logging",
            "Fix #5: FilterService debug logs",
            "Fix #6: Profile saving error handling",
            "Fix #7: Missing logging import"
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "Resend Integration Complete ✅"
    }


# ===== ADMIN USAGE ENDPOINT =====

@app.get("/admin/usage")
async def admin_usage(
    request: Request,
    db: DbSession,
    days: int = 7,
    admin_key: str = None,
):
    """Top users by API consumption. Requires ADMIN_SECRET_KEY query param."""
    expected_key = os.getenv("ADMIN_SECRET_KEY", "")
    if not expected_key or admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Admin access denied")

    from rate_limit_service import get_admin_usage_stats
    return get_admin_usage_stats(db, days=days)


# ===== STREAMING SEARCH ENDPOINT (POST with proper auth) =====

from fastapi.responses import StreamingResponse
import json

@app.post("/api/search-profiles-stream")
@limiter.limit("30/minute")
async def search_profiles_stream(
    request: Request,
    search: SearchRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    ✅ OPTIMIZED STREAMING SEARCH - Target < 2 minutes

    Optimizations:
    - Target: 120 profiles (was 350)
    - Smooth progress (no phases)
    - Batch size: 25 (was 12)
    - No cooldown between batches
    """

    # ===== CHECK & LOG SEARCH USAGE BEFORE STREAMING =====
    user_id = current_user.id
    UsageService.check_limit(db, user_id, "search")

    # Search cooldown & concurrent lock
    from rate_limit_service import check_search_cooldown, acquire_search_lock, release_search_lock
    check_search_cooldown(db, user_id)
    if not acquire_search_lock(db, user_id):
        raise HTTPException(status_code=429, detail="A search is already in progress. Please wait.")

    filters_for_log = {
        "role": search.role,
        "languages": search.languages or ([search.language] if search.language else []),
        "location": search.location,
        "min_repos": search.min_repos or 0
    }
    UsageService.log_usage(db, user_id, "search", filters_for_log)

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
            
            # Convert to dicts (first name only in search results)
            def _first_name_stream(full_name):
                return full_name.split()[0] if full_name else None

            # ===== Redis cache check =====
            filter_hash = hash_filters(filters)
            cached_usernames = await get_cached_search(filter_hash)
            if cached_usernames is not None:
                logger.info("Redis cache hit for search")
                from models import Profile as ProfileModel
                redis_profiles = db.query(ProfileModel).filter(ProfileModel.github_username.in_(cached_usernames)).all()
                redis_dicts = []
                for profile in redis_profiles:
                    redis_dicts.append({
                        "id": profile.id,
                        "github_username": profile.github_username,
                        "name": _first_name_stream(profile.name),
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
                    })
                yield f"data: {json.dumps({'type': 'profiles', 'profiles': redis_dicts, 'count': len(redis_dicts)})}\n\n"
                yield f"data: {json.dumps({'type': 'complete', 'total': len(redis_dicts)})}\n\n"
                return

            all_profile_usernames = [p.github_username for p in cached_profiles]
            cached_dicts = []
            for profile in cached_profiles[:120]:  # ✅ Limit to 120
                profile_dict = {
                    "id": profile.id,
                    "github_username": profile.github_username,
                    "name": _first_name_stream(profile.name),
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
            from github_service import search_github_users_paginated
            from github_graphql_service import get_user_details_graphql as get_user_details, is_valid_user_data_graphql as is_valid_user_data
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
                
                # Process batch with staggered starts
                async def _fetch_staggered(username, index):
                    await asyncio.sleep(index * 0.2)
                    return await get_user_details(username)

                tasks = [_fetch_staggered(u, i) for i, u in enumerate(batch_usernames)]
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
                            source="github",
                            followers=details.get("followers", 0),
                            is_hireable=details.get("is_hireable", False),
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
                        
                        # Convert to dict (first name only)
                        profile_dict = {
                            "id": profile.id,
                            "github_username": profile.github_username,
                            "name": _first_name_stream(profile.name),
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
                        all_profile_usernames.append(profile.github_username)

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
            await set_cached_search(filter_hash, all_profile_usernames)
            yield f"data: {json.dumps({'type': 'complete', 'total': total_profiles})}\n\n"
            
        except Exception as e:
            logger.error(f"❌ Streaming search error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            release_search_lock(db, user_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "public, max-age=300",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


# ===== RUN WITH UVICORN =====

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)