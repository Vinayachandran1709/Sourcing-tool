from typing import Dict, List
from sqlalchemy.orm import Session
from models import Profile
import logging

logger = logging.getLogger(__name__)


class FilterService:
    """
    ✅ SMART ROLE-BASED FILTERING
    
    Features:
    1. Technology-based role matching (Python → shows all Python roles)
    2. Flexible role matching (ANY: language OR framework OR tool)
    3. Location ranking (city → country → rest)
    """
    
    @staticmethod
    def apply_filters(db: Session, filters: Dict) -> List[Profile]:
        """
        Apply smart filters with role-based matching.
        """
        logger.info(f"🔍 FilterService with filters: {filters}")
        
        # ===== STEP 1: LOAD PROFILES FROM DATABASE =====
        query = db.query(Profile)
        
        # Apply location filter at SQL level (optimization)
        location = filters.get("location")
        if location:
            query = query.filter(Profile.location.ilike(f"%{location}%"))
        
        all_profiles = query.all()
        logger.info(f"📊 Loaded {len(all_profiles)} profiles from database")
        
        # ===== STEP 2: TECHNOLOGY-BASED FILTERING (Languages/Frameworks/Tools) =====
        languages = filters.get("languages", [])
        frameworks = filters.get("frameworks", [])
        tools = filters.get("tools", [])
        
        if languages or frameworks or tools:
            logger.info(f"🎯 Tech filter: {len(languages)} langs, {len(frameworks)} frameworks, {len(tools)} tools")
            
            from role_detection_service import RoleDetectionService
            
            tech_filtered = []
            for profile in all_profiles:
                # ✅ FLEXIBLE: Match if profile has ANY selected technology
                if RoleDetectionService.profile_matches_any_tech(
                    profile,
                    languages=languages,
                    frameworks=frameworks,
                    tools=tools
                ):
                    tech_filtered.append(profile)
            
            all_profiles = tech_filtered
            logger.info(f"✅ After tech filter: {len(all_profiles)} profiles")
        
        # ===== STEP 3: ROLE FILTER (with confidence threshold) =====
        role = filters.get("role")
        if role and all_profiles:
            logger.info(f"🎯 Role filter: {role}")
            
            from role_detection_service import RoleDetectionService
            
            role_filtered = []
            for profile in all_profiles:
                if RoleDetectionService.matches_role_filter(profile, role, min_confidence=0.40):
                    role_filtered.append(profile)
            
            all_profiles = role_filtered
            logger.info(f"✅ After role filter: {len(all_profiles)} profiles")
        
        # ===== STEP 4: LOCATION RANKING (not filtering) =====
        if location and all_profiles:
            logger.info(f"📍 Location ranking: {location}")
            
            city_matches = []
            country_matches = []
            other_profiles = []
            
            location_lower = location.lower()
            
            # City to country mapping
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
                
                # City match
                if location_lower in profile_location_lower or profile_location_lower in location_lower:
                    city_matches.append(profile)
                # Country match
                elif country and country in profile_location_lower:
                    country_matches.append(profile)
                else:
                    other_profiles.append(profile)
            
            # Combine: City → Country → Rest
            all_profiles = city_matches + country_matches + other_profiles
            logger.info(f"✅ Location ranking: {len(city_matches)} city, {len(country_matches)} country, {len(other_profiles)} other")
        
        # ===== STEP 5: CONTRIBUTION/REPO RANGE FILTERS =====
        contribution_ranges = filters.get("contributionRanges", [])
        if contribution_ranges and all_profiles:
            range_filtered = []
            for profile in all_profiles:
                for contrib_range in contribution_ranges:
                    if contrib_range["min"] <= profile.contributions_last_year <= contrib_range["max"]:
                        range_filtered.append(profile)
                        break
            all_profiles = range_filtered
            logger.info(f"✅ After contribution filter: {len(all_profiles)} profiles")
        
        repo_ranges = filters.get("repoRanges", [])
        if repo_ranges and all_profiles:
            range_filtered = []
            for profile in all_profiles:
                for repo_range in repo_ranges:
                    if repo_range["min"] <= profile.public_repos <= repo_range["max"]:
                        range_filtered.append(profile)
                        break
            all_profiles = range_filtered
            logger.info(f"✅ After repo filter: {len(all_profiles)} profiles")
        
        # ===== STEP 6: SCORE AND RANK =====
        scored_profiles = []
        
        for profile in all_profiles:
            match_score = 100
            match_signals = []
            
            # Technology boost
            if languages or frameworks or tools:
                tech_matches = 0
                
                # Language matches
                if languages and profile.languages_data:
                    profile_langs = list(profile.languages_data.keys()) if isinstance(profile.languages_data, dict) else []
                    tech_matches += sum(1 for lang in languages if any(lang.lower() in pl.lower() for pl in profile_langs))
                
                # Framework/tool matches (check bio and repos)
                if frameworks or tools:
                    bio = (profile.bio or "").lower()
                    repo_text = " ".join([str(r.get("name", "")).lower() for r in (profile.top_repos or [])])
                    
                    tech_matches += sum(1 for fw in frameworks if fw.lower() in bio or fw.lower() in repo_text)
                    tech_matches += sum(1 for tool in tools if tool.lower() in bio or tool.lower() in repo_text)
                
                if tech_matches > 0:
                    match_score += min(tech_matches * 15, 60)
                    match_signals.append(f"✅ {tech_matches} tech matches")
            
            # Location boost
            if location and profile.location:
                if location.lower() in profile.location.lower():
                    match_score += 40
                    match_signals.append(f"✅ Location: {profile.location}")
            
            # Role boost
            if role and profile.detected_roles:
                for role_data in profile.detected_roles:
                    if role_data.get("role") == role:
                        confidence = role_data.get("confidence", 0)
                        if confidence >= 0.70:
                            match_score += 30
                            match_signals.append(f"✅ {role} (High confidence)")
                        elif confidence >= 0.40:
                            match_score += 15
                            match_signals.append(f"✓ {role} (Medium confidence)")
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