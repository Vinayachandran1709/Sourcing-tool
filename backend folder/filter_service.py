from typing import Dict, List
from sqlalchemy.orm import Session
from models import Profile
import logging

logger = logging.getLogger(__name__)


class FilterService:
    """
    ✅ STRICT LANGUAGE MATCHING + LOCATION RANKING
    """
    
    @staticmethod
    def apply_filters(db: Session, filters: Dict) -> List[Profile]:
        """
        Apply filters with:
        1. STRICT language matching (must have language)
        2. LOCATION RANKING (city → country → rest)
        """
        logger.info(f"🔍 FilterService with filters: {filters}")
        
        query = db.query(Profile)
        all_profiles = query.all()
        
        logger.info(f"📊 Total profiles in DB: {len(all_profiles)}")
        
        # ===== STEP 1: STRICT LANGUAGE FILTER =====
        languages = filters.get("languages", [])
        if languages:
            logger.info(f"🎯 STRICT language filter: {languages}")
            language_filtered = []
            
            for profile in all_profiles:
                # ✅ STRICT: Must have language in languages_data
                if not profile.languages_data:
                    continue
                
                profile_langs = list(profile.languages_data.keys()) if isinstance(profile.languages_data, dict) else []
                
                # Check if ANY selected language exists
                language_match = False
                for lang in languages:
                    if any(lang.lower() in pl.lower() or pl.lower() in lang.lower() for pl in profile_langs):
                        language_match = True
                        break
                
                if language_match:
                    language_filtered.append(profile)
            
            all_profiles = language_filtered
            logger.info(f"✅ After STRICT language filter: {len(all_profiles)} profiles")
        
        # ===== STEP 2: LOCATION RANKING (not filtering) =====
        location = filters.get("location")
        
        if location:
            logger.info(f"📍 Location ranking: {location}")
            
            # Categorize profiles
            city_matches = []
            country_matches = []
            other_profiles = []
            
            location_lower = location.lower()
            
            # Determine country from city
            CITY_TO_COUNTRY = {
                "san francisco": "united states",
                "new york": "united states",
                "seattle": "united states",
                "austin": "united states",
                "bangalore": "india",
                "mumbai": "india",
                "delhi": "india",
                "hyderabad": "india",
                "london": "united kingdom",
                "manchester": "united kingdom",
                "berlin": "germany",
                "munich": "germany",
                "tokyo": "japan",
                "singapore": "singapore",
            }
            
            country = CITY_TO_COUNTRY.get(location_lower)
            
            for profile in all_profiles:
                if not profile.location:
                    other_profiles.append(profile)
                    continue
                
                profile_location_lower = profile.location.lower()
                
                # Check for city match
                if location_lower in profile_location_lower or profile_location_lower in location_lower:
                    city_matches.append(profile)
                # Check for country match
                elif country and country in profile_location_lower:
                    country_matches.append(profile)
                else:
                    other_profiles.append(profile)
            
            # Combine: City → Country → Rest
            all_profiles = city_matches + country_matches + other_profiles
            
            logger.info(f"✅ Location ranking: {len(city_matches)} city, {len(country_matches)} country, {len(other_profiles)} other")
        
        # ===== STEP 3: SCORE AND RANK =====
        scored_profiles = []
        
        for profile in all_profiles:
            match_score = 100
            match_signals = []
            
            # Language boost
            if languages and hasattr(profile, 'languages_data') and profile.languages_data:
                profile_langs = list(profile.languages_data.keys())
                lang_matches = sum(1 for lang in languages if any(lang.lower() in pl.lower() for pl in profile_langs))
                
                if lang_matches == len(languages):
                    match_score += 50
                    match_signals.append(f"✅ ALL {len(languages)} languages match")
                elif lang_matches > 0:
                    match_score += lang_matches * 15
                    match_signals.append(f"✓ {lang_matches}/{len(languages)} languages match")
            
            # Location boost
            if location and profile.location:
                if location.lower() in profile.location.lower():
                    match_score += 40
                    match_signals.append(f"✅ Location: {profile.location}")
            
            # Role filter (soft)
            role = filters.get("role")
            if role and profile.detected_roles:
                for role_data in profile.detected_roles:
                    if role_data.get("role") == role:
                        confidence = role_data.get("confidence", 0)
                        if confidence >= 0.70:
                            match_score += 30
                            match_signals.append(f"✅ {role}")
                        break
            
            # Contribution/Repo ranges (soft)
            contribution_ranges = filters.get("contributionRanges", [])
            if contribution_ranges:
                for contrib_range in contribution_ranges:
                    if contrib_range["min"] <= profile.contributions_last_year <= contrib_range["max"]:
                        match_score += 15
                        break
            
            repo_ranges = filters.get("repoRanges", [])
            if repo_ranges:
                for repo_range in repo_ranges:
                    if repo_range["min"] <= profile.public_repos <= repo_range["max"]:
                        match_score += 10
                        break
            
            # Final score
            final_score = profile.developer_score + match_score
            final_score = max(0, min(200, final_score))
            
            profile.match_score = final_score
            profile.match_signals = match_signals
            profile.adjusted_score = final_score
            
            scored_profiles.append(profile)
        
        # Sort by match score
        scored_profiles.sort(key=lambda p: p.match_score, reverse=True)
        
        logger.info(f"✅ Final result: {len(scored_profiles)} profiles")
        
        return scored_profiles