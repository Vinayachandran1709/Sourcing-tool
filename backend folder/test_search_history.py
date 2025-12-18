from database import SessionLocal
from search_history_service import SearchHistoryService
from datetime import datetime

def test_search_history():
    """Test search history and profile view tracking"""
    db = SessionLocal()
    
    print("\n" + "="*70)
    print("📝 TESTING SEARCH HISTORY & PROFILE VIEWS")
    print("="*70 + "\n")
    
    user_id = 1
    
    # Test 1: Save a search
    print("Saving Test Search")
    print("-" * 70)
    
    search_params = {
        "search_type": "role-based",
        "role": "Full Stack Developer",
        "location": "San Francisco",
        "min_followers": 100,
        "languages": ["Python", "JavaScript"],
        "frameworks": ["React", "Django"],
        "min_score": 70
    }
    
    search = SearchHistoryService.save_search(
        db, user_id, search_params, results_count=25, top_profile_id=1
    )
    
    print(f"✅ Search saved with ID: {search.id}")
    print(f"   Role: {search.role}")
    print(f"   Location: {search.location}")
    print(f"   Results: {search.results_count}")
    
    # Test 2: Get search history
    print("\n2️⃣ Getting Search History")
    print("-" * 70)
    
    searches = SearchHistoryService.get_user_search_history(db, user_id, limit=10)
    
    print(f"Found {len(searches)} searches:")
    for s in searches[:5]:  # Show first 5
        print(f"\n   Search #{s.id}:")
        print(f"   Type: {s.search_type}")
        if s.role:
            print(f"   Role: {s.role}")
        if s.keywords:
            print(f"   Keywords: {s.keywords}")
        print(f"   Results: {s.results_count}")
        print(f"   Date: {s.search_date.strftime('%Y-%m-%d %H:%M')}")
    
    # Test 3: Recreate search
    print("\n3️⃣ Recreating Search")
    print("-" * 70)
    
    if searches:
        search_id = searches[0].id
        params = SearchHistoryService.recreate_search(db, search_id, user_id)
        
        if params:
            print(f"✅ Search #{search_id} parameters retrieved:")
            print(f"   Type: {params.get('search_type')}")
            print(f"   Role: {params.get('role')}")
            print(f"   Location: {params.get('location')}")
            print(f"   Languages: {params.get('languages')}")
    
    # Test 4: Track profile view
    print("\n4️⃣ Tracking Profile View")
    print("-" * 70)
    
    view = SearchHistoryService.track_profile_view(
        db, user_id, profile_id=1, viewed_from="search", search_history_id=search.id
    )
    
    print(f"✅ Profile view tracked")
    print(f"   Profile ID: {view.profile_id}")
    print(f"   View Count: {view.view_count}")
    print(f"   Viewed From: {view.viewed_from}")
    
    # Track same profile again
    view2 = SearchHistoryService.track_profile_view(
        db, user_id, profile_id=1, viewed_from="saved_list"
    )
    
    print(f"\n✅ Same profile viewed again")
    print(f"   View Count: {view2.view_count} (incremented)")
    
    # Test 5: Get profile view history
    print("\n5️⃣ Getting Profile View History")
    print("-" * 70)
    
    views = SearchHistoryService.get_user_profile_views(db, user_id, limit=10)
    
    print(f"Found {len(views)} profile views:")
    for v in views[:5]:
        print(f"\n   Profile: {v['username']} ({v['name']})")
        print(f"   View Count: {v['view_count']}")
        print(f"   Viewed From: {v['viewed_from']}")
        print(f"   Last Viewed: {v['last_viewed']}")
    
    # Test 6: Get statistics
    print("\n6️⃣ Getting Statistics")
    print("-" * 70)
    
    search_stats = SearchHistoryService.get_search_statistics(db, user_id)
    print(f"\n📊 SEARCH STATISTICS:")
    print(f"   Total Searches: {search_stats['total_searches']}")
    print(f"   This Week: {search_stats['searches_this_week']}")
    print(f"   Avg Results: {search_stats['average_results_per_search']}")
    print(f"   By Type: {search_stats['searches_by_type']}")
    
    view_stats = SearchHistoryService.get_profile_view_stats(db, user_id)
    print(f"\n👁️ PROFILE VIEW STATISTICS:")
    print(f"   Total Profiles Viewed: {view_stats['total_profiles_viewed']}")
    print(f"   Total Views: {view_stats['total_views']}")
    print(f"   This Week: {view_stats['views_this_week']}")
    
    if view_stats['most_viewed']:
        print(f"\n   Most Viewed:")
        for mv in view_stats['most_viewed']:
            print(f"      - {mv['username']}: {mv['view_count']} views")
    
    print("\n" + "="*70)
    print("✅ Search History Test Complete!")
    print("="*70 + "\n")
    
    db.close()

if __name__ == "__main__":
    test_search_history()