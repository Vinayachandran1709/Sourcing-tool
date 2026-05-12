"""
AI Service - Generates profile summaries and parses job descriptions using Groq API.
"""

import os
import json
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

if GROQ_API_KEY:
    logger.info("Groq API configured")
else:
    logger.warning("GROQ_API_KEY not set - AI summaries disabled")

# Locations the search engine can handle — used in the JD prompt
_KNOWN_LOCATIONS = """US cities: San Francisco, New York, Seattle, Austin, Los Angeles, Boston, Chicago, Denver, Atlanta, San Diego
India cities: Bangalore, Mumbai, Delhi, Hyderabad, Pune, Chennai, Kolkata, Gurgaon, Noida
Europe cities: London, Berlin, Amsterdam, Paris, Dublin, Zurich, Munich, Stockholm, Barcelona, Copenhagen, Warsaw, Lisbon, Prague, Vienna, Milan, Brussels
Middle East: Dubai, Tel Aviv, Abu Dhabi, Riyadh, Doha
Asia: Singapore, Tokyo, Hong Kong, Seoul, Shanghai, Beijing, Taipei, Kuala Lumpur, Bangkok
Australia/NZ: Sydney, Melbourne, Brisbane, Auckland
Countries (use when no specific city): United States, India, United Kingdom, Germany, Netherlands, France, Canada, Australia"""

# Remote synonyms that should return null location
_REMOTE_TERMS = {"remote", "anywhere", "worldwide", "work from home", "wfh", "global", "distributed", "fully remote", "hybrid remote"}


async def generate_profile_summary(profile_data: dict) -> Optional[str]:
    """Generate a 2-3 line AI summary for a developer profile using Groq."""
    if not GROQ_API_KEY:
        return None

    try:
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

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 150,
                    "temperature": 0.7
                }
            )

            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return None

            data = response.json()
            summary = data["choices"][0]["message"]["content"].strip()

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
    Priority: role and location. Languages are secondary. Experience is ignored.
    """
    if not GROQ_API_KEY:
        return None

    try:
        prompt = f"""You are a recruiting assistant. Extract search parameters from this job description.

RULES:
1. role — choose EXACTLY ONE from this list (pick the closest match):
   Frontend Developer, Backend Developer, Full-Stack Developer, Mobile Developer,
   DevOps Engineer, Data Scientist, AI/ML Engineer, Data Engineer, Security Engineer,
   QA Engineer, Blockchain Developer, Game Developer, Embedded Engineer, Software Developer

2. location — map to the CLOSEST entry from the list below (use the EXACT name as shown):
{_KNOWN_LOCATIONS}
   Aliases to apply: Bengaluru→Bangalore, Bombay→Mumbai, NCR/New Delhi→Delhi,
   NYC/New York City→New York, SF/Bay Area/Silicon Valley→San Francisco,
   LA/Los Angeles County→Los Angeles, DC/Washington DC→New York (skip if unclear)
   If the job says remote/anywhere/worldwide/no location → return null

3. languages — list the 2-3 most important programming languages only (e.g. ["Python", "Go"]).
   Use standard names: Python, JavaScript, TypeScript, Java, Go, Rust, C++, C#, Swift, Kotlin, Ruby, PHP, etc.
   Return [] if none are clearly specified.

4. min_experience — always return null (we do not filter by years of experience).

Job Description:
{jd_text[:2500]}

Respond with ONLY valid JSON, no markdown fences, no extra text:
{{"role": "Backend Developer", "location": "Bangalore", "languages": ["Python", "Go"], "min_experience": null}}"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 120,
                    "temperature": 0.1
                }
            )

            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return None

            data = response.json()
            result_text = data["choices"][0]["message"]["content"].strip()

            # Strip markdown fences if model added them
            if result_text.startswith("```"):
                result_text = result_text.split("\n", 1)[1]
                result_text = result_text.rsplit("```", 1)[0]

            result = json.loads(result_text)

            # Normalise: null out remote/generic locations
            loc = (result.get("location") or "").strip().lower()
            if not loc or loc in _REMOTE_TERMS:
                result["location"] = None

            # Always null experience — too restrictive to filter on
            result["min_experience"] = None

            # Cap languages at 3
            langs = result.get("languages") or []
            result["languages"] = langs[:3] if isinstance(langs, list) else []

            logger.info(f"Parsed JD: role={result.get('role')}, location={result.get('location')}, languages={result.get('languages')}")
            return result

    except Exception as e:
        logger.error(f"Error parsing job description: {e}")
        return None


def check_groq_status() -> dict:
    """Check if Groq API is configured and return status."""
    return {
        "configured": bool(GROQ_API_KEY),
        "provider": "Groq",
        "model": GROQ_MODEL,
        "free_tier": True,
        "daily_limit": 14400
    }
