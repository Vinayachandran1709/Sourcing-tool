"""
GitHub Deep Analyzer
Performs comprehensive analysis of a candidate's GitHub profile.
Goes beyond basic stats — analyzes repos, READMEs, tech patterns, contribution behavior.
"""

import os
import json
import logging
import httpx
from typing import Optional, Dict, List
from datetime import datetime, timedelta, timezone
from config import GITHUB_TOKEN
import base64

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
GH_HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def analyze_github_profile(username: str) -> Dict:
    """
    Deep analysis of a GitHub user profile.
    Returns a structured dict to store in candidate_profiles.github_analysis.
    """
    try:
        async with httpx.AsyncClient() as client:
            # 1. Fetch user profile
            user_resp = await client.get(
                f"{GITHUB_API_BASE}/users/{username}", 
                headers=GH_HEADERS, 
                timeout=15.0
            )
            
            if user_resp.status_code == 404:
                return {"error": "GitHub user not found"}
            if user_resp.status_code == 403:
                return {"error": "GitHub rate limit reached, try again later"}
            if user_resp.status_code != 200:
                return {"error": f"GitHub API error: {user_resp.status_code}"}
                
            user_data = user_resp.json()
            
            if user_data.get("type") == "Organization":
                return {"error": "Organization accounts are not supported"}
                
            # Basic info
            name = user_data.get("name") or username
            bio = user_data.get("bio") or ""
            location = user_data.get("location") or ""
            avatar_url = user_data.get("avatar_url") or ""
            email_from_github = user_data.get("email")
            blog = user_data.get("blog") or ""
            company = user_data.get("company") or ""
            followers = user_data.get("followers", 0)
            following = user_data.get("following", 0)
            created_at = user_data.get("created_at")
            public_repos_count = user_data.get("public_repos", 0)
            
            # Calculate years active
            years_active = 1
            if created_at:
                try:
                    account_year = int(created_at[:4])
                    years_active = max(1, datetime.now().year - account_year)
                except Exception:
                    pass

            # 2. Fetch ALL repos
            all_repos = []
            page = 1
            while True:
                repos_resp = await client.get(
                    f"{GITHUB_API_BASE}/users/{username}/repos",
                    headers=GH_HEADERS,
                    params={"per_page": 100, "sort": "updated", "type": "owner", "page": page},
                    timeout=15.0
                )
                if repos_resp.status_code != 200:
                    break
                page_repos = repos_resp.json()
                if not page_repos:
                    break
                all_repos.extend(page_repos)
                if len(page_repos) < 100:
                    break
                page += 1
                
                # Failsafe limit to avoid crazy accounts
                if page > 10:
                    break

            # Filter forks and collect basic stats
            non_fork_repos = []
            total_forks = 0
            total_stars = 0
            
            for r in all_repos:
                if r.get("fork"):
                    total_forks += 1
                else:
                    non_fork_repos.append(r)
                    total_stars += r.get("stargazers_count", 0)
                    
            # 3. Calculate language distribution
            lang_sizes = {}
            for r in non_fork_repos:
                lang = r.get("language")
                size = r.get("size", 0)
                if lang and size:
                    lang_sizes[lang] = lang_sizes.get(lang, 0) + size
                    
            total_size = sum(lang_sizes.values()) or 1
            language_distribution = {
                lang: round((size / total_size) * 100, 1) 
                for lang, size in sorted(lang_sizes.items(), key=lambda x: x[1], reverse=True)
            }
            primary_languages = list(language_distribution.keys())[:5]

            # 4. Identify top projects
            sorted_repos = sorted(
                non_fork_repos, 
                key=lambda x: (x.get("stargazers_count", 0), x.get("size", 0)), 
                reverse=True
            )
            top_repos_raw = sorted_repos[:5]
            
            top_projects = []
            has_tests = False
            has_ci = False
            has_docker = False
            has_license = False
            has_documentation = False
            
            for r in top_repos_raw:
                repo_name = r.get("name")
                # Fetch README
                readme_preview = ""
                try:
                    readme_resp = await client.get(
                        f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/readme",
                        headers=GH_HEADERS,
                        timeout=10.0
                    )
                    if readme_resp.status_code == 200:
                        content_b64 = readme_resp.json().get("content", "")
                        if content_b64:
                            readme_content = base64.b64decode(content_b64).decode("utf-8", errors="ignore")
                            readme_preview = readme_content[:500]
                            if len(readme_content) > 200:
                                has_documentation = True
                except Exception:
                    pass
                    
                # Fetch repo root contents to check for signals
                repo_has_tests = False
                repo_has_ci = False
                try:
                    contents_resp = await client.get(
                        f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/contents/",
                        headers=GH_HEADERS,
                        timeout=10.0
                    )
                    if contents_resp.status_code == 200:
                        items = contents_resp.json()
                        item_names = [i.get("name", "").lower() for i in items if isinstance(i, dict)]
                        
                        if any(n in ("tests", "test", "spec") for n in item_names):
                            repo_has_tests = True
                            has_tests = True
                            
                        if any(n in (".github", ".circleci", ".travis.yml") for n in item_names):
                            repo_has_ci = True
                            has_ci = True
                            
                        if "dockerfile" in item_names or "docker-compose.yml" in item_names:
                            has_docker = True
                            
                        if r.get("license"):
                            has_license = True
                except Exception:
                    pass

                top_projects.append({
                    "name": repo_name,
                    "description": r.get("description"),
                    "stars": r.get("stargazers_count", 0),
                    "language": r.get("language"),
                    "has_tests": repo_has_tests,
                    "has_ci": repo_has_ci,
                    "readme_preview": readme_preview
                })

            # 5. Calculate contribution patterns
            commits_last_90_days = 0
            prs_last_90_days = 0
            issues_last_90_days = 0
            
            try:
                events_resp = await client.get(
                    f"{GITHUB_API_BASE}/users/{username}/events/public",
                    headers=GH_HEADERS,
                    params={"per_page": 100},
                    timeout=15.0
                )
                if events_resp.status_code == 200:
                    events = events_resp.json()
                    ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
                    
                    for event in events:
                        event_date_str = event.get("created_at")
                        if not event_date_str:
                            continue
                            
                        try:
                            # Github returns ISO 8601 with Z
                            event_date = datetime.strptime(event_date_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                            if event_date < ninety_days_ago:
                                continue
                                
                            event_type = event.get("type")
                            if event_type == "PushEvent":
                                commits_last_90_days += len(event.get("payload", {}).get("commits", []))
                            elif event_type == "PullRequestEvent" and event.get("payload", {}).get("action") == "opened":
                                prs_last_90_days += 1
                            elif event_type == "IssuesEvent" and event.get("payload", {}).get("action") == "opened":
                                issues_last_90_days += 1
                        except Exception:
                            pass
            except Exception as e:
                logger.warning(f"Failed to fetch events for {username}: {e}")

            # 6. Engineering maturity signals
            consistent_contributor = commits_last_90_days > 10
            multi_language = len(primary_languages) >= 3
            
            engineering_signals = {
                "has_tests": has_tests,
                "has_ci": has_ci,
                "has_documentation": has_documentation,
                "has_docker": has_docker,
                "has_license": has_license,
                "consistent_contributor": consistent_contributor,
                "multi_language": multi_language,
            }

            # 7. AI Analysis via Groq
            ai_data = {
                "ai_summary": None,
                "detected_role": "Software Developer",
                "detected_roles": [],
                "seniority_level": "Mid-Level",
                "top_skills": primary_languages[:5],
                "expertise_areas": [],
                "engineering_maturity": "developing",
                "engineering_maturity_score": 0
            }
            
            if GROQ_API_KEY:
                try:
                    lang_str = json.dumps(language_distribution)
                    projects_str = json.dumps([
                        {"name": p["name"], "desc": p["description"]} 
                        for p in top_projects
                    ])
                    
                    prompt = f"""Analyze this GitHub developer profile and return ONLY valid JSON (no markdown, no backticks):

Username: {username}
Name: {name}
Bio: {bio}
Location: {location}
Languages: {lang_str}
Total Repos: {len(non_fork_repos)}
Total Stars: {total_stars}
Followers: {followers}
Years Active: {years_active}
Top Projects: {projects_str}
Engineering Signals: has_tests={has_tests}, has_ci={has_ci}, has_docker={has_docker}, consistent_contributor={consistent_contributor}

Return JSON with these fields:
{{
  "summary": "3-4 sentence professional summary for a recruiter. Mention strongest skills, experience level, and notable patterns.",
  "primary_role": "one of: Frontend Developer, Backend Developer, Full-Stack Developer, Mobile Developer, DevOps Engineer, Data Scientist, AI/ML Engineer, Data Engineer, Security Engineer, Embedded Engineer, Software Developer",
  "secondary_roles": ["list of other applicable roles"],
  "seniority": "one of: Junior, Mid-Level, Senior, Staff, Expert",
  "top_skills": ["list of 5-8 specific technologies/frameworks they clearly use"],
  "expertise_areas": ["list of 2-4 broader areas like 'distributed systems', 'frontend architecture', 'data pipelines', 'mobile development'"],
  "engineering_maturity": "one of: early-career, developing, professional, advanced, exceptional",
  "engineering_maturity_score": integer 0-100
}}"""

                    response = await client.post(
                        GROQ_API_URL,
                        headers={
                            "Authorization": f"Bearer {GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": GROQ_MODEL,
                            "messages": [{"role": "user", "content": prompt}],
                            "max_tokens": 500,
                            "temperature": 0.3
                        },
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        result_text = data["choices"][0]["message"]["content"].strip()
                        
                        # Clean markdown
                        if result_text.startswith("```"):
                            result_text = result_text.split("\n", 1)[1]
                            if result_text.endswith("```"):
                                result_text = result_text.rsplit("```", 1)[0]
                                
                        ai_parsed = json.loads(result_text)
                        
                        ai_data["ai_summary"] = ai_parsed.get("summary")
                        ai_data["detected_role"] = ai_parsed.get("primary_role", "Software Developer")
                        ai_data["detected_roles"] = ai_parsed.get("secondary_roles", [])
                        ai_data["seniority_level"] = ai_parsed.get("seniority", "Mid-Level")
                        ai_data["top_skills"] = ai_parsed.get("top_skills", primary_languages[:5])
                        ai_data["expertise_areas"] = ai_parsed.get("expertise_areas", [])
                        ai_data["engineering_maturity"] = ai_parsed.get("engineering_maturity", "developing")
                        ai_data["engineering_maturity_score"] = ai_parsed.get("engineering_maturity_score", 0)
                        
                except Exception as ai_err:
                    logger.error(f"Groq analysis failed for {username}: {ai_err}")

            # 8. Return structured result
            return {
                "username": username,
                "name": name,
                "bio": bio,
                "location": location,
                "avatar_url": avatar_url,
                "email": email_from_github,
                "blog": blog,
                "company": company,
                "followers": followers,
                "following": following,
                "public_repos_count": public_repos_count,
                "total_stars": total_stars,
                "total_forks": total_forks,
                "account_created_at": created_at,
                "years_active": years_active,
                
                "language_distribution": language_distribution,
                "primary_languages": primary_languages,
                "top_projects": top_projects,
                "contribution_stats": {
                    "commits_last_90_days": commits_last_90_days,
                    "prs_last_90_days": prs_last_90_days,
                    "issues_last_90_days": issues_last_90_days,
                },
                "engineering_signals": engineering_signals,
                
                "ai_summary": ai_data["ai_summary"],
                "detected_role": ai_data["detected_role"],
                "detected_roles": ai_data["detected_roles"],
                "seniority_level": ai_data["seniority_level"],
                "top_skills": ai_data["top_skills"],
                "expertise_areas": ai_data["expertise_areas"],
                "engineering_maturity": ai_data["engineering_maturity"],
                "engineering_maturity_score": ai_data["engineering_maturity_score"],
            }
            
    except Exception as e:
        logger.error(f"GitHub deep analysis failed for {username}: {e}", exc_info=True)
        return {"error": f"Internal analysis error: {str(e)}"}
