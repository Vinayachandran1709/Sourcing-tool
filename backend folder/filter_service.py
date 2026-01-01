from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, cast, String
from models import Profile
from datetime import datetime, timedelta, timezone
import logging

# ✅ FIX #7: Add logging configuration
logger = logging.getLogger(__name__)


class FilterService:
    """Handle advanced profile filtering"""
    
    # Role mappings
    ROLE_LANGUAGE_MAP = {
        "Frontend Developer": ["JavaScript", "TypeScript", "HTML", "CSS"],
        "Backend Developer": ["Python", "Java", "Go", "Node.js", "PHP", "Ruby", "C#"],
        "Full-Stack Developer": ["JavaScript", "TypeScript", "Python", "Java", "Go"],
        "Mobile App Developer": ["Swift", "Kotlin", "Dart", "Java", "Objective-C"],
        "Software Engineer": ["Python", "Java", "C++", "Go", "JavaScript"],
        "DevOps Engineer": ["Python", "Go", "Bash", "Ruby"],
        "Site Reliability Engineer (SRE)": ["Python", "Go", "Bash"],
        "Cloud Engineer": ["Python", "Go", "Bash"],
        "Platform Engineer": ["Go", "Python", "Rust"],
        "Data Engineer": ["Python", "Scala", "Java"],
        "Data Scientist": ["Python", "R", "MATLAB"],
        "Machine Learning Engineer": ["Python", "R"],
        "AI Engineer": ["Python", "C++"],
        "MLOps Engineer": ["Python", "Go"],
        "QA / Test Engineer": ["Python", "Java", "JavaScript"],
        "Security Engineer": ["Python", "Go", "C", "C++"],
        "Embedded Systems Engineer": ["C", "C++", "Rust"],
        "Game Developer": ["C++", "C#", "Unity", "Unreal"]
    }
    
    ROLE_FRAMEWORK_MAP = {
        "Frontend Developer": ["React", "Vue.js", "Angular", "Next.js", "Svelte"],
        "Backend Developer": ["Django", "Flask", "FastAPI", "Spring", "Express.js", "Laravel"],
        "Full-Stack Developer": ["React", "Next.js", "Django", "Flask", "Express.js"],
        "Mobile App Developer": ["React Native", "Flutter", "SwiftUI", "Android SDK"],
        "Data Engineer": ["Apache Spark", "Apache Airflow", "Apache Hadoop"],
        "Data Scientist": ["Pandas", "NumPy", "Scikit-learn"],
        "Machine Learning Engineer": ["TensorFlow", "PyTorch", "Keras"],
        "AI Engineer": ["TensorFlow", "PyTorch", "Hugging Face Transformers"],
        "MLOps Engineer": ["MLflow", "TensorFlow", "PyTorch"],
        "DevOps Engineer": ["Docker", "Kubernetes", "Terraform", "Ansible"],
        "Cloud Engineer": ["Docker", "Kubernetes", "Terraform"]
    }
    
    @staticmethod
    def apply_filters(db: Session, filters: Dict) -> List[Profile]:
        """
        Apply SOFT filters and return RANKED profiles.
        
        NEW APPROACH:
        - Don't exclude profiles (except extreme cases)
        - Calculate match score for each profile
        - Return all profiles sorted by relevance
        """
        logger.info(f"FilterService.apply_filters called with filters: {filters}")
        
        query = db.query(Profile)
        
        # ===== HARD FILTERS (Must-have, very permissive) =====
        
        # Only exclude profiles with literally zero data
        query = query.filter(
            or_(
                Profile.public_repos > 0,
                Profile.total_stars > 0,
                Profile.contributions_last_year > 0
            )
        )
        
        # Get ALL profiles (we'll rank them)
        all_profiles = query.all()
        
        logger.info(f"Found {len(all_profiles)} total profiles in database")
        
        # ===== SOFT SCORING (Rank by relevance) =====
        
        scored_profiles = []
        
        for profile in all_profiles:
            match_score = 100  # Start with perfect score
            match_signals = []
            
            # 1. ROLE FILTER (Soft - check detected_roles)
            role = filters.get("role")
            if role and profile.detected_roles:
                role_match = False
                role_confidence = 0
                
                for role_data in profile.detected_roles:
                    if role_data.get("role") == role:
                        role_match = True
                        role_confidence = role_data.get("confidence", 0)
                        break
                
                if role_match:
                    # Boost score based on confidence
                    if role_confidence >= 0.80:
                        match_score += 20
                        match_signals.append(f"✅ Strong {role} match ({int(role_confidence*100)}%)")
                    elif role_confidence >= 0.60:
                        match_score += 10
                        match_signals.append(f"✓ Good {role} match ({int(role_confidence*100)}%)")
                    elif role_confidence >= 0.40:
                        match_score += 5
                        match_signals.append(f"~ Possible {role} match ({int(role_confidence*100)}%)")
                else:
                    # Penalty for not matching role (but don't exclude!)
                    match_score -= 30
                    match_signals.append(f"⚠ Role mismatch")
            
            # 2. LANGUAGE FILTER (Soft)
            languages = filters.get("languages", [])
            if languages:
                language_matches = 0
                profile_langs = []
                
                # Check primary language
                if profile.primary_language:
                    profile_langs.append(profile.primary_language.lower())
                
                # Check languages_data
                if profile.languages_data:
                    profile_langs.extend([lang.lower() for lang in profile.languages_data.keys()])
                
                # Count matches
                for lang in languages:
                    if any(lang.lower() in pl for pl in profile_langs):
                        language_matches += 1
                
                if language_matches == len(languages):
                    match_score += 15
                    match_signals.append(f"✅ All languages match ({language_matches}/{len(languages)})")
                elif language_matches > 0:
                    match_score += (language_matches / len(languages)) * 10
                    match_signals.append(f"✓ Partial language match ({language_matches}/{len(languages)})")
                else:
                    match_score -= 20
                    match_signals.append(f"⚠ Language mismatch")
            
            # 3. LOCATION FILTER (Very Soft - just boost if matches)
            location = filters.get("location")
            if location and profile.location:
                if location.lower() in profile.location.lower():
                    match_score += 15
                    match_signals.append(f"✅ Location match: {profile.location}")
                else:
                    match_score -= 5  # Small penalty, not exclusion
                    match_signals.append(f"○ Location: {profile.location}")
            elif location and not profile.location:
                match_score -= 3  # Tiny penalty for missing location
            
            # 4. FRAMEWORKS (Soft - bonus if matches)
            frameworks = filters.get("frameworks", [])
            if frameworks:
                framework_matches = 0
                search_text = f"{profile.bio or ''} {str(profile.languages_data or '')} {str(profile.top_repos or '')}".lower()
                
                for fw in frameworks:
                    if fw.lower() in search_text:
                        framework_matches += 1
                
                if framework_matches > 0:
                    match_score += framework_matches * 5
                    match_signals.append(f"✅ {framework_matches} frameworks match")
            
            # 5. ACTIVITY FILTERS (Soft)
            min_stars = filters.get("min_stars", 0)
            if min_stars > 0:
                if profile.total_stars >= min_stars:
                    match_score += 10
                    match_signals.append(f"✅ Stars: {profile.total_stars}")
                else:
                    match_score -= 10
                    match_signals.append(f"⚠ Stars: {profile.total_stars} (wanted {min_stars}+)")
            
            min_contributions = filters.get("min_contributions", 0)
            if min_contributions > 0:
                if profile.contributions_last_year >= min_contributions:
                    match_score += 10
                    match_signals.append(f"✅ Contributions: {profile.contributions_last_year}")
                else:
                    match_score -= 10
            
            # 6. RECENT ACTIVITY (Soft)
            recent_activity = filters.get("recent_activity")
            if recent_activity and profile.last_active_date:
                days_map = {
                    "Last 30 days": 30,
                    "Last 90 days": 90,
                    "Last 6 months": 180
                }
                
                if recent_activity in days_map:
                    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_map[recent_activity])
                    if profile.last_active_date >= cutoff_date:
                        match_score += 15
                        match_signals.append(f"✅ Recently active")
                    else:
                        match_score -= 15
                        match_signals.append(f"⚠ Inactive for {(datetime.now(timezone.utc) - profile.last_active_date).days} days")
            
            # Calculate final score (base developer_score + match adjustments)
            final_score = profile.developer_score + match_score
            final_score = max(0, min(200, final_score))  # Cap between 0-200
            
            # Store results
            profile.match_score = final_score
            profile.match_signals = match_signals
            profile.adjusted_score = final_score  # For backward compatibility
            
            # ONLY EXCLUDE if match_score is extremely negative (less than -50)
            if match_score > -50:
                scored_profiles.append(profile)
        
        # Sort by match score (highest first)
        scored_profiles.sort(key=lambda p: p.match_score, reverse=True)
        
        logger.info(f"FilterService returning {len(scored_profiles)} profiles (was {len(all_profiles)})")
        logger.info(f"Top profile score: {scored_profiles[0].match_score if scored_profiles else 0}")
        
        return scored_profiles
    
    @staticmethod
    def filter_by_score(profiles: List[Profile], min_score: int = 0, max_score: int = 100) -> List[Profile]:
        """Filter profiles by developer score range (applied AFTER initial search)"""
        return [p for p in profiles if min_score <= p.developer_score <= max_score]