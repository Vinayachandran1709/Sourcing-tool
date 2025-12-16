from database import SessionLocal
from lists_service import ListsService
from models import User

def test_saved_lists():
    """Test saved lists functionality"""
    db = SessionLocal()
    user_id = 1
    
    print("\n" + "="*60)
    print("Testing Saved Lists Management")
    print("="*60 + "\n")
    
    # Test 1: Check limits
    print("1️⃣ Checking list creation limits...")
    limits = ListsService.check_list_limits(db, user_id)
    print(f"   Can create: {limits['can_create']}")
    print(f"   Current lists: {limits['current']}")
    print(f"   Limit: {limits['limit']}\n")
    
    # Test 2: Create a list
    print("2️⃣ Creating a new list...")
    try:
        new_list = ListsService.create_list(
            db, user_id, 
            name="Top Frontend Developers",
            description="High-scoring React developers for Q1 hiring"
        )
        print(f"   ✅ Created list: '{new_list.name}' (ID: {new_list.id})\n")
        list_id = new_list.id
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
        db.close()
        return
    
    # Test 3: Get all lists
    print("3️⃣ Fetching all lists...")
    lists = ListsService.get_user_lists(db, user_id)
    for lst in lists:
        print(f"   📋 {lst['name']} - {lst['profile_count']} profiles")
    print()
    
    # Test 4: Add profiles to list
    print("4️⃣ Adding profiles to list...")
    from models import Profile
    profiles = db.query(Profile).limit(3).all()
    
    if profiles:
        for profile in profiles:
            try:
                ListsService.add_profile_to_list(
                    db, list_id, profile.id,
                    notes=f"Strong candidate for frontend role"
                )
                print(f"   ✅ Added {profile.github_username}")
            except Exception as e:
                print(f"   ⚠️  {profile.github_username}: {e}")
        print()
    else:
        print("   ⚠️  No profiles in database to add\n")
    
    # Test 5: Get profiles in list
    print("5️⃣ Fetching profiles in list...")
    list_profiles = ListsService.get_list_profiles(db, list_id, user_id)
    print(f"   Found {len(list_profiles)} profiles:")
    for lp in list_profiles:
        print(f"   - {lp['github_username']} (Score: {lp['developer_score']})")
        print(f"     Notes: {lp['notes']}")
    print()
    
    # Test 6: Update list
    print("6️⃣ Updating list name...")
    updated_list = ListsService.update_list(
        db, list_id, user_id,
        name="Senior Frontend Developers - Priority"
    )
    print(f"   ✅ Updated to: '{updated_list.name}'\n")
    
    # Test 7: Check profile limit
    print("7️⃣ Checking profile limit for this list...")
    profile_limit = ListsService.check_profile_limit(db, list_id)
    print(f"   Can add: {profile_limit['can_add']}")
    print(f"   Current: {profile_limit['current']}/{profile_limit['limit']}\n")
    
    print("="*60)
    print("✅ All tests completed!")
    print("="*60 + "\n")
    
    db.close()

if __name__ == "__main__":
    test_saved_lists()