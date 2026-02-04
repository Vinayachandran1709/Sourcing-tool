"""
✅ OPTIMIZATION #8: GitHub GraphQL API Integration

BENEFITS:
- 1 API call instead of 3-4 REST calls per profile
- Fetch user + repos + languages in single request
- Faster response times (30-45 seconds vs 2 minutes)
- More efficient rate limit usage

USAGE:
Replace get_user_details() calls with get_user_details_graphql()
"""

import httpx
import os
from dotenv import load_dotenv
from datetime import datetime
import logging

load_dotenv()
logger = logging.getLogger(__name__)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"


# ✅ GraphQL query that fetches EVERYTHING in ONE call
GRAPHQL_USER_QUERY = """
query($username: String!) {
  user(login: $username) {
    login
    name
    email
    location
    bio
    avatarUrl
    websiteUrl
    isHireable
    
    # Get repositories (top 30, sorted by stars)
    repositories(first: 30, orderBy: {field: STARGAZERS, direction: DESC}, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes {
        name
        description
        stargazerCount
        forkCount
        url
        primaryLanguage {
          name
        }
        pushedAt
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            node {
              name
            }
            size
          }
          totalSize
        }
      }
    }
    
    # Get contribution stats
    contributionsCollection {
      contributionCalendar {
        totalContributions
      }
    }
    
    # Follower count
    followers {
      totalCount
    }
  }
}
"""


def _process_top_repos(repos):
    """Extract top 5 repositories as dicts."""
    top_repos = []
    for repo in repos[:5]:
        primary_lang = repo.get("primaryLanguage")
        top_repos.append({
            "name": repo.get("name", ""),
            "description": repo.get("description") or "No description",
            "stars": repo.get("stargazerCount", 0),
            "forks": repo.get("forkCount", 0),
            "url": repo.get("url", ""),
            "language": primary_lang.get("name") if primary_lang else "Unknown",
            "last_updated": repo.get("pushedAt", "")
        })
    return top_repos


def _calculate_language_distribution(repos):
    """Calculate language percentages from all repos."""
    language_stats = {}
    total_bytes = 0

    for repo in repos:
        for edge in repo.get("languages", {}).get("edges", []):
            lang_name = edge.get("node", {}).get("name")
            lang_size = edge.get("size", 0)
            if lang_name:
                language_stats[lang_name] = language_stats.get(lang_name, 0) + lang_size
                total_bytes += lang_size

    if total_bytes == 0:
        return {}

    languages_data = {
        lang: round((bytes_count / total_bytes) * 100, 1)
        for lang, bytes_count in language_stats.items()
    }
    return dict(sorted(languages_data.items(), key=lambda x: x[1], reverse=True))


def _get_last_active_date(repos):
    """Find the most recent push date across repos."""
    last_active = None
    for repo in repos:
        pushed_at = repo.get("pushedAt")
        if not pushed_at:
            continue
        try:
            date_obj = datetime.fromisoformat(pushed_at.replace('Z', '+00:00'))
            if last_active is None or date_obj > last_active:
                last_active = date_obj
        except (ValueError, TypeError):
            continue
    return last_active


def _parse_graphql_response(data, username):
    """Validate GraphQL response and return user_data or None."""
    if "errors" in data:
        logger.error(f"GraphQL errors for {username}: {data['errors']}")
        return None
    if not data.get("data") or not data["data"].get("user"):
        logger.warning(f"User {username} not found")
        return None
    return data["data"]["user"]


def _build_profile_from_user_data(user_data):
    """Build a profile dict from GraphQL user data."""
    repos = user_data.get("repositories", {}).get("nodes", [])

    return {
        "username": user_data.get("login"),
        "name": user_data.get("name"),
        "email": user_data.get("email"),
        "location": user_data.get("location"),
        "bio": user_data.get("bio"),
        "avatar_url": user_data.get("avatarUrl"),
        "portfolio_url": user_data.get("websiteUrl"),
        "public_repos": user_data.get("repositories", {}).get("totalCount", 0),
        "top_repos": _process_top_repos(repos),
        "total_stars": sum(repo.get("stargazerCount", 0) for repo in repos),
        "languages": _calculate_language_distribution(repos),
        "contributions": user_data.get("contributionsCollection", {}).get(
            "contributionCalendar", {}
        ).get("totalContributions", 0),
        "last_active_date": _get_last_active_date(repos),
        "followers": user_data.get("followers", {}).get("totalCount", 0),
        "is_hireable": user_data.get("isHireable", False)
    }


async def get_user_details_graphql(username: str):
    """
    Fetch complete user profile in ONE GraphQL call.
    Replaces 3-4 REST API calls per profile.
    """
    headers = {
        "Authorization": f"bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }

    query_data = {
        "query": GRAPHQL_USER_QUERY,
        "variables": {"username": username}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                GITHUB_GRAPHQL_URL,
                headers=headers,
                json=query_data,
                timeout=30.0
            )

            if response.status_code != 200:
                logger.error(f"GraphQL error {response.status_code} for {username}")
                return None

            user_data = _parse_graphql_response(response.json(), username)
            if not user_data:
                return None

            return _build_profile_from_user_data(user_data)

        except Exception as e:
            logger.error(f"GraphQL fetch failed for {username}: {e}", exc_info=True)
            return None


async def search_users_graphql(query: str, first: int = 30):
    """
    ✅ GraphQL user search (optional - can still use REST for search)
    
    Note: GitHub's GraphQL search is more complex, so we'll keep REST search
    and only use GraphQL for fetching user details
    """
    
    SEARCH_QUERY = """
    query($query: String!, $first: Int!) {
      search(query: $query, type: USER, first: $first) {
        userCount
        edges {
          node {
            ... on User {
              login
              name
              avatarUrl
              location
            }
          }
        }
      }
    }
    """
    
    headers = {
        "Authorization": f"bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }
    
    query_data = {
        "query": SEARCH_QUERY,
        "variables": {
            "query": query,
            "first": first
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                GITHUB_GRAPHQL_URL,
                headers=headers,
                json=query_data,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            
            if "errors" in data or not data.get("data"):
                return []
            
            edges = data["data"]["search"]["edges"]
            users = [edge["node"] for edge in edges]
            
            return users
            
        except Exception as e:
            logger.error(f"GraphQL search failed: {e}")
            return []


def is_valid_user_data_graphql(details):
    """Validate GraphQL user data"""
    if not details or not details.get("username"):
        return False
    
    has_repos = details.get("public_repos", 0) > 0
    has_contributions = details.get("contributions", 0) > 0
    
    return has_repos or has_contributions