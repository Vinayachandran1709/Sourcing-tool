"""
AI Service - Generates profile summaries using Groq API (FREE)
Uses Llama 3.1 70B model for high-quality summaries
"""

import os
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

# Configure Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

if GROQ_API_KEY:
    logger.info("✅ Groq API configured")
else:
    logger.warning("⚠️ GROQ_API_KEY not set - AI summaries disabled")


async def generate_profile_summary(profile_data: dict) -> Optional[str]:
    """
    Generate a 2-3 line AI summary for a developer profile using Groq.

    Args:
        profile_data: Dict containing profile fields

    Returns:
        AI-generated summary string or None if failed
    """
    if not GROQ_API_KEY:
        return None

    try:
        # Extract relevant data
        name = profile_data.get("name", "Developer")
        roles = profile_data.get("detected_roles", [])
        primary_role = profile_data.get("detected_role", "Software Developer")
        languages = profile_data.get("languages", [])[:5]
        repos = profile_data.get("public_repos", 0)
        stars = profile_data.get("total_stars", 0)
        followers = profile_data.get("followers", 0)
        contributions = profile_data.get("contributions_last_year", 0)
        experience_years = profile_data.get("estimated_experience_years", 0)
        location = profile_data.get("location", "")
        bio = profile_data.get("bio", "")
        score = profile_data.get("developer_score", 0)

        # Build prompt
        prompt = f"""Generate a professional 2-3 sentence summary for a tech recruiter about this developer. Be concise and highlight key strengths. Do not use the developer's name.

Developer Profile:
- Primary Role: {primary_role}
- All Roles: {', '.join(roles) if roles else primary_role}
- Top Languages: {', '.join(languages) if languages else 'Not specified'}
- Experience: {experience_years} years on GitHub
- Repositories: {repos}
- GitHub Stars: {stars}
- Followers: {followers}
- Contributions (last year): {contributions}
- Location: {location or 'Not specified'}
- Bio: {bio or 'Not provided'}
- Quality Score: {score}/100

Write a recruiter-friendly summary (2-3 sentences, no bullet points, no name). Focus on: expertise level, main skills, activity level, and standout metrics."""

        # Call Groq API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-70b-versatile",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 150,
                    "temperature": 0.7
                }
            )

            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return None

            data = response.json()
            summary = data["choices"][0]["message"]["content"].strip()

            # Clean up summary (remove quotes if present)
            if summary.startswith('"') and summary.endswith('"'):
                summary = summary[1:-1]

            logger.info(f"Generated AI summary for profile (score: {score})")
            return summary

    except Exception as e:
        logger.error(f"Error generating AI summary: {e}")
        return None


async def parse_job_description(jd_text: str) -> Optional[dict]:
    """
    Parse a job description and extract search filters using Groq.

    Args:
        jd_text: Raw job description text

    Returns:
        Dict with extracted filters: role, languages, location, experience
    """
    if not GROQ_API_KEY:
        return None

    try:
        prompt = f"""Analyze this job description and extract the following in JSON format:
- role: The primary developer role (must be one of: Frontend Developer, Backend Developer, Full-Stack Developer, Mobile Developer, DevOps Engineer, Data Scientist, AI/ML Engineer, Data Engineer, Security Engineer, QA Engineer, Blockchain Developer, Game Developer, Embedded Engineer, Software Developer)
- languages: Array of programming languages mentioned (e.g., ["Python", "JavaScript"])
- location: Preferred location if mentioned (e.g., "Bangalore" or "Remote" or null)
- min_experience: Minimum years of experience as integer (e.g., 3) or null

Job Description:
{jd_text}

Respond ONLY with valid JSON, no markdown, no explanation. Example:
{{"role": "Backend Developer", "languages": ["Python", "Go"], "location": "Bangalore", "min_experience": 3}}"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-70b-versatile",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 200,
                    "temperature": 0.3
                }
            )

            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return None

            data = response.json()
            result_text = data["choices"][0]["message"]["content"].strip()

            # Remove markdown code blocks if present
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                result_text = result_text.rsplit("```", 1)[0]

            import json
            result = json.loads(result_text)
            logger.info(f"Parsed JD: role={result.get('role')}, languages={result.get('languages')}")
            return result

    except Exception as e:
        logger.error(f"Error parsing job description: {e}")
        return None


def check_groq_status() -> dict:
    """Check if Groq API is configured and return status."""
    return {
        "configured": bool(GROQ_API_KEY),
        "provider": "Groq",
        "model": "llama-3.1-70b-versatile",
        "free_tier": True,
        "daily_limit": 14400
    }
