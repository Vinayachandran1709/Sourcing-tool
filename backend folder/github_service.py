import httpx
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get GitHub token from environment
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com"

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
        

async def get_user_details(username: str):
    """
    Get detailed information about a specific GitHub user.
    
    Args:
        username: GitHub username (e.g., "torvalds")
    
    Returns:
        Dictionary with user details or None if user not found
    """
    
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    async with httpx.AsyncClient() as client:
        # Step 1: Get user profile information
        user_response = await client.get(
            f"{GITHUB_API_URL}/users/{username}",
            headers=headers
        )
        
        # Check if user was found
        if user_response.status_code != 200:
            return None
        
        # Convert response to dictionary
        user_data = user_response.json()
        
        # Step 2: Get user's recent activity (contributions)
        events_response = await client.get(
            f"{GITHUB_API_URL}/users/{username}/events/public?per_page=100",
            headers=headers
        )
        
        # Count contributions (approximate)
        contributions = len(events_response.json()) if events_response.status_code == 200 else 0
        
        # Step 3: Return organized data
        return {
            "username": user_data.get("login"),
            "name": user_data.get("name"),
            "email": user_data.get("email"),
            "location": user_data.get("location"),
            "bio": user_data.get("bio"),
            "public_repos": user_data.get("public_repos", 0),
            "avatar_url": user_data.get("avatar_url"),
            "portfolio_url": user_data.get("blog"),
            "contributions": contributions
        }