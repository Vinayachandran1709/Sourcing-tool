import httpx
import os
import asyncio
import logging
from dotenv import load_dotenv
from datetime import datetime
from fastapi import HTTPException

logger = logging.getLogger(__name__)

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com"
RATE_LIMIT_THRESHOLD = 100


async def check_github_rate_limit():
    """Check GitHub API rate limit - ONLY CALL ONCE at start of search"""
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
                logger.info(f"GitHub API Rate Limit: {remaining} requests remaining")
                
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
    max_pages: int = 8,  # ✅ REDUCED: 5 pages = 150 users (enough for MVP target of 120)
    target_users: int = 250  # ✅ REDUCED: Stop at 150 users
):
    """
    ✅ OPTIMIZED SEARCH: Fetch pages until target reached
    """
    # ✅ OPTIMIZATION #1: Check rate limit ONCE at start
    await check_github_rate_limit()
    
    all_users = []
    
    logger.info(f"Fetching up to {max_pages} pages (target: {target_users} users)...")

    for page in range(1, max_pages + 1):
        logger.info(f"Page {page}/{max_pages}...")
        
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
                from github_rate_limiter import execute_with_rate_limit

                response = await execute_with_rate_limit(
                    client, "get",
                    f"{GITHUB_API_URL}/search/users?q={query}&per_page=30&page={page}",
                    headers=headers, timeout=30.0
                )

                if response.status_code != 200:
                    logger.error(f"GitHub search error: {response.status_code}")
                    break

                data = response.json()
                users = data.get("items", [])

                if not users:
                    logger.info("No more results")
                    break

                all_users.extend(users)
                logger.info(f"Got {len(users)} users (Total: {len(all_users)})")

                if len(all_users) >= target_users:
                    logger.info("Target reached! Stopping early.")
                    break

                # Cooldown between pages (rate limiter adds 0.2s, this adds extra spacing)
                await asyncio.sleep(0.2)

            except Exception as e:
                logger.error(f"Search page error: {e}")
                break

    logger.info(f"Total users fetched: {len(all_users)}")
    return all_users


async def get_user_repositories(username: str, max_repos: int = 30):
    """
    ✅ OPTIMIZATION #6: Fetch only 30 repos (was 100)
    Faster response, less data transfer
    """
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


async def calculate_language_distribution(username: str, repos, max_repos_to_check: int = 30):
    """
    ✅ FAST language distribution - NO extra API calls!
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


def estimate_last_activity_from_repos(repos):
    """
    ✅ OPTIMIZATION #3: Estimate activity from repo data (NO API call needed!)
    Instead of fetching events (slow), use pushed_at from repos
    """
    if not repos:
        return None
    
    # Find most recent push across all repos
    latest_push = None
    for repo in repos:
        pushed_at = repo.get("pushed_at")
        if pushed_at:
            try:
                date_obj = datetime.fromisoformat(pushed_at.replace('Z', '+00:00'))
                if latest_push is None or date_obj > latest_push:
                    latest_push = date_obj
            except:
                continue
    
    return latest_push


async def get_user_details(username: str):
    """
    ✅ OPTIMIZED: Get user details WITHOUT per-profile rate limit checks
    ✅ SKIP get_events API call - estimate from repo data instead
    
    Reduced from 4 API calls per profile to 2:
    - 1 for user basic info
    - 1 for repos
    """
    # ✅ NO rate limit check here - checked once at start of search
    
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
            logger.info(f"Skipped {username} (Organization)")
            return None
        
        # ✅ OPTIMIZATION #6: Get only 30 repos (was 100)
        repos = await get_user_repositories(username, max_repos=30)
        
        # Extract top repos
        top_repos_data = extract_top_repos(repos, top_n=5)
        
        # Calculate total stars
        total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)
        
        # Calculate language distribution
        languages_data = await calculate_language_distribution(username, repos, max_repos_to_check=30)
        
        # ✅ OPTIMIZATION #3: Estimate activity from repos (NO API call!)
        last_active = estimate_last_activity_from_repos(repos)
        
        # ✅ Simple contribution estimate (no extra API call)
        contributions = user_data.get("public_repos", 0) * 2

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
    
    logger.info(f"Fetching details for {total} users...")

    for i, username in enumerate(usernames, 1):
        try:
            details = await get_user_details(username)
            if details:
                all_details.append(details)
                logger.debug(f"[{i}/{total}] {username} OK")
            else:
                logger.debug(f"[{i}/{total}] {username} skipped (Org/Failed)")
        except Exception as e:
            logger.error(f"[{i}/{total}] {username} error: {e}")

        # Rate limit protection
        if i % 10 == 0:
            logger.info(f"Cooling down after {i} profiles...")
            await asyncio.sleep(2)

    logger.info(f"Fetched {len(all_details)}/{total} valid profiles")
    
    return all_details