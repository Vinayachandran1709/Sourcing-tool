import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com"

async def debug_user_data(username: str):
    """Debug what data GitHub returns for a user"""
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    print("=" * 70)
    print(f"DEBUGGING DATA FOR: {username}")
    print("=" * 70)
    print()
    
    async with httpx.AsyncClient() as client:
        
        # ===== TEST 1: Basic Profile =====
        print("TEST 1: Basic Profile")
        print("-" * 70)
        response = await client.get(
            f"{GITHUB_API_URL}/users/{username}",
            headers=headers
        )
        
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ Profile fetched successfully")
            print(f"   Name: {user_data.get('name')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Location: {user_data.get('location')}")
            print(f"   Bio: {user_data.get('bio')}")
            print(f"   Public repos: {user_data.get('public_repos')}")
            print(f"   Blog: {user_data.get('blog')}")
        else:
            print(f"❌ Failed: Status {response.status_code}")
            return
        
        print()
        
       # ===== TEST 2: Repositories =====
        print("TEST 2: Repositories")
        print("-" * 70)
        response = await client.get(
            f"{GITHUB_API_URL}/users/{username}/repos",
            headers=headers,
            params={
                "sort": "stars",
                "direction": "desc",
                "per_page": 100,  # Get up to 100
                "type": "owner"
            }
        )
        
        if response.status_code == 200:
            repos = response.json()
            # Filter out forks
            original_repos = [r for r in repos if not r.get('fork', False)]
            
            print(f"✅ Total repos returned: {len(repos)}")
            print(f"✅ Original (non-fork) repos: {len(original_repos)}")
            print(f"\n   Top 5 by stars:")
            
            # Sort by stars for display
            sorted_repos = sorted(original_repos, key=lambda x: x.get('stargazers_count', 0), reverse=True)
            
            for i, repo in enumerate(sorted_repos[:5], 1):
                print(f"   {i}. {repo['name']}")
                print(f"      ⭐ Stars: {repo.get('stargazers_count', 0)}")
                print(f"      💻 Language: {repo.get('language', 'None')}")
                print(f"      Fork: {repo.get('fork', False)}")
        else:
            print(f"❌ Failed: Status {response.status_code}")
        
        # ===== TEST 3: Language for First Repo =====
        if repos:
            first_repo = repos[0]['name']
            print(f"TEST 3: Languages for '{first_repo}'")
            print("-" * 70)
            
            response = await client.get(
                f"{GITHUB_API_URL}/repos/{username}/{first_repo}/languages",
                headers=headers
            )
            
            if response.status_code == 200:
                languages = response.json()
                print(f"✅ Languages data retrieved")
                if languages:
                    print(f"   Languages found: {list(languages.keys())}")
                    for lang, bytes_count in list(languages.items())[:5]:
                        print(f"   - {lang}: {bytes_count:,} bytes")
                else:
                    print(f"   ⚠️  No language data (empty response)")
            else:
                print(f"❌ Failed: Status {response.status_code}")
        
        print()
        
        # ===== TEST 4: Events (Activity) =====
        print("TEST 4: Recent Events (Activity)")
        print("-" * 70)
        response = await client.get(
            f"{GITHUB_API_URL}/users/{username}/events/public",
            headers=headers,
            params={"per_page": 10}
        )
        
        if response.status_code == 200:
            events = response.json()
            print(f"✅ Found {len(events)} recent events")
            if events:
                print(f"   Most recent event:")
                latest = events[0]
                print(f"   - Type: {latest.get('type')}")
                print(f"   - Created: {latest.get('created_at')}")
                print(f"   - Repo: {latest.get('repo', {}).get('name', 'Unknown')}")
            else:
                print(f"   ⚠️  No public events found")
        else:
            print(f"❌ Failed: Status {response.status_code}")
        
        print()
        
        # ===== TEST 5: Rate Limit Check =====
        print("TEST 5: Rate Limit Status")
        print("-" * 70)
        response = await client.get(
            f"{GITHUB_API_URL}/rate_limit",
            headers=headers
        )
        
        if response.status_code == 200:
            rate_data = response.json()
            core = rate_data['resources']['core']
            print(f"✅ Rate limit status:")
            print(f"   Remaining: {core['remaining']}/{core['limit']}")
            print(f"   Resets at: {core['reset']}")
            
            if core['remaining'] < 100:
                print(f"   ⚠️  WARNING: Low on API calls!")
        
        print()
        print("=" * 70)

async def main():
    username = input("Enter GitHub username to debug: ").strip()
    if not username:
        print("No username provided.")
        return
    
    await debug_user_data(username)

if __name__ == "__main__":
    asyncio.run(main())
