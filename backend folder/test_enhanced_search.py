import asyncio
from github_service import search_github_users_paginated, get_multiple_user_details

async def test_pagination():
    """Test fetching 200-300 profiles with pagination (NO ORGANIZATIONS)"""
    
    print("=" * 80)
    print("TESTING ENHANCED SEARCH WITH PAGINATION")
    print("=" * 80)
    print()
    
    # Search for Python developers
    print("🔍 Searching for Python developers in India...")
    users = await search_github_users_paginated(
        language="python",
        location="india",
        min_repos=5,
        max_pages=5  # 5 pages = ~150 profiles
    )
    
    print(f"\n✅ Fetched {len(users)} INDIVIDUAL DEVELOPERS from GitHub")
    print("   (Organizations filtered out)\n")
    
    # ⭐ CHANGED: Get details for first 50 (instead of 20)
    print(f"📥 Fetching details for first 50 users...")
    usernames = [u["login"] for u in users[:50]]
    details = await get_multiple_user_details(usernames)
    
    print(f"\n✅ Got details for {len(details)} profiles")
    
    # Show top 10 (instead of 5)
    print(f"\n⭐ Top 10 profiles:")
    for i, profile in enumerate(details[:10], 1):
        print(f"   {i}. {profile['username']}")
        print(f"      Stars: {profile['total_stars']}")
        print(f"      Repos: {profile['public_repos']}")
        print(f"      Contributions: {profile['contributions']}")
        print()
    
    # Show stats
    print(f"\n📊 STATISTICS:")
    print(f"   Total searched: {len(users)}")
    print(f"   Details fetched: {len(details)}")
    print(f"   Organizations filtered: Many (automatic)")

if __name__ == "__main__":
    asyncio.run(test_pagination())