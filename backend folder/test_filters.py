import asyncio
from filter_service import FilterService
from database import SessionLocal

def test_role_filtering():
    """Test role-based filtering"""
    db = SessionLocal()
    
    print("Testing Role-Based Filtering")
    print("=" * 60)
    
    # Test 1: Frontend Developer
    filters = {
        "role": "Frontend Developer",
        "location": None,
        "languages": [],
        "frameworks": [],
        "tools": [],
        "min_stars": 0,
        "min_contributions": 0,
        "recent_activity": None
    }
    
    profiles = FilterService.apply_filters(db, filters)
    print(f"\n✅ Frontend Developers: {len(profiles)} found")
    if profiles:
        print(f"   Top match: {profiles[0].github_username} (score: {profiles[0].developer_score})")
    
    # Test 2: Backend Developer with Python
    filters["role"] = "Backend Developer"
    filters["languages"] = ["Python"]
    
    profiles = FilterService.apply_filters(db, filters)
    print(f"\n✅ Backend Developers (Python): {len(profiles)} found")
    if profiles:
        print(f"   Top match: {profiles[0].github_username} (score: {profiles[0].developer_score})")
    
    # Test 3: With framework
    filters["frameworks"] = ["Django", "Flask"]
    
    profiles = FilterService.apply_filters(db, filters)
    print(f"\n✅ Backend Developers (Python + Django/Flask): {len(profiles)} found")
    if profiles:
        print(f"   Top match: {profiles[0].github_username} (score: {profiles[0].developer_score})")
    
    db.close()
    print("\n" + "=" * 60)


def test_location_filtering():
    """Test hierarchical location filtering"""
    db = SessionLocal()

    print("\nTesting Hierarchical Location Filtering")
    print("=" * 60)

    base_filters = {
        "role": None,
        "languages": [],
        "frameworks": [],
        "tools": [],
        "contributionRanges": [],
        "repoRanges": [],
    }

    # Test 1: Predefined City (San Francisco)
    # Should return: SF profiles first, then US profiles
    print("\n1️⃣ Test: Predefined City - San Francisco")
    filters = {**base_filters, "location": "San Francisco"}
    profiles = FilterService.apply_filters(db, filters)
    print(f"   ✅ Results: {len(profiles)} profiles")
    if profiles:
        print(f"   Top 3 locations: {[p.location for p in profiles[:3]]}")

    # Test 2: Typed City in Options (London)
    # Should return: London profiles first, then UK profiles
    print("\n2️⃣ Test: Typed City in Options - London")
    filters = {**base_filters, "location": "London"}
    profiles = FilterService.apply_filters(db, filters)
    print(f"   ✅ Results: {len(profiles)} profiles")
    if profiles:
        print(f"   Top 3 locations: {[p.location for p in profiles[:3]]}")

    # Test 3: Typed City NOT in Options (Melbourne)
    # Should return: Australia profiles only (not Melbourne-specific)
    print("\n3️⃣ Test: Typed City NOT in Options - Melbourne")
    filters = {**base_filters, "location": "Melbourne"}
    profiles = FilterService.apply_filters(db, filters)
    print(f"   ✅ Results: {len(profiles)} profiles")
    if profiles:
        print(f"   Top 3 locations: {[p.location for p in profiles[:3]]}")
        print(f"   ℹ️  Should only show Australia profiles, not Melbourne city")

    # Test 4: Country Search (Germany)
    # Should return: All Germany profiles
    print("\n4️⃣ Test: Country Search - Germany")
    filters = {**base_filters, "location": "Germany"}
    profiles = FilterService.apply_filters(db, filters)
    print(f"   ✅ Results: {len(profiles)} profiles")
    if profiles:
        print(f"   Top 3 locations: {[p.location for p in profiles[:3]]}")

    # Test 5: Region Search (Europe)
    # Should return: All European profiles
    print("\n5️⃣ Test: Region Search - Europe")
    filters = {**base_filters, "location": "Europe"}
    profiles = FilterService.apply_filters(db, filters)
    print(f"   ✅ Results: {len(profiles)} profiles")
    if profiles:
        print(f"   Top 5 locations: {[p.location for p in profiles[:5]]}")

    # Test 6: Remote
    # Should return: Profiles with "remote" in location
    print("\n6️⃣ Test: Broad Term - Remote")
    filters = {**base_filters, "location": "Remote"}
    profiles = FilterService.apply_filters(db, filters)
    print(f"   ✅ Results: {len(profiles)} profiles")
    if profiles:
        print(f"   Top 3 locations: {[p.location for p in profiles[:3]]}")

    # Test 7: Unknown/Invalid Location
    # Should fall back gracefully (return all profiles)
    print("\n7️⃣ Test: Unknown Location - XYZ123")
    filters = {**base_filters, "location": "XYZ123"}
    profiles = FilterService.apply_filters(db, filters)
    print(f"   ✅ Results: {len(profiles)} profiles (fallback to all)")
    print(f"   ℹ️  Should return all profiles as graceful fallback")

    db.close()
    print("\n" + "=" * 60)


if __name__ == "__main__":
    print("🧪 Running Filter Service Tests\n")
    test_role_filtering()
    test_location_filtering()
    print("\n✅ All tests completed!")