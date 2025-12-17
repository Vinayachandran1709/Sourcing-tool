from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta  # ⭐ ADDED timezone, timedelta
from auth_routes import router as auth_router
from waitlist_routes import router as waitlist_router
from filter_service import FilterService
from usage_service import UsageService
from models import User, SavedList, SavedListProfile
from lists_routes import router as lists_router
from email_routes import router as email_router
from razorpay_routes import router as razorpay_router

# Import from your existing files
from database import get_db
from models import Profile, OutreachLog, EmailOutreach, SearchHistory, ProfileView  # ⭐ ADDED new models
from github_service import search_github_users, get_user_details

# ⭐ NEW IMPORTS - Added for enhanced functionality
from profile_cache_service import ProfileCacheService
from email_service import EmailService

# ===== INITIALIZE FASTAPI APP =====
app = FastAPI(
    title="Developer Sourcing Tool API",
    description="API for searching and managing GitHub developer profiles",
    version="2.0.0"  # ⭐ UPDATED version
)
app.include_router(waitlist_router)
app.include_router(auth_router)

# ===== CORS MIDDLEWARE (allows frontend to call API) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://waitlist.talentbox.co",
        "https://talentbox.co",
        "https://www.talentbox.co",
        "https://app.talentbox.co",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== PYDANTIC MODELS FOR REQUEST/RESPONSE =====

class SearchRequest(BaseModel):
    """Enhanced request model for search"""
    # Role (required)
    role: Optional[str] = None
    
    # Technical Skills
    languages: Optional[List[str]] = []
    frameworks: Optional[List[str]] = []
    tools: Optional[List[str]] = []
    
    # Activity
    min_stars: Optional[int] = 0
    min_contributions: Optional[int] = 0
    recent_activity: Optional[str] = None  # "Last 30 days", "Last 90 days", "Last 6 months"
    
    # Location
    location: Optional[str] = None
    
    # Legacy support
    language: Optional[str] = None
    min_repos: Optional[int] = 0

class ProfileResponse(BaseModel):
    """Response model for profile data"""
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
    
    # Enhanced fields
    total_stars: int
    developer_score: int
    languages_data: Optional[dict] = None
    top_repos: Optional[list] = None
    last_active_date: Optional[datetime] = None
    last_fetched: Optional[datetime] = None
    
    class Config:
        from_attributes = True

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
        "message": "Developer Sourcing Tool API - Enhanced Edition",
        "version": "2.0.0",
        "features": [
            "Intelligent search with profile caching",
            "Fetches 200-300 profiles per search (not just 30)",
            "Email outreach with bulk sending",
            "Outreach history tracking"
        ],
        "endpoints": {
            "search": "/api/search-profiles",
            "profiles": "/api/profiles",
            "bulk_email": "/api/send-bulk-emails",
            "outreach_history": "/api/outreach-history",
            "docs": "/docs"
        }
    }

@app.post("/api/search-profiles")
async def search_profiles(search: SearchRequest, db: Session = Depends(get_db)):
    """Enhanced search with role-based filtering"""
    
    user_id = 1  # Mock for now
    
    try:
        UsageService.check_limit(db, user_id, "search")
    except HTTPException as e:
        return {"error": e.detail, "limit_reached": True}
    
    print(f"\n🔍 ENHANCED SEARCH")
    print(f"   Role: {search.role or 'Any'}")
    print(f"   Languages: {search.languages or 'Any'}")
    print()
    
    filters = {
        "role": search.role,
        "languages": search.languages or [search.language] if search.language else [],
        "frameworks": search.frameworks,
        "tools": search.tools,
        "min_stars": search.min_stars,
        "min_contributions": search.min_contributions,
        "recent_activity": search.recent_activity,
        "location": search.location
    }
    
    profiles = FilterService.apply_filters(db, filters)
    
    print(f"   ✅ Found {len(profiles)} matching profiles\n")
    
    UsageService.log_usage(db, user_id, "search", filters)
    
    return {
        "total_found": len(profiles),
        "profiles": profiles[:200]
    }

# ===== ENDPOINT 2: GET ALL PROFILES WITH FILTERS =====

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
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """
    Get all profiles with optional filters and sorting.
    
    Query Parameters:
        min_score: Minimum developer score (0-100)
        max_score: Maximum developer score (0-100)
        min_stars: Minimum total stars
        has_email: Filter by email availability (true/false)
        location: Filter by location (partial match)
        language: Filter by primary language
        active_within_days: Filter by recent activity (e.g., 30, 90)
        sort_by: Sort field (score, stars, repos, activity)
        limit: Maximum results to return (default 100)
    
    Examples:
        /api/profiles?min_score=70
        /api/profiles?min_score=70&location=bangalore
        /api/profiles?has_email=true&sort_by=stars
    """
    try:
        UsageService.check_limit(db, user_id, "profile_view")
    except HTTPException as e:
        return {"error": e.detail, "limit_reached": True}
    
    # Start with base query
    
    # Start with base query
    query = db.query(Profile)
    
    # ===== APPLY FILTERS =====
    
    # Filter by score range
    if min_score > 0:
        query = query.filter(Profile.developer_score >= min_score)
    
    if max_score < 100:
        query = query.filter(Profile.developer_score <= max_score)
    
    # Filter by stars
    if min_stars > 0:
        query = query.filter(Profile.total_stars >= min_stars)
    
    # Filter by email availability
    if has_email is not None:
        if has_email:
            # Has email (not null and not empty)
            query = query.filter(
                Profile.email.isnot(None),
                Profile.email != ""
            )
        else:
            # No email
            from sqlalchemy import or_
            query = query.filter(
                or_(Profile.email.is_(None), Profile.email == "")
            )
    
    # Filter by location (case-insensitive partial match)
    if location:
        query = query.filter(
            Profile.location.ilike(f"%{location}%")
        )
    
    # Filter by language (case-insensitive exact match)
    if language:
        query = query.filter(
            Profile.primary_language.ilike(language)
        )
    
    # Filter by recent activity
    if active_within_days:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=active_within_days)
        query = query.filter(
            Profile.last_active_date >= cutoff_date
        )
    
    # ===== APPLY SORTING =====
    
    if sort_by == "score":
        query = query.order_by(Profile.developer_score.desc())
    elif sort_by == "stars":
        query = query.order_by(Profile.total_stars.desc())
    elif sort_by == "repos":
        query = query.order_by(Profile.public_repos.desc())
    elif sort_by == "activity":
        query = query.order_by(Profile.last_active_date.desc())
    else:
        # Default to score
        query = query.order_by(Profile.developer_score.desc())
    
    # ===== APPLY LIMIT =====
    query = query.limit(limit)
    
    # Execute query and return
    profiles = query.all()
    
    # Log profile views
    for _ in profiles:
        UsageService.log_usage(db, user_id, "profile_view")
    
    return profiles

# ===== ENDPOINT 3: GET SINGLE PROFILE DETAILS =====

@app.get("/api/profiles/{profile_id}", response_model=ProfileResponse)
def get_profile_details(profile_id: int, db: Session = Depends(get_db)):
    """
    Get full details for a specific profile.
    
    Path Parameter:
        profile_id: The profile ID
    
    Example:
        /api/profiles/5
    
    Returns:
        Complete profile including top repos, languages, etc.
    """
    
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Profile with ID {profile_id} not found"
        )
    
    return profile

# ===== ENDPOINT 4: TOGGLE PROFILE SELECTION =====

@app.patch("/api/profiles/{profile_id}/toggle-select")
def toggle_profile_selection(profile_id: int, db: Session = Depends(get_db)):
    """
    Toggle selection status of a profile.
    
    Used for marking profiles to contact later.
    """
    
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Profile with ID {profile_id} not found"
        )
    
    # Toggle the selected field
    profile.selected = not profile.selected
    db.commit()
    db.refresh(profile)
    
    return {
        "id": profile.id,
        "username": profile.github_username,
        "selected": profile.selected
    }

# ===== ENDPOINT 5: GET SELECTED PROFILES =====

@app.get("/api/selected-profiles", response_model=List[ProfileResponse])
def get_selected_profiles(db: Session = Depends(get_db)):
    """
    Get all profiles marked as selected.
    
    Returns only profiles where selected = True.
    """
    
    profiles = db.query(Profile).filter(Profile.selected == True).all()
    
    return profiles

# ===== ENDPOINT 6: SEND BULK EMAILS (NEW - REPLACES OLD PLACEHOLDER) =====

