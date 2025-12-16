from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, cast, String
from models import Profile
from datetime import datetime, timedelta, timezone

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
        """Apply all filters and return matching profiles"""
        query = db.query(Profile)
        
        # HARD FILTERS (must match)
        
        # 1. Role-based filtering
        role = filters.get("role")
        if role and role in FilterService.ROLE_LANGUAGE_MAP:
            expected_languages = FilterService.ROLE_LANGUAGE_MAP[role]
            # Match if primary_language matches OR any language in languages_data
            lang_conditions = []
            
            # Check primary_language
            for lang in expected_languages:
                lang_conditions.append(Profile.primary_language.ilike(f"%{lang}%"))
            
            # Check languages_data JSON field (convert to text for searching)
            for lang in expected_languages:
                # Use CAST to text and search within JSON
                lang_conditions.append(
                    cast(Profile.languages_data, String).ilike(f"%{lang}%")
                )
            
            query = query.filter(or_(*lang_conditions))
        
        # 2. Programming Language (if provided)
        languages = filters.get("languages", [])
        if languages:
            lang_conditions = []
            for lang in languages:
                # Check primary language
                lang_conditions.append(Profile.primary_language.ilike(f"%{lang}%"))
                # Check in languages_data JSON
                lang_conditions.append(
                    cast(Profile.languages_data, String).ilike(f"%{lang}%")
                )
            query = query.filter(or_(*lang_conditions))
        
        # 3. Location (if provided)
        location = filters.get("location")
        if location:
            query = query.filter(Profile.location.ilike(f"%{location}%"))
        
        # SOFT FILTERS (scoring boosts)
        
        # 4. Frameworks (soft match - adds to score)
        frameworks = filters.get("frameworks", [])
        
        # 5. Tools (very soft match)
        tools = filters.get("tools", [])
        
        # 6. Activity filters
        min_stars = filters.get("min_stars", 0)
        if min_stars > 0:
            query = query.filter(Profile.total_stars >= min_stars)
        
        min_contributions = filters.get("min_contributions", 0)
        if min_contributions > 0:
            query = query.filter(Profile.contributions_last_year >= min_contributions)
        
        recent_activity = filters.get("recent_activity")
        if recent_activity:
            days_map = {
                "Last 30 days": 30,
                "Last 90 days": 90,
                "Last 6 months": 180
            }
            if recent_activity in days_map:
                cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_map[recent_activity])
                query = query.filter(Profile.last_active_date >= cutoff_date)
        
        # Get results
        profiles = query.all()
        
        # Apply soft scoring for frameworks and tools
        scored_profiles = []
        for profile in profiles:
            score_boost = 0
            
            # Check frameworks match (look in languages_data and bio)
            if frameworks:
                # Check in languages_data JSON
                if profile.languages_data:
                    lang_str = str(profile.languages_data).lower()
                    matched_frameworks = sum(1 for fw in frameworks if fw.lower() in lang_str)
                    score_boost += matched_frameworks * 5
                
                # Also check in bio
                if profile.bio:
                    bio_lower = profile.bio.lower()
                    matched_frameworks_bio = sum(1 for fw in frameworks if fw.lower() in bio_lower)
                    score_boost += matched_frameworks_bio * 3
            
            # Check tools match (look in bio and top_repos)
            if tools:
                if profile.bio:
                    bio_lower = profile.bio.lower()
                    matched_tools = sum(1 for tool in tools if tool.lower() in bio_lower)
                    score_boost += matched_tools * 3
                
                if profile.top_repos:
                    repos_str = str(profile.top_repos).lower()
                    matched_tools_repos = sum(1 for tool in tools if tool.lower() in repos_str)
                    score_boost += matched_tools_repos * 2
            
            # Store adjusted score
            profile.adjusted_score = min(100, profile.developer_score + score_boost)
            scored_profiles.append(profile)
        
        # Sort by adjusted score
        scored_profiles.sort(key=lambda p: p.adjusted_score, reverse=True)
        
        return scored_profiles
    
    @staticmethod
    def filter_by_score(profiles: List[Profile], min_score: int = 0, max_score: int = 100) -> List[Profile]:
        """Filter profiles by developer score range (applied AFTER initial search)"""
        return [p for p in profiles if min_score <= p.developer_score <= max_score]