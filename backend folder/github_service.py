import httpx
import os
import asyncio
from dotenv import load_dotenv
from datetime import datetime
from fastapi import HTTPException

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com"
RATE_LIMIT_THRESHOLD = 100


async def check_github_rate_limit():
    """Check GitHub API rate limit"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{GITHUB_API_URL}/rate_limit",
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                remaining = data['resources']['core']['remaining']
                print(f"📊 GitHub API Rate Limit: {remaining} requests remaining")
                
                if remaining < RATE_LIMIT_THRESHOLD:
                    raise HTTPException(status_code=429, detail="GitHub rate limit low")
                
                return remaining
        except:
            return None


def is_valid_user_data(details):
    """Validate user data - must have repos OR contributions"""
    if not details or not details.get("username"):
        return False
    
    has_repos = details.get("public_repos", 0) > 0
    has_contributions = details.get("contributions", 0) > 0
    
    return has_repos or has_contributions


async def search_github_users_paginated(
    language: str, 
    location: str = None, 
    min_repos: int = 0, 
    max_pages: int = 10  # ✅ INCREASED from 4 to 10
):
    """
    ✅ AGGRESSIVE SEARCH: Fetch up to 10 pages = 300 profiles
    """
    await check_github_rate_limit()
    
    all_users = []
    
    print(f"🔍 Fetching up to {max_pages} pages...")
    
    for page in range(1, max_pages + 1):
        print(f"   Page {page}/{max_pages}...", end=" ")
        
        # Build query
        query_parts = []
        if language:
            query_parts.append(f"language:{language}")
        if location:
            query_parts.append(f"location:{location}")
        if min_repos > 0:
            query_parts.append(f"repos:>{min_repos}")
        
        query = "+".join(query_parts)
        
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{GITHUB_API_URL}/search/users?q={query}&per_page=30&page={page}",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    print(f"❌ Error {response.status_code}")
                    break
                
                data = response.json()
                users = data.get("items", [])
                
                if not users:
                    print("✅ No more results")
                    break
                
                all_users.extend(users)
                print(f"✅ Got {len(users)} users (Total: {len(all_users)})")
                
                await asyncio.sleep(1.2)  # Rate limit protection
                
            except Exception as e:
                print(f"❌ Error: {e}")
                break
    
    print(f"\n📊 Total users fetched: {len(all_users)}")
    return all_users


async def get_user_repositories(username: str, max_repos: int = 100):
    """Fetch user's repositories"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{GITHUB_API_URL}/users/{username}/repos",
                headers=headers,
                params={
                    "sort": "updated",
                    "per_page": max_repos,
                    "type": "owner"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                return []
            
            repos = response.json()
            original_repos = [repo for repo in repos if not repo.get("fork", False)]
            
            return original_repos
            
        except:
            return []


def extract_top_repos(repos, top_n: int = 5):
    """Extract top repos"""
    top_repos = []
    
    for repo in repos[:top_n]:
        top_repos.append({
            "name": repo.get("name", ""),
            "description": repo.get("description") or "No description",
            "stars": repo.get("stargazers_count", 0),
            "forks": repo.get("forks_count", 0),
            "url": repo.get("html_url", ""),
            "language": repo.get("language", "Unknown"),
            "last_updated": repo.get("pushed_at", "")
        })
    
    return top_repos


async def get_repo_languages(owner: str, repo_name: str):
    """Get language breakdown for a repo"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo_name}/languages",
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code == 200:
                return response.json()
            return {}
        except:
            return {}


async def calculate_language_distribution(username: str, repos, max_repos_to_check: int = 30):
    """
    ✅ FIX #2: FAST language distribution - NO extra API calls!
    Uses repo.language from repo list instead of fetching language breakdown
    """
    language_counts = {}
    
    repos_to_check = repos[:max_repos_to_check]
    
    # Count language occurrences across repos
    for repo in repos_to_check:
        lang = repo.get("language")
        if lang and lang != "null":
            language_counts[lang] = language_counts.get(lang, 0) + 1
    
    # Calculate percentages based on repo count
    if not language_counts:
        return {}
    
    total_repos = len(repos_to_check)
    percentages = {}
    
    for language, count in language_counts.items():
        percentage = round((count / total_repos) * 100, 1)
        percentages[language] = percentage
    
    # Sort by percentage (most used first)
    sorted_percentages = dict(
        sorted(percentages.items(), key=lambda x: x[1], reverse=True)
    )
    
    return sorted_percentages

async def get_last_activity_date(username: str):
    """Get last activity date"""
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{GITHUB_API_URL}/users/{username}/events/public",
                headers=headers,
                params={"per_page": 100}
            )
            
            if response.status_code != 200:
                return None
            
            events = response.json()
            
            if not events:
                return None
            
            most_recent_event = events[0]
            created_at = most_recent_event.get("created_at")
            
            if not created_at:
                return None
            
            date_obj = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            return date_obj
            
        except:
            return None


async def get_user_details(username: str):
    """
    ✅ STRICT: Get user details + SKIP ORGANIZATIONS
    """
    await check_github_rate_limit()
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        # Get basic profile
        user_response = await client.get(
            f"{GITHUB_API_URL}/users/{username}",
            headers=headers
        )
        
        if user_response.status_code != 200:
            return None
        
        user_data = user_response.json()
        
        # ✅ SKIP ORGANIZATIONS
        account_type = user_data.get("type", "User")
        if account_type == "Organization":
            print(f"⏭️  Skipped {username} (Organization)")
            return None
        
        # Get repositories
        repos = await get_user_repositories(username, max_repos=100)
        
        # Extract top repos
        top_repos_data = extract_top_repos(repos, top_n=5)
        
        # Calculate total stars
        total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)
        
        # ✅ STRICT: Calculate language distribution
        languages_data = await calculate_language_distribution(username, repos, max_repos_to_check=30)
        
        # Get last activity
        last_active = await get_last_activity_date(username)
        
        # Get contributions
        events_response = await client.get(
            f"{GITHUB_API_URL}/users/{username}/events/public?per_page=100",
            headers=headers
        )
        contributions = len(events_response.json()) if events_response.status_code == 200 else 0
        
        return {
            "username": user_data.get("login"),
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "location": user_data.get("location"),
            "bio": user_data.get("bio"),
            "avatar_url": user_data.get("avatar_url"),
            "portfolio_url": user_data.get("blog"),
            "public_repos": user_data.get("public_repos", 0),
            "top_repos": top_repos_data,
            "total_stars": total_stars,
            "languages": languages_data,
            "contributions": contributions,
            "last_active_date": last_active
        }


async def get_multiple_user_details(usernames: list):
    """Fetch details for multiple users - SKIP ORGANIZATIONS"""
    all_details = []
    total = len(usernames)
    
    print(f"\n📥 Fetching details for {total} users...")
    
    for i, username in enumerate(usernames, 1):
        print(f"   [{i}/{total}] {username}...", end=" ")
        
        try:
            details = await get_user_details(username)
            if details:
                all_details.append(details)
                print("✅")
            else:
                print("⏭️  (Org/Failed)")
        except Exception as e:
            print(f"❌ {e}")
        
        # Rate limit protection
        if i % 10 == 0:
            print(f"   💤 Cooling down...")
            await asyncio.sleep(2)
    
    print(f"\n✅ Fetched {len(all_details)}/{total} valid profiles\n")
    
    return all_details