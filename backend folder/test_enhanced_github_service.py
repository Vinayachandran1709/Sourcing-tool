import asyncio
from github_service import get_user_details
import json
from datetime import datetime

def datetime_handler(obj):
    """Helper to serialize datetime objects to JSON"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

async def test_enhanced_service():
    """Test the enhanced GitHub service with real user"""
    
    print("=" * 70)
    print("TESTING ENHANCED GITHUB SERVICE")
    print("=" * 70)
    print()
    
    # Test with a well-known GitHub user (has lots of data)
    test_username = "torvalds"  # Linus Torvalds - creator of Linux
    
    print(f"Testing with user: {test_username}")
    print(f"This will take 30-60 seconds (many API calls)...")
    print()
    
    # Get enhanced user details
    details = await get_user_details(test_username)
    
    if not details:
        print("❌ Failed to get user details")
        return
    
    print("=" * 70)
    print("RESULTS")
    print("=" * 70)
    print()
    
    # Basic Info
    print("📋 BASIC INFO:")
    print(f"   Username: {details['username']}")
    print(f"   Name: {details['name']}")
    print(f"   Location: {details['location']}")
    print(f"   Bio: {details['bio']}")
    print(f"   Email: {details['email'] or 'Not public'}")
    print()
    
    # Repository Stats
    print("📦 REPOSITORY STATS:")
    print(f"   Total repos: {details['public_repos']}")
    print(f"   Total stars: {details['total_stars']}")
    print()
    
    # Top Repositories
    print("⭐ TOP 5 REPOSITORIES:")
    for i, repo in enumerate(details['top_repos'], 1):
        print(f"   {i}. {repo['name']}")
        print(f"      ⭐ Stars: {repo['stars']} | 🍴 Forks: {repo['forks']}")
        print(f"      💻 Language: {repo['language']}")
        print(f"      📝 {repo['description'][:60]}...")
        print(f"      🔗 {repo['url']}")
        print()
    
    # Language Distribution
    print("💻 LANGUAGE DISTRIBUTION:")
    for lang, percentage in list(details['languages'].items())[:5]:  # Top 5 languages
        print(f"   {lang}: {percentage}%")
    print()
    
    # Activity
    print("📊 ACTIVITY:")
    print(f"   Recent contributions: {details['contributions']}")
    if details['last_active_date']:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        days_ago = (now - details['last_active_date']).days
        print(f"   Last active: {days_ago} days ago")
    else:
        print(f"   Last active: Unknown")
    print()
    
    # Save to JSON for inspection
    print("💾 Saving full data to test_output.json...")
    with open("test_output.json", "w") as f:
        json.dump(details, f, indent=2, default=datetime_handler)
    
    print("✅ Test complete! Check test_output.json for full data.")
    print()

async def test_your_own_username():
    """Test with a different username - useful for various scenarios"""
    
    print("\n" + "=" * 70)
    print("TEST YOUR OWN USERNAME")
    print("=" * 70)
    
    username = input("Enter a GitHub username to test: ").strip()
    
    if not username:
        print("No username provided, skipping.")
        return
    
    print(f"\nFetching data for {username}...")
    details = await get_user_details(username)
    
    if not details:
        print(f"❌ Could not fetch data for {username}")
        return
    
    print(f"\n✅ Successfully fetched data for {username}")
    print(f"   Repos: {details['public_repos']}")
    print(f"   Stars: {details['total_stars']}")
    print(f"   Languages: {list(details['languages'].keys())[:3]}")
    print(f"   Top repo: {details['top_repos'][0]['name'] if details['top_repos'] else 'None'}")

async def main():
    """Run all tests"""
    # Test 1: Well-known user
    await test_enhanced_service()
    
    # Test 2: Custom user (optional)
    try:
        await test_your_own_username()
    except KeyboardInterrupt:
        print("\nSkipped custom username test.")

if __name__ == "__main__":
    asyncio.run(main())