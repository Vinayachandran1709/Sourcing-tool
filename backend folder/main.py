from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta  # ⭐ ADDED timezone, timedelta
from waitlist_routes import router as waitlist_router

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
    """Request model for GitHub search"""
    language: str
    location: Optional[str] = None
    min_repos: Optional[int] = 0
    min_contributions: Optional[int] = 0

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

# ===== ENDPOINT 1: ENHANCED SEARCH (REPLACES OLD ONE) =====

@app.post("/api/search-profiles")
async def search_profiles(search: SearchRequest, db: Session = Depends(get_db)):
    """
    ⭐ ENHANCED SEARCH - NEW VERSION:
    1. Searches cached profiles in DB first (instant)
    2. Fetches 200-300 fresh profiles from GitHub (paginated)
    3. Saves all new profiles to DB
    4. Returns merged, deduplicated results
    
    This solves the GitHub 30-profile limit by automatically fetching multiple pages.
    """
    
    print(f"\n🔍 ENHANCED SEARCH")
    print(f"   Language: {search.language}")
    print(f"   Location: {search.location or 'Any'}")
    print(f"   Min repos: {search.min_repos}")
    print(f"   Min contributions: {search.min_contributions}")
    print()
    
    # STEP 1: Search cached profiles
    print("📦 Step 1: Searching database cache...")
    filters = {
        "language": search.language,
        "location": search.location,
        "min_repos": search.min_repos
    }
    cached_profiles = ProfileCacheService.search_cached_profiles(db, filters)
    print(f"   ✅ Found {len(cached_profiles)} cached profiles\n")
    
    # STEP 2: Fetch fresh profiles from GitHub (PAGINATED - gets 200-300 profiles)
    print("🌐 Step 2: Fetching fresh profiles from GitHub...")
    from github_service import search_github_users_paginated, get_multiple_user_details
    
    github_users = await search_github_users_paginated(
        language=search.language,
        location=search.location,
        min_repos=search.min_repos,
        max_pages=10  # Fetch 10 pages = ~300 profiles
    )
    
    # Get usernames
    usernames = [user["login"] for user in github_users[:100]]  # Limit to 100 for reasonable API usage
    
    # Fetch detailed info
    github_details = await get_multiple_user_details(usernames)
    
    # Filter by min_contributions
    if search.min_contributions > 0:
        github_details = [
            d for d in github_details 
            if d.get("contributions", 0) >= search.min_contributions
        ]
    
    print(f"   ✅ Fetched {len(github_details)} detailed profiles from GitHub\n")
    
    # STEP 3: Save GitHub profiles to DB
    print("💾 Step 3: Saving new profiles to database...")
    saved_github_profiles = ProfileCacheService.save_profiles_to_db(db, github_details)
    print(f"   ✅ Saved/updated {len(saved_github_profiles)} profiles\n")
    
    # STEP 4: Merge cached + GitHub profiles (remove duplicates)
    print("🔀 Step 4: Merging and deduplicating results...")
    all_profiles = ProfileCacheService.merge_and_deduplicate(cached_profiles, saved_github_profiles)
    
    # Sort by score
    all_profiles.sort(key=lambda p: p.developer_score, reverse=True)
    print(f"   ✅ Final result: {len(all_profiles)} unique profiles\n")
    
    # STEP 5: Log search history
    ProfileCacheService.log_search(db, filters, len(all_profiles))
    
    # STEP 6: Log profile views
    profile_ids = [p.id for p in all_profiles]
    ProfileCacheService.log_profile_views(db, profile_ids)
    
    print("✅ Search complete!\n")
    print(f"📊 Summary:")
    print(f"   From cache: {len(cached_profiles)}")
    print(f"   From GitHub: {len(github_details)}")
    print(f"   Total unique: {len(all_profiles)}")
    print()
    
    return {
        "total_found": len(all_profiles),
        "from_cache": len(cached_profiles),
        "from_github": len(github_details),
        "profiles": all_profiles[:200]  # Return top 200
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
            "history_tracking": True
        }
    }

# ===== RUN WITH UVICORN =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)