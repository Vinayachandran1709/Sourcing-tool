import httpx
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get GitHub token from environment
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com"

def is_valid_user_data(details):
    """
    Check if user data is valid and worth saving.
    
    Args:
        details: User details dictionary
    
    Returns:
        Boolean indicating if user has enough data to be useful
    """
    if not details:
        return False
    
    # Must have username
    if not details.get("username"):
        return False
    
    # Should have at least some activity
    # (0 repos AND 0 contributions means inactive/new account)
    has_repos = details.get("public_repos", 0) > 0
    has_contributions = details.get("contributions", 0) > 0
    
    if not (has_repos or has_contributions):
        print(f"Skipping {details.get('username')}: No repos or contributions")
        return False
    
    return True

async def search_github_users(language: str, location: str = None, min_repos: int = 0):
    """
    Search GitHub users by programming language and location.
    
    Args:
        language: Programming language (e.g., "python", "javascript")
        location: User location (e.g., "bangalore", "berlin") - optional
        min_repos: Minimum number of public repositories - optional
    
    Returns:
        Dictionary with search results or error message
    """
    
    # Build search query string
    query_parts = []
    
    if language:
        query_parts.append(f"language:{language}")
    
    if location:
        query_parts.append(f"location:{location}")
    
    if min_repos > 0:
        query_parts.append(f"repos:>{min_repos}")
    
    # Join all parts with + symbol
    query = "+".join(query_parts)
    # Example result: "language:python+location:bangalore+repos:>5"
    
    # Prepare authentication headers
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # Make async HTTP request
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GITHUB_API_URL}/search/users?q={query}&per_page=30",
            headers=headers
        )
        
        # Check if request was successful
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"GitHub API error: {response.status_code}"}

async def get_user_repositories(username: str, max_repos: int = 100):
    """
    Fetch user's repositories sorted by stars.
    
    Args:
        username: GitHub username
        max_repos: Maximum number of repos to fetch (default 100)
    
    Returns:
        List of repository dictionaries or empty list if error
    """
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Fetch repositories
            response = await client.get(
                f"{GITHUB_API_URL}/users/{username}/repos",
                headers=headers,
                params={
                    "sort": "stars",
                    "direction": "desc",
                    "per_page": max_repos,
                    "type": "owner"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                print(f"❌ Error fetching repos for {username}: {response.status_code}")
                return []
            
            repos = response.json()
            print(f"   📦 Fetched {len(repos)} repositories")
            
            # Filter out forked repositories
            original_repos = [repo for repo in repos if not repo.get("fork", False)]
            print(f"   ✅ {len(original_repos)} original repos (filtered out {len(repos) - len(original_repos)} forks)")
            
            return original_repos
            
        except Exception as e:
            print(f"❌ Exception fetching repos for {username}: {e}")
            return []

def extract_top_repos(repos, top_n: int = 5):
    """
    Extract top N repositories with relevant information.
    
    Args:
        repos: List of repository dictionaries from GitHub API
        top_n: Number of top repos to return (default 5)
    
    Returns:
        List of dictionaries with cleaned repo data
    """
    top_repos = []
    
    try:
        for repo in repos[:top_n]:  # Take only first N repos (already sorted by stars)
            repo_data = {
                "name": repo.get("name", ""),
                "description": repo.get("description", "No description") or "No description",
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "url": repo.get("html_url", ""),
                "language": repo.get("language", "Unknown"),
                "last_updated": repo.get("pushed_at", "")
            }
            top_repos.append(repo_data)  # ✅ FIXED: Now inside the loop!
            
    except Exception as e:
        print(f"Error processing repos: {e}")
    
    return top_repos

async def get_repo_languages(owner: str, repo_name: str):
    """
    Get language breakdown for a specific repository.
    
    Args:
        owner: Repository owner username
        repo_name: Repository name
    
    Returns:
        Dictionary of {language: bytes} or empty dict if error
    """
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
            
            if response.status_code != 200:
                return {}
            
            return response.json()
            
        except Exception as e:
            print(f"Error fetching languages for {owner}/{repo_name}: {e}")
            return {}

async def calculate_language_distribution(username: str, repos, max_repos_to_check: int = 20):
    """
    Calculate overall language distribution across user's repositories.
    
    Args:
        username: GitHub username
        repos: List of user's repositories
        max_repos_to_check: Maximum repos to analyze (to avoid rate limits)
    
    Returns:
        Dictionary of {language: percentage} sorted by percentage
    """
    # Collect language data from multiple repos
    total_bytes = {}
    
    # Only check top repos (to save API calls)
    repos_to_check = repos[:max_repos_to_check]
    
    print(f"Analyzing languages across {len(repos_to_check)} repos for {username}...")
    
    for repo in repos_to_check:
        repo_name = repo.get("name")
        
        # Get languages for this repo
        languages = await get_repo_languages(username, repo_name)
        
        # Aggregate bytes
        for language, bytes_count in languages.items():
            if language in total_bytes:
                total_bytes[language] += bytes_count
            else:
                total_bytes[language] = bytes_count
    
    # Calculate percentages
    if not total_bytes:
        return {}
    
    total = sum(total_bytes.values())
    percentages = {}
    
    for language, bytes_count in total_bytes.items():
        percentage = round((bytes_count / total) * 100, 1)
        percentages[language] = percentage
    
    # Sort by percentage (highest first)
    sorted_percentages = dict(
        sorted(percentages.items(), key=lambda x: x[1], reverse=True)
    )
    
    return sorted_percentages

async def get_last_activity_date(username: str):
    """
    Get the date of user's most recent activity.
    
    Args:
        username: GitHub username
    
    Returns:
        datetime object of last activity or None if unavailable
    """
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Get recent events (commits, PRs, issues, etc.)
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
            
            # Events are already sorted by date (newest first)
            # Get the first event's date
            most_recent_event = events[0]
            created_at = most_recent_event.get("created_at")
            
            if not created_at:
                return None
            
            # Parse ISO 8601 date
            from datetime import datetime
            date_obj = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            return date_obj
            
        except Exception as e:
            print(f"Error fetching last activity for {username}: {e}")
            return None

async def get_user_details(username: str):
    """
    Get comprehensive details about a GitHub user including:
    - Basic profile info
    - Top repositories
    - Language distribution
    - Activity metrics
    - Last activity date
    
    Args:
        username: GitHub username
    
    Returns:
        Dictionary with all user details or None if user not found
    """
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        # ===== STEP 1: Get basic user profile =====
        print(f"Fetching profile for {username}...")
        user_response = await client.get(
            f"{GITHUB_API_URL}/users/{username}",
            headers=headers
        )
        
        if user_response.status_code != 200:
            print(f"❌ User {username} not found")
            return None
        
        user_data = user_response.json()
        
        # ===== STEP 2: Get user's repositories =====
        print(f"Fetching repositories for {username}...")
        repos = await get_user_repositories(username, max_repos=100)
        
        # ===== STEP 3: Extract top 5 repositories =====
        top_repos_data = extract_top_repos(repos, top_n=5)
        
        # ===== STEP 4: Calculate total stars across all repos =====
        total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)
        
        # ===== STEP 5: Calculate language distribution =====
        print(f"Analyzing language distribution for {username}...")
        languages_data = await calculate_language_distribution(username, repos, max_repos_to_check=20)
        
        # ===== STEP 6: Get last activity date =====
        print(f"Fetching last activity for {username}...")
        last_active = await get_last_activity_date(username)
        
        # ===== STEP 7: Get approximate contributions (from events) =====
        print(f"Fetching activity metrics for {username}...")
        events_response = await client.get(
            f"{GITHUB_API_URL}/users/{username}/events/public?per_page=100",
            headers=headers
        )
        
        contributions = len(events_response.json()) if events_response.status_code == 200 else 0
        
        # ===== STEP 8: Combine all data =====
        print(f"✅ Successfully gathered all data for {username}\n")
        
        return {
            # Basic info
            "username": user_data.get("login"),
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "location": user_data.get("location"),
            "bio": user_data.get("bio"),
            "avatar_url": user_data.get("avatar_url"),
            "portfolio_url": user_data.get("blog"),
            
            # Repository stats
            "public_repos": user_data.get("public_repos", 0),
            "top_repos": top_repos_data,
            "total_stars": total_stars,
            
            # Language & activity
            "languages": languages_data,
            "contributions": contributions,
            "last_active_date": last_active
        }
