from fastapi import FastAPI, HTTPException, Depends, Request, Header, Response
from fastapi.responses import StreamingResponse
import json
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
        logger.info("✅ GitHub Token found")
    
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
        from sqlalchemy import text as sa_text
        from database import engine as db_engine
        with db_engine.connect() as conn:
            # Add payment columns to users table
            conn.execute(sa_text("""
                ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(50);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(50);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10, 2) DEFAULT 0;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
            """))

            # Create payment_history table
            conn.execute(sa_text("""
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
            """))

            # Create subscription_events table
            conn.execute(sa_text("""
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
            """))

            # Add GraphQL + rate limiting + smart refresh columns and tables
            conn.execute(sa_text("""
                ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0;
                ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_hireable BOOLEAN DEFAULT FALSE;
                ALTER TABLE profiles ADD COLUMN IF NOT EXISTS refresh_category VARCHAR(20) DEFAULT 'dormant';
                ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP WITH TIME ZONE;
            """))

            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS search_locks (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    search_completed BOOLEAN DEFAULT FALSE,
                    CONSTRAINT unique_user_lock UNIQUE (user_id)
                );
            """))

            conn.execute(sa_text("""
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
            """))

            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS profile_unlocks (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_profile_unlocks_profile ON profile_unlocks(profile_id);
                CREATE INDEX IF NOT EXISTS idx_profile_unlocks_time ON profile_unlocks(unlocked_at);
            """))

            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS refresh_job_log (
                    id SERIAL PRIMARY KEY,
                    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP WITH TIME ZONE,
                    profiles_refreshed INTEGER DEFAULT 0,
                    profiles_failed INTEGER DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'running'
                );
            """))

            # Backfill refresh categories for existing profiles
            conn.execute(sa_text("""
                UPDATE profiles SET refresh_category = 'active' WHERE contributions_last_year >= 300 AND refresh_category = 'dormant';
                UPDATE profiles SET refresh_category = 'moderate' WHERE contributions_last_year >= 100 AND contributions_last_year < 300 AND refresh_category = 'dormant';
            """))

            conn.commit()
        logger.info("✅ Payment tables verified/created")
    except Exception as e:
        logger.error(f"⚠️ Payment migration error: {e}")

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
#just for reference
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
    """Simplified search request - role and location based"""
    role: Optional[str] = None
    location: Optional[str] = None
    languages: Optional[List[str]] = None
    min_score: Optional[int] = 0
    page: Optional[int] = 1
    per_page: Optional[int] = 50

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
    search: SearchRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """Search for developer profiles — streams results progressively via SSE."""
    user_id = current_user.id

    logger.info(f"Search request from user {user_id}: role={search.role}, location={search.location}")

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

    role = search.role
    location = search.location
    languages = search.languages
    min_score = search.min_score or 0
    is_paid = current_user.subscription_status == "active"

    def _first_name(full_name):
        if full_name:
            return full_name.split()[0]
        return None

    def _profile_obj_to_dict(profile):
        return {
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
            "selected": False,
        }

    async def event_stream():
        try:
            from archive_search_service import search_developers, search_developers_batched, count_developers, developer_to_dict
            from github_integration_service import GitHubIntegrationService

            seen_usernames = set()
            total_sent = 0

            # --- STEP 1: Archive search (fast DB query, batched) ---
            try:
                total_matching = count_developers(db, role=role, location=location, languages=languages, min_score=min_score)
                yield f"data: {json.dumps({'type': 'count', 'total_matching': total_matching})}\n\n"

                batch_index = 0
                for batch in search_developers_batched(
                    db=db, role=role, location=location, languages=languages,
                    batch_size=500, min_score=min_score,
                ):
                    batch_dicts = [developer_to_dict(dev) for dev in batch]
                    for p in batch_dicts:
                        p["name"] = _first_name(p.get("name"))
                        seen_usernames.add(p["github_username"])

                    total_sent += len(batch_dicts)

                    if batch_index == 0:
                        yield f"data: {json.dumps({'type': 'profiles', 'profiles': batch_dicts})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'new_profiles', 'profiles': batch_dicts})}\n\n"

                    yield f"data: {json.dumps({'type': 'progress', 'loaded': total_sent, 'total': total_matching})}\n\n"
                    batch_index += 1

                logger.info(f"Streamed {total_sent} archive profiles in {batch_index} batches")
            except Exception as e:
                logger.error(f"Archive search failed: {e}", exc_info=True)
                yield f"data: {json.dumps({'type': 'profiles', 'profiles': []})}\n\n"

            # --- STEP 2: Supplement from Profile table if archive was small ---
            if total_sent < 500:
                yield f"data: {json.dumps({'type': 'status', 'message': 'Fetching more profiles...'})}\n\n"
                try:
                    filters = {"role": role, "location": location, "min_score": min_score}
                    cached_profiles = GitHubIntegrationService._search_database(db, filters)
                    new_dicts = []
                    for profile in cached_profiles:
                        if profile.github_username not in seen_usernames:
                            seen_usernames.add(profile.github_username)
                            new_dicts.append(_profile_obj_to_dict(profile))

                    if new_dicts:
                        total_sent += len(new_dicts)
                        yield f"data: {json.dumps({'type': 'new_profiles', 'profiles': new_dicts})}\n\n"
                        logger.info(f"Streamed {len(new_dicts)} supplement profiles")
                except Exception as e:
                    logger.error(f"Profile table supplement failed: {e}", exc_info=True)

            # --- STEP 3: Live GitHub API supplement for paid users ---
            if total_sent < 200 and is_paid:
                yield f"data: {json.dumps({'type': 'status', 'message': 'Searching GitHub for more...'})}\n\n"
                try:
                    from github_integration_service import check_github_rate_limit
                    await check_github_rate_limit()
                    new_profiles = await GitHubIntegrationService._fetch_from_github(
                        db, None, location, 0, 250, 200 - total_sent
                    )
                    api_dicts = []
                    for profile in new_profiles:
                        if profile.github_username not in seen_usernames:
                            seen_usernames.add(profile.github_username)
                            api_dicts.append(_profile_obj_to_dict(profile))
                    if api_dicts:
                        total_sent += len(api_dicts)
                        yield f"data: {json.dumps({'type': 'new_profiles', 'profiles': api_dicts})}\n\n"
                        logger.info(f"Streamed {len(api_dicts)} GitHub API profiles")
                except Exception as e:
                    logger.error(f"GitHub API supplement failed: {e}", exc_info=True)

            # --- DONE ---
            UsageService.log_usage(db, user_id, "search", {"role": role, "location": location})
            yield f"data: {json.dumps({'type': 'complete', 'total': total_sent})}\n\n"
            logger.info(f"Search complete: {total_sent} total profiles")

        finally:
            release_search_lock(db, user_id)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


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

# ===== GREENHOUSE OAUTH CALLBACK (placeholder) =====

@app.get("/greenhouse/callback")
def greenhouse_callback(code: Optional[str] = None, error: Optional[str] = None):
    """Placeholder Greenhouse OAuth callback endpoint."""
    if error:
        return {"status": "error", "message": error}
    if code:
        logger.info(f"Greenhouse OAuth callback received code: {code}")
        return {"status": "success", "code": code}
    return {"status": "error", "message": "no code received"}


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


# ===== RUN WITH UVICORN =====

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)