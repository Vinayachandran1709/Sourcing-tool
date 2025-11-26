import asyncio
from github_service import (
    get_user_details,
    get_user_repositories,
    calculate_language_distribution,
    extract_top_repos
)
import json
from datetime import datetime

def datetime_handler(obj):
    """Helper to serialize datetime objects"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

async def test_knadh_detailed():
    """Detailed test for knadh's profile"""
    
    username = "knadh"
    
    print("=" * 80)
    print(f"COMPREHENSIVE TEST FOR: {username}")
    print("=" * 80)
    print()
    
    # ===== STEP 1: Test repository fetching =====
    print("STEP 1: Fetching repositories")
    print("-" * 80)
    
    repos = await get_user_repositories(username, max_repos=100)
    
    print(f"Result: {len(repos)} repositories fetched")
    
    if repos:
        print(f"\nTop 5 by stars:")
        for i, repo in enumerate(repos[:5], 1):
            print(f"  {i}. {repo['name']}")
            print(f"     ⭐ {repo.get('stargazers_count', 0)} stars")
            print(f"     💻 {repo.get('language', 'Unknown')}")
    
    print()
    
    # ===== STEP 2: Test top repos extraction =====
    print("STEP 2: Extracting top repos")
    print("-" * 80)
    
    top_repos = extract_top_repos(repos, top_n=5)
    
    print(f"Result: {len(top_repos)} repos extracted")
    
    for i, repo in enumerate(top_repos, 1):
        print(f"  {i}. {repo['name']}")
        print(f"     Description: {repo['description'][:60] if repo['description'] else 'None'}...")
        print(f"     Stars: {repo['stars']}, Forks: {repo['forks']}")
    
    print()
    
    # ===== STEP 3: Test language calculation =====
    print("STEP 3: Calculating language distribution")
    print("-" * 80)
    
    languages = await calculate_language_distribution(username, repos, max_repos_to_check=20)
    
    print(f"Result: {len(languages)} languages found")
    
    if languages:
        print(f"\nLanguage breakdown:")
        for lang, percent in list(languages.items())[:10]:
            print(f"  {lang}: {percent}%")
    else:
        print("  ⚠️  No language data retrieved")
    
    print()
    
    # ===== STEP 4: Test complete user details =====
    print("STEP 4: Getting complete user details")
    print("-" * 80)
    
    details = await get_user_details(username)
    
    if not details:
        print("❌ Failed to get user details")
        return
    
    print("✅ Successfully retrieved complete details")
    print()
    
    # ===== Display Results =====
    print("=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    print()
    
    print("📋 BASIC INFO:")
    print(f"   Name: {details['name']}")
    print(f"   Username: {details['username']}")
    print(f"   Email: {details['email']}")
    print(f"   Location: {details['location']}")
    print(f"   Bio: {details['bio'][:80] if details['bio'] else 'None'}...")
    print(f"   Portfolio: {details['portfolio_url']}")
    print()
    
    print("📊 STATISTICS:")
    print(f"   Total repositories: {details['public_repos']}")
    print(f"   Total stars: {details['total_stars']:,}")
    print(f"   Recent contributions: {details['contributions']}")
    print()
    
    print("⭐ TOP REPOSITORIES:")
    for i, repo in enumerate(details['top_repos'], 1):
        print(f"   {i}. {repo['name']} ({repo['stars']} ⭐)")
    print()
    
    print("💻 LANGUAGES:")
    if details['languages']:
        for lang, percent in list(details['languages'].items())[:5]:
            print(f"   {lang}: {percent}%")
    else:
        print("   ⚠️  No language data")
    print()
    
    print("🕐 ACTIVITY:")
    if details['last_active_date']:
        days_ago = (datetime.now(details['last_active_date'].tzinfo) - details['last_active_date']).days
        print(f"   Last active: {days_ago} days ago")
    else:
        print(f"   Last active: Unknown")
    print()
    
    # ===== Save to file =====
    print("💾 Saving to knadh_test_output.json...")
    with open("knadh_test_output.json", "w") as f:
        json.dump(details, f, indent=2, default=datetime_handler)
    
    print("✅ Test complete!")
    print()
    
    # ===== Summary =====
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    issues = []
    
    if not details['email'] or '@users.noreply.github.com' in details['email']:
        issues.append("⚠️  Using fallback email (user's email not public)")
    
    if not details['languages']:
        issues.append("❌ No language data collected")
    
    if not details['top_repos']:
        issues.append("❌ No top repos")
    
    if details['total_stars'] == 0:
        issues.append("⚠️  No stars counted")
    
    if not details['last_active_date']:
        issues.append("⚠️  Could not determine last activity")
    
    if issues:
        print("\nIssues found:")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\n✅ All data collected successfully!")
    
    print()

if __name__ == "__main__":
    asyncio.run(test_knadh_detailed())
