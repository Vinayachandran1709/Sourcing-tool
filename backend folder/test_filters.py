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

if __name__ == "__main__":
    test_role_filtering()