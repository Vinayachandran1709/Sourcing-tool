"""
Cleanup script to remove test/fake profiles from database.
Run once before launching MVP.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import DATABASE_URL
from models import Profile
import os
from dotenv import load_dotenv

load_dotenv()

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def cleanup_test_profiles():
    """Remove all test/fake profiles"""
    db = SessionLocal()
    
    try:
        # List of test usernames to remove
        test_usernames = [
            "Test User",
            "newbie_dev",
            "senior_dev",
            "junior_dev",
            "test_user",
            "fake_dev",
            "sample_dev",
            "demo_dev",
            "example_dev"
        ]
        
        # Also remove profiles with suspicious patterns
        print("🧹 Starting cleanup of test profiles...\n")
        
        deleted_count = 0
        
        # Method 1: Delete by exact username match
        for username in test_usernames:
            profiles = db.query(Profile).filter(
                Profile.github_username.ilike(f"%{username}%")
            ).all()
            
            for profile in profiles:
                print(f"  ❌ Deleting: {profile.github_username}")
                db.delete(profile)
                deleted_count += 1
        
        # Method 2: Delete profiles with "test" or "fake" in name
        test_patterns = ["test", "fake", "sample", "demo", "example"]
        for pattern in test_patterns:
            profiles = db.query(Profile).filter(
                Profile.name.ilike(f"%{pattern}%") |
                Profile.github_username.ilike(f"%{pattern}%")
            ).all()
            
            for profile in profiles:
                # Skip if already counted
                if profile not in [p for p in db.query(Profile).all()]:
                    continue
                    
                print(f"  ❌ Deleting (pattern '{pattern}'): {profile.github_username}")
                db.delete(profile)
                deleted_count += 1
        
        # Method 3: Delete profiles with 0 repos AND 0 stars (likely fake)
        fake_profiles = db.query(Profile).filter(
            Profile.public_repos == 0,
            Profile.total_stars == 0,
            Profile.contributions_last_year == 0
        ).all()
        
        for profile in fake_profiles:
            print(f"  ❌ Deleting (no activity): {profile.github_username}")
            db.delete(profile)
            deleted_count += 1
        
        # Commit all deletions
        db.commit()
        
        print(f"\n✅ Cleanup complete!")
        print(f"   Deleted {deleted_count} test/fake profiles")
        
        # Show remaining profile count
        remaining = db.query(Profile).count()
        print(f"   Remaining profiles in database: {remaining}")
        
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("="*60)
    print("  TALENTBOX - TEST PROFILE CLEANUP")
    print("="*60)
    print()
    
    response = input("⚠️  This will DELETE test profiles. Continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        cleanup_test_profiles()
    else:
        print("\n🚫 Cleanup cancelled.")