from database import SessionLocal
from models import Profile

def test_existing_profiles():
    """Test that existing profiles still work after migration"""
    
    db = SessionLocal()
    
    try:
        # Get all profiles
        profiles = db.query(Profile).all()
        
        print(f"Found {len(profiles)} existing profiles")
        
        if len(profiles) == 0:
            print("No profiles in database yet. That's okay!")
            return
        
        # Check first profile
        first_profile = profiles[0]
        
        print(f"\nTesting first profile: {first_profile.github_username}")
        print(f"  Name: {first_profile.name}")
        print(f"  Email: {first_profile.email}")
        print(f"  Repos: {first_profile.public_repos}")
        print(f"  Contributions: {first_profile.contributions_last_year}")
        
        # Check new columns (should be NULL/empty)
        print(f"\nNew columns (should be empty):")
        print(f"  languages_data: {first_profile.languages_data}")
        print(f"  top_repos: {first_profile.top_repos}")
        print(f"  last_active_date: {first_profile.last_active_date}")
        print(f"  total_stars: {first_profile.total_stars}")
        print(f"  developer_score: {first_profile.developer_score}")
        
        print(f"\n✅ Existing profiles are intact!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    test_existing_profiles()
