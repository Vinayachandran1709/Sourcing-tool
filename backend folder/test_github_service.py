import asyncio
from github_service import search_github_users, get_user_details

async def test_search():
    """Test searching for Python developers"""
    print("Testing search_github_users...")
    print("=" * 50)
    
    results = await search_github_users(
        language="python",
        location="bangalore",
        min_repos=5
    )
    
    if "error" in results:
        print(f"❌ Error: {results['error']}")
        return
    
    print(f"✅ Found {results['total_count']} users")
    print(f"✅ Retrieved {len(results['items'])} profiles")
    
    # Show first result
    if results['items']:
        first_user = results['items'][0]
        print(f"\nFirst user: {first_user['login']}")
        print(f"Profile URL: {first_user['html_url']}")

async def test_get_details():
    """Test getting details for a specific user"""
    print("\n" + "=" * 50)
    print("Testing get_user_details...")
    print("=" * 50)
    
    # Test with a known user (Linus Torvalds)
    details = await get_user_details("torvalds")
    
    if details is None:
        print("❌ Failed to get user details")
        return
    
    print("✅ Successfully retrieved user details")
    print(f"Name: {details['name']}")
    print(f"Username: {details['username']}")
    print(f"Location: {details['location']}")
    print(f"Public repos: {details['public_repos']}")
    print(f"Bio: {details['bio']}")
    print(f"Contributions: {details['contributions']}")

async def main():
    """Run all tests"""
    await test_search()
    await test_get_details()

if __name__ == "__main__":
    # Run the async tests
    asyncio.run(main())
