"""
Data Import Service
Orchestrates the full automated import pipeline for a candidate.
Called after signup when candidate has provided GitHub username and/or resume.
"""

import logging
from sqlalchemy.orm import Session
from models import Candidate, CandidateProfile
from github_deep_analyzer import analyze_github_profile
from resume_parser import parse_resume
from portfolio_fetcher import fetch_portfolio

logger = logging.getLogger(__name__)

async def run_candidate_import(db: Session, candidate_id: int) -> dict:
    """
    Run the full data import pipeline for a candidate.
    Updates candidate_profiles with GitHub analysis + resume data + portfolio data.
    Updates candidate.onboarding_status to "github_imported" on success.
    
    Returns: {"success": bool, "github": bool, "resume": bool, "portfolio": bool, "errors": []}
    """
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return {"success": False, "errors": ["Candidate not found"]}

    profile = db.query(CandidateProfile).filter(CandidateProfile.candidate_id == candidate_id).first()
    if not profile:
        profile = CandidateProfile(candidate_id=candidate_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    result = {"success": True, "github": False, "resume": False, "portfolio": False, "errors": []}

    # 1. GitHub Deep Analysis
    if candidate.github_username:
        try:
            github_data = await analyze_github_profile(candidate.github_username)
            if "error" not in github_data:
                profile.github_analysis = github_data
                
                # Update candidate avatar if not set
                if not candidate.avatar_url and github_data.get("avatar_url"):
                    candidate.avatar_url = github_data["avatar_url"]
                    
                # Update candidate location if not set
                if not candidate.location and github_data.get("location"):
                    candidate.location = github_data["location"]
                    
                # Set initial role/seniority from GitHub analysis
                profile.detected_role = github_data.get("detected_role")
                profile.detected_roles = github_data.get("detected_roles", [])
                profile.seniority_level = github_data.get("seniority_level")
                profile.ai_summary = github_data.get("ai_summary")
                profile.skills = github_data.get("top_skills", [])
                profile.engineering_maturity_score = github_data.get("engineering_maturity_score", 0)
                
                result["github"] = True
            else:
                result["errors"].append(f"GitHub: {github_data['error']}")
        except Exception as e:
            logger.error(f"GitHub analysis failed for candidate {candidate_id}: {e}", exc_info=True)
            result["errors"].append(f"GitHub analysis failed: {str(e)}")

    # 2. Resume Parsing (if resume_path is set — meaning they uploaded a resume)
    # The frontend calls /api/candidate/upload-resume first to set candidate.resume_path
    if candidate.resume_path:
        try:
            # Read the stored resume text from candidate_profiles.resume_data
            # (The resume upload endpoint should have already extracted the raw text)
            raw_text = (profile.resume_data or {}).get("raw_text", "")
            if raw_text:
                parsed = await parse_resume(raw_text)
                
                # Update candidate name from resume if not provided at signup (though it's required at signup)
                if parsed.get("name") and candidate.name == candidate.email.split('@')[0]:
                    candidate.name = parsed["name"]
                    
                # Store parsed data, preserving raw_text
                existing_data = profile.resume_data or {}
                profile.resume_data = {**existing_data, **parsed}
                
                # Merge resume skills with GitHub skills
                resume_skills = parsed.get("skills", [])
                existing_skills = profile.skills or []
                # Deduplicate and preserve order
                merged_skills = list(dict.fromkeys(existing_skills + resume_skills))
                profile.skills = merged_skills
                
                result["resume"] = True
            else:
                result["errors"].append("Resume: no text content found")
        except Exception as e:
            logger.error(f"Resume parsing failed for candidate {candidate_id}: {e}", exc_info=True)
            result["errors"].append(f"Resume parsing failed: {str(e)}")

    # 3. Portfolio Fetch (if portfolio_url is set)
    if candidate.portfolio_url:
        try:
            portfolio_data = await fetch_portfolio(candidate.portfolio_url)
            profile.portfolio_data = portfolio_data
            result["portfolio"] = True
        except Exception as e:
            logger.error(f"Portfolio fetch failed for candidate {candidate_id}: {e}", exc_info=True)
            result["errors"].append(f"Portfolio fetch failed: {str(e)}")

    # 4. Calculate initial profile_quality_score
    score = 0
    if result["github"]:
        score += 40
    if result["resume"]:
        score += 30
    if result["portfolio"]:
        score += 10
    if candidate.linkedin_url:
        score += 10
    if candidate.phone:
        score += 5
    if candidate.location:
        score += 5
    profile.profile_quality_score = min(score, 100)

    # 5. Update onboarding status
    if result["github"] or result["resume"]:
        candidate.onboarding_status = "github_imported"

    db.commit()
    return result