@app.post("/api/send-bulk-emails")
def send_bulk_emails(email_request: EmailRequest, db: Session = Depends(get_db)):
    """
    ⭐ NEW: Send bulk emails to selected profiles.
    
    Request body:
    {
        "profile_ids": [1, 2, 3],
        "subject": "Job Opportunity at TechCorp",
        "body": "Hi {{name}}, we have an exciting opportunity for you..."
    }
    
    Note: Requires COMPANY_EMAIL and COMPANY_EMAIL_PASSWORD in .env
    """
    import os
    
    # Get company email credentials from environment
    company_email = os.getenv("COMPANY_EMAIL")
    company_password = os.getenv("COMPANY_EMAIL_PASSWORD")
    
    if not company_email or not company_password:
        raise HTTPException(
            status_code=500,
            detail="Email credentials not configured. Add COMPANY_EMAIL and COMPANY_EMAIL_PASSWORD to .env file."
        )
    
    # Get profiles
    profiles = db.query(Profile).filter(Profile.id.in_(email_request.profile_ids)).all()
    
    if not profiles:
        raise HTTPException(status_code=404, detail="No profiles found")
    
    # Prepare recipients (only those with email)
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
    
    # Log outreach in database
    for profile in profiles:
        if profile.email and '@' in profile.email:
            status = "sent" if any(r["email"] == profile.email for r in recipients) else "failed"
            outreach_log = EmailOutreach(
                profile_id=profile.id,
                subject=email_request.subject,
                body=email_request.body,
                status=status,
                company_email=company_email
                # ✅ sent_at handled by database automatically
            )
            db.add(outreach_log)
    
    db.commit()
    
    print(f"✅ Sent: {results['sent']}, Failed: {results['failed']}\n")
    
    return {
        "sent": results["sent"],
        "failed": results["failed"],
        "errors": results["errors"],
        "recipients": [r["email"] for r in recipients]
    }

# ===== ENDPOINT 7: GET OUTREACH HISTORY (NEW) =====

@app.get("/api/outreach-history")
def get_outreach_history(limit: int = 100, db: Session = Depends(get_db)):
    """
    ⭐ NEW: Get email outreach history.
    
    Shows all emails sent to developers with their status.
    """
    
    outreach_logs = db.query(EmailOutreach).order_by(
        EmailOutreach.sent_at.desc()
    ).limit(limit).all()
    
    results = []
    for log in outreach_logs:
        profile = db.query(Profile).filter(Profile.id == log.profile_id).first()
        if profile:  # Safety check
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
                "sent_at": log.sent_at,
                "company_email": log.company_email
            })
    
    return {
        "outreach_history": results,
        "total": len(results)
    }

# ===== ENDPOINT 8: GET SEARCH HISTORY (NEW) =====

@app.get("/api/search-history")
def get_search_history(limit: int = 50, db: Session = Depends(get_db)):
    """
    ⭐ NEW: Get search history.
    
    Shows all searches performed with their filters and results count.
    """
    
    search_logs = db.query(SearchHistory).order_by(
        SearchHistory.searched_at.desc()
    ).limit(limit).all()
    
    results = []
    for log in search_logs:
        results.append({
            "id": log.id,
            "filters": log.filters,
            "profiles_found": log.profiles_found,
            "searched_at": log.searched_at
        })
    
    return {
        "search_history": results,
        "total": len(results)
    }

# ===== ENDPOINT: FILTER BY SCORE =====

@app.post("/api/filter-by-score")
def filter_by_score(
    profile_ids: List[int],
    min_score: int = 0,
    max_score: int = 100,
    db: Session = Depends(get_db)
):
    """Filter profiles by developer score AFTER initial search"""
    profiles = db.query(Profile).filter(Profile.id.in_(profile_ids)).all()
    filtered = FilterService.filter_by_score(profiles, min_score, max_score)
    
    return {
        "total": len(filtered),
        "profiles": filtered
    }


# ===== ENDPOINT: GET USAGE STATS =====

@app.get("/api/usage-stats")
def get_usage_stats(user_id: int = 1, db: Session = Depends(get_db)):
    """Get current usage statistics for user"""
    stats = UsageService.get_usage_stats(db, user_id)
    return stats

# ===== INCLUDE LISTS ROUTES =====
app.include_router(lists_router)
app.include_router(email_router)
app.include_router(razorpay_router)

# ===== HEALTH CHECK ENDPOINT =====

@app.get("/api/health")
def health_check():
    """Check if API is running"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),  # ✅ FIXED
        "features": {
            "profile_caching": True,
            "pagination": True,
            "email_outreach": True,
            "history_tracking": True,
            "razorpay_payments": True
        }
    }

# ===== RUN WITH UVICORN =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)