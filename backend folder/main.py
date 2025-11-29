from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

# Import from your existing files
from database import get_db
from models import Profile, OutreachLog
from github_service import search_github_users, get_user_details

# ===== INITIALIZE FASTAPI APP =====
app = FastAPI(
    title="Developer Sourcing Tool API",
    description="API for searching and managing GitHub developer profiles",
    version="1.0.0"
)

# ===== CORS MIDDLEWARE (allows frontend to call API) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
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
        "message": "Developer Sourcing Tool API",
        "version": "1.0.0",
        "endpoints": {
            "search": "/api/search-profiles",
            "profiles": "/api/profiles",
            "docs": "/docs"
        }
    }

# ===== ENDPOINT 1: SEARCH AND SAVE PROFILES =====

@app.post("/api/search-profiles")
async def search_profiles(search: SearchRequest, db: Session = Depends(get_db)):
    """
    Search GitHub and save enhanced profiles to database.
    Now includes: language data, top repos, developer scoring.
    """
    
    print(f"\n🔍 Searching for: {search.language} developers")
    if search.location:
        print(f"   📍 Location: {search.location}")
    print(f"   📦 Min repos: {search.min_repos}")
    print(f"   📊 Min contributions: {search.min_contributions}")
    print()
    
    # Search GitHub
    github_results = await search_github_users(
        language=search.language,
        location=search.location,
        min_repos=search.min_repos
    )
    
    if "error" in github_results:
        raise HTTPException(status_code=500, detail=github_results["error"])
    
    saved_profiles = []
    skipped_count = 0
    
    # Loop through search results
    for user in github_results.get("items", []):
        username = user.get("login")
        
        print(f"Processing: {username}")
        
        # Check if profile already exists
        existing_profile = db.query(Profile).filter(
            Profile.github_username == username
        ).first()
        
        if existing_profile:
            print(f"  ℹ️  Profile exists, updating...")
            # Update existing profile with fresh data
            user_details = await get_user_details(username)
            
            if not user_details:
                print(f"  ❌ Could not fetch details")
                skipped_count += 1
                continue
            
            # Update all fields
            existing_profile.name = user_details.get("name")
            existing_profile.email = user_details.get("email")
            existing_profile.location = user_details.get("location")
            existing_profile.bio = user_details.get("bio")
            existing_profile.public_repos = user_details.get("public_repos", 0)
            existing_profile.contributions_last_year = user_details.get("contributions", 0)
            existing_profile.total_stars = user_details.get("total_stars", 0)
            existing_profile.last_active_date = user_details.get("last_active_date")
            existing_profile.languages_data = user_details.get("languages")
            existing_profile.top_repos = user_details.get("top_repos")
            existing_profile.avatar_url = user_details.get("avatar_url")
            existing_profile.portfolio_url = user_details.get("portfolio_url")
            existing_profile.last_fetched = datetime.utcnow()
            
            # Calculate and save developer score
            score = existing_profile.calculate_developer_score()
            existing_profile.developer_score = score
            
            db.commit()
            db.refresh(existing_profile)
            
            print(f"  ✅ Updated (Score: {score}/100)")
            saved_profiles.append(existing_profile)
            continue
        
        # Get detailed user info for new profiles
        user_details = await get_user_details(username)
        
        if not user_details:
            print(f"  ❌ Could not fetch details")
            skipped_count += 1
            continue
        
        # Filter by contributions if needed
        if user_details["contributions"] < search.min_contributions:
            print(f"  ⏭️  Skipped (low contributions: {user_details['contributions']})")
            skipped_count += 1
            continue
        
        # Create new profile with ALL data
        new_profile = Profile(
            github_username=user_details["username"],
            name=user_details["name"],
            email=user_details["email"],
            location=user_details["location"],
            bio=user_details["bio"],
            public_repos=user_details["public_repos"],
            primary_language=search.language,
            contributions_last_year=user_details["contributions"],
            total_stars=user_details["total_stars"],
            last_active_date=user_details["last_active_date"],
            languages_data=user_details["languages"],
            top_repos=user_details["top_repos"],
            avatar_url=user_details["avatar_url"],
            portfolio_url=user_details["portfolio_url"],
            last_fetched=datetime.utcnow()
        )
        
        # Calculate and save developer score
        score = new_profile.calculate_developer_score()
        new_profile.developer_score = score
        
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        
        print(f"  ✅ Saved (Score: {score}/100)")
        saved_profiles.append(new_profile)
    
    print(f"\n📊 Results:")
    print(f"   ✅ Saved/Updated: {len(saved_profiles)}")
    print(f"   ⏭️  Skipped: {skipped_count}")
    print()
    
    return {
        "total_found": len(saved_profiles),
        "skipped": skipped_count,
        "profiles": saved_profiles
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
        from datetime import timezone, timedelta
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

@app.get("/api/profiles/selected", response_model=List[ProfileResponse])
def get_selected_profiles(db: Session = Depends(get_db)):
    """
    Get all profiles marked as selected.
    
    Returns only profiles where selected = True.
    """
    
    profiles = db.query(Profile).filter(Profile.selected == True).all()
    
    return profiles

# ===== ENDPOINT 6: SEND EMAILS (PLACEHOLDER) =====

@app.post("/api/send-emails")
def send_emails(email_request: EmailRequest, db: Session = Depends(get_db)):
    """
    Send bulk emails to selected profiles.
    
    Note: This is a placeholder. Email sending will be implemented in Phase 6.
    """
    
    # Get profiles
    profiles = db.query(Profile).filter(
        Profile.id.in_(email_request.profile_ids)
    ).all()
    
    if not profiles:
        raise HTTPException(
            status_code=404,
            detail="No profiles found with provided IDs"
        )
    
    # Placeholder - actual email sending would go here
    sent_count = 0
    failed_count = 0
    
    for profile in profiles:
        if profile.email:
            # TODO: Implement actual email sending in Phase 6
            print(f"Would send email to: {profile.email}")
            sent_count += 1
        else:
            failed_count += 1
    
    return {
        "message": "Email sending not yet implemented",
        "would_send_to": sent_count,
        "missing_email": failed_count,
        "profiles": [p.github_username for p in profiles]
    }

# ===== HEALTH CHECK ENDPOINT =====

@app.get("/api/health")
def health_check():
    """Check if API is running"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

# ===== RUN WITH UVICORN =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)