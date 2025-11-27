import asyncio
from github_service import get_user_details
from models import Profile
from database import SessionLocal
from datetime import datetime

def datetime_handler(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

async def test_real_user_scoring(username):
    """Fetch real user data and calculate score"""
    
    print(f"\nTesting with real user: {username}")
    print("=" * 70)
    
    # Fetch data from GitHub
    details = await get_user_details(username)
    
    if not details:
        print(f"❌ Could not fetch data for {username}")
        return None
    
    db = SessionLocal()
    
    try:
        # Create or update profile in database
        existing = db.query(Profile).filter(
            Profile.github_username == username
        ).first()
        
        if existing:
            profile = existing
            # Update fields
            profile.total_stars = details['total_stars']
            profile.public_repos = details['public_repos']
            profile.contributions_last_year = details['contributions']
            profile.last_active_date = details['last_active_date']
            profile.languages_data = details['languages']
        else:
            profile = Profile(
                github_username=details['username'],
                name=details['name'],
                email=details['email'],
                location=details['location'],
                bio=details['bio'],
                public_repos=details['public_repos'],
                contributions_last_year=details['contributions'],
                total_stars=details['total_stars'],
                last_active_date=details['last_active_date'],
                languages_data=details['languages'],
                top_repos=details['top_repos'],
                avatar_url=details['avatar_url'],
                portfolio_url=details['portfolio_url']
            )
            db.add(profile)
        
        db.commit()
        db.refresh(profile)
        
        # Calculate score
        score = profile.calculate_developer_score()
        
        # Update score in database
        profile.developer_score = score
        db.commit()
        
        # Display results
        print(f"\n📋 Profile: {profile.name or username}")
        print(f"   Location: {profile.location or 'Unknown'}")
        print()
        print(f"📊 Statistics:")
        print(f"   ⭐ Total Stars: {profile.total_stars:,}")
        print(f"   📦 Public Repos: {profile.public_repos}")
        print(f"   📈 Contributions: {profile.contributions_last_year}")
        print(f"   💻 Languages: {len(profile.languages_data) if profile.languages_data else 0}")
        
        if profile.last_active_date:
            days_ago = (datetime.now(profile.last_active_date.tzinfo) - profile.last_active_date).days
            print(f"   🕐 Last Active: {days_ago} days ago")
        
        print()
        print(f"🎯 DEVELOPER SCORE: {score}/100")
        
        # Interpretation
        if score >= 85:
            level = "Expert/Senior"
            emoji = "🌟"
        elif score >= 70:
            level = "Advanced"
            emoji = "⭐"
        elif score >= 50:
            level = "Intermediate/Mid-Level"
            emoji = "📈"
        elif score >= 30:
            level = "Junior"
            emoji = "🌱"
        else:
            level = "Beginner"
            emoji = "🆕"
        
        print(f"   {emoji} Level: {level}")
        print()
        
        return profile
        
    finally:
        db.close()

async def main():
    """Test with multiple real users"""
    
    print("=" * 70)
    print("TESTING SCORING WITH REAL GITHUB PROFILES")
    print("=" * 70)
    
    # Test with diverse real users
    test_users = [
        "knadh",      # Active developer with good stats
        "torvalds",   # Linus Torvalds - high profile
        "catherineisonline",
        "windsornguyen"
        # Add your own username or others you want to test
    ]
    
    for username in test_users:
        try:
            await test_real_user_scoring(username)
        except Exception as e:
            print(f"❌ Error testing {username}: {e}")
    
    print("=" * 70)
    print("Testing complete!")
    print()

if __name__ == "__main__":
    asyncio.run(main())
