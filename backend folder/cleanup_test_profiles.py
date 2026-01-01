"""
Cleanup script to remove test/fake profiles from database.
Handles foreign key constraints properly.
Run once before launching MVP.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import DATABASE_URL
from models import Profile, SearchHistory, SavedListProfile, EmailCampaign, ProfileView
import os
from dotenv import load_dotenv

load_dotenv()

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def cleanup_test_profiles():
    """Remove all test/fake profiles and their references"""
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
        
        print("🧹 Starting cleanup of test profiles...\n")
        
        profiles_to_delete = []
        
        # Collect all profiles to delete
        print("📋 Step 1: Identifying test profiles...")
        
        # Method 1: Delete by exact username match
        for username in test_usernames:
            profiles = db.query(Profile).filter(
                Profile.github_username.ilike(f"%{username}%")
            ).all()
            
            for profile in profiles:
                if profile not in profiles_to_delete:
                    profiles_to_delete.append(profile)
                    print(f"  🔍 Found: {profile.github_username} (ID: {profile.id})")
        
        # Method 2: Delete profiles with "test" or "fake" in name or username
        test_patterns = ["test", "fake", "sample", "demo", "example"]
        for pattern in test_patterns:
            profiles = db.query(Profile).filter(
                (Profile.name != None) & Profile.name.ilike(f"%{pattern}%") |
                Profile.github_username.ilike(f"%{pattern}%")
            ).all()
            
            for profile in profiles:
                if profile not in profiles_to_delete:
                    profiles_to_delete.append(profile)
                    print(f"  🔍 Found (pattern '{pattern}'): {profile.github_username} (ID: {profile.id})")
        
        # Method 3: Delete profiles with 0 activity (likely fake)
        fake_profiles = db.query(Profile).filter(
            Profile.public_repos == 0,
            Profile.total_stars == 0,
            Profile.contributions_last_year == 0
        ).all()
        
        for profile in fake_profiles:
            if profile not in profiles_to_delete:
                profiles_to_delete.append(profile)
                print(f"  🔍 Found (no activity): {profile.github_username} (ID: {profile.id})")
        
        if not profiles_to_delete:
            print("\n✅ No test profiles found. Database is clean!")
            return
        
        print(f"\n📊 Total test profiles to delete: {len(profiles_to_delete)}")
        profile_ids = [p.id for p in profiles_to_delete]
        
        # Step 2: Clean up foreign key references
        print(f"\n🔗 Step 2: Cleaning up foreign key references...")
        
        # 2a. Update search_history (set top_profile_id to NULL)
        search_histories = db.query(SearchHistory).filter(
            SearchHistory.top_profile_id.in_(profile_ids)
        ).all()
        
        for sh in search_histories:
            print(f"  📝 Unlinking search_history ID {sh.id} from profile {sh.top_profile_id}")
            sh.top_profile_id = None
        
        print(f"     ✓ Updated {len(search_histories)} search history records")
        
        # 2b. Delete saved_list_profiles (junction table)
        saved_list_profiles = db.query(SavedListProfile).filter(
            SavedListProfile.profile_id.in_(profile_ids)
        ).all()
        
        for slp in saved_list_profiles:
            print(f"  📝 Removing profile {slp.profile_id} from saved list {slp.list_id}")
            db.delete(slp)
        
        print(f"     ✓ Deleted {len(saved_list_profiles)} saved list entries")
        
        # 2c. Delete email_campaigns
        campaigns = db.query(EmailCampaign).filter(
            EmailCampaign.profile_id.in_(profile_ids)
        ).all()
        
        for campaign in campaigns:
            print(f"  📧 Deleting email campaign {campaign.id} for profile {campaign.profile_id}")
            db.delete(campaign)
        
        print(f"     ✓ Deleted {len(campaigns)} email campaigns")
        
        # 2d. Delete profile_views
        views = db.query(ProfileView).filter(
            ProfileView.profile_id.in_(profile_ids)
        ).all()
        
        for view in views:
            print(f"  👁️ Deleting profile view {view.id} for profile {view.profile_id}")
            db.delete(view)
        
        print(f"     ✓ Deleted {len(views)} profile views")
        
        # Step 3: Delete the profiles themselves
        print(f"\n❌ Step 3: Deleting {len(profiles_to_delete)} profiles...")
        
        for profile in profiles_to_delete:
            print(f"  🗑️ Deleting profile: {profile.github_username} (ID: {profile.id})")
            db.delete(profile)
        
        # Commit all changes
        db.commit()
        
        print(f"\n✅ Cleanup complete!")
        print(f"   - Deleted {len(profiles_to_delete)} test/fake profiles")
        print(f"   - Updated {len(search_histories)} search history records")
        print(f"   - Deleted {len(saved_list_profiles)} saved list entries")
        print(f"   - Deleted {len(campaigns)} email campaigns")
        print(f"   - Deleted {len(views)} profile views")
        
        # Show remaining profile count
        remaining = db.query(Profile).count()
        print(f"\n📊 Remaining profiles in database: {remaining}")
        
    except Exception as e:
        print(f"\n❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("="*60)
    print("  TALENTBOX - TEST PROFILE CLEANUP")
    print("="*60)
    print()
    
    response = input("⚠️  This will DELETE test profiles and their references. Continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        cleanup_test_profiles()
    else:
        print("\n🚫 Cleanup cancelled.")