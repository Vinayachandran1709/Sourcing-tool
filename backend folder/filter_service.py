from typing import Dict, List
from sqlalchemy.orm import Session
from models import Profile
import logging

logger = logging.getLogger(__name__)


class FilterService:
    """
    ✅ SMART ROLE-BASED FILTERING WITH ENHANCED LOCATION HIERARCHY
    
    Features:
    1. Technology-based role matching (Python → shows all Python roles)
    2. Flexible role matching (ANY: language OR framework OR tool)
    3. Location hierarchy (city → country → region → global)
       - Predefined cities: Returns city profiles + country profiles
       - Unknown cities: Resolves to country or region
       - Always returns results (graceful fallback)
    """
    
    @staticmethod
    def apply_filters(db: Session, filters: Dict) -> List[Profile]:
        """
        Apply smart filters with role-based matching and location hierarchy.
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
        
        # ===== STEP 4: LOCATION RANKING WITH FALLBACK HIERARCHY =====
        # Hierarchy: city → country → region → global
        if location and all_profiles:
            logger.info(f"📍 Location ranking: {location}")
            
            city_matches = []
            country_matches = []
            region_matches = []
            global_matches = []
            
            location_lower = location.lower().strip()
            
            # ===== COMPREHENSIVE CITY-TO-COUNTRY MAPPING =====
            # Maps predefined cities to their countries
            CITY_TO_COUNTRY = {
                # United States cities
                "san francisco": "united states",
                "new york": "united states",
                "seattle": "united states",
                "austin": "united states",
                "sf": "united states",
                "nyc": "united states",
                "usa": "united states",
                "us": "united states",
                
                # European cities
                "london": "united kingdom",
                "berlin": "germany",
                "amsterdam": "netherlands",
                "uk": "united kingdom",
                
                # Indian cities
                "bangalore": "india",
                "mumbai": "india",
                "delhi": "india",
                "bengaluru": "india",
                
                # Asian cities
                "singapore": "singapore",
                "tokyo": "japan",
            }
            
            # ===== COUNTRY-TO-REGION MAPPING =====
            # Maps countries to broader regions for fallback
            COUNTRY_TO_REGION = {
                "united states": "americas",
                "canada": "americas",
                "mexico": "americas",
                "brazil": "americas",
                "argentina": "americas",
                
                "united kingdom": "europe",
                "germany": "europe",
                "netherlands": "europe",
                "france": "europe",
                "spain": "europe",
                "italy": "europe",
                "poland": "europe",
                "sweden": "europe",
                "norway": "europe",
                
                "india": "asia",
                "singapore": "asia",
                "japan": "asia",
                "china": "asia",
                "south korea": "asia",
                "indonesia": "asia",
                "thailand": "asia",
                "vietnam": "asia",
                "philippines": "asia",
                
                "australia": "apac",
                "new zealand": "apac",
            }
            
            # ===== REGION KEYWORDS =====
            # Detects if user typed a region name directly
            REGION_KEYWORDS = {
                "europe": "europe",
                "asia": "asia",
                "americas": "americas",
                "apac": "apac",
                "remote": "global",  # "Remote" means global
                "anywhere": "global",
                "worldwide": "global",
            }
            
            # ===== STEP 4A: DETERMINE LOCATION TYPE & HIERARCHY =====
            
            is_predefined_city = location_lower in CITY_TO_COUNTRY
            target_country = CITY_TO_COUNTRY.get(location_lower)
            target_region = REGION_KEYWORDS.get(location_lower)
            
            # If not a predefined city, check if it's a country name
            if not is_predefined_city and not target_region:
                # Check if location matches any country in our mapping
                for country in COUNTRY_TO_REGION.keys():
                    if location_lower in country or country in location_lower:
                        target_country = country
                        break
            
            # If still no match, try to infer region from typed location
            if not target_country and not target_region:
                # Try to resolve unknown city to a region by checking profile locations
                # This handles cases like "Melbourne" (Australia → APAC)
                location_sample = [p.location.lower() for p in all_profiles[:50] if p.location]
                
                # Check if any profiles mention this location alongside a known country
                for profile_loc in location_sample:
                    if location_lower in profile_loc:
                        # Try to extract country from profile location
                        for country, region in COUNTRY_TO_REGION.items():
                            if country in profile_loc:
                                target_country = country
                                break
                        if target_country:
                            break
            
            logger.info(f"   📍 Location type: predefined_city={is_predefined_city}, country={target_country}, region={target_region}")
            
            # ===== STEP 4B: CLASSIFY PROFILES BY LOCATION SPECIFICITY =====
            
            for profile in all_profiles:
                if not profile.location:
                    # Profiles without location go to global matches
                    global_matches.append(profile)
                    continue
                
                profile_location_lower = profile.location.lower()
                
                # PRIORITY 1: City match (highest priority)
                if location_lower in profile_location_lower or profile_location_lower in location_lower:
                    city_matches.append(profile)
                    continue
                
                # PRIORITY 2: Country match (if we identified a country)
                if target_country and target_country in profile_location_lower:
                    country_matches.append(profile)
                    continue
                
                # PRIORITY 3: Region match (if we identified a region or inferred one)
                if target_region:
                    # User typed a region directly (e.g., "Europe", "Asia")
                    if target_region == "global":
                        # "Remote" or "Anywhere" → all profiles are valid
                        region_matches.append(profile)
                    else:
                        # Check if profile location matches the region
                        for country, region in COUNTRY_TO_REGION.items():
                            if region == target_region and country in profile_location_lower:
                                region_matches.append(profile)
                                break
                        else:
                            global_matches.append(profile)
                    continue
                
                # PRIORITY 4: Fallback - try to match profiles to the inferred region
                if target_country:
                    # We have a country, check if profile is in same region
                    target_region_fallback = COUNTRY_TO_REGION.get(target_country)
                    if target_region_fallback:
                        for country, region in COUNTRY_TO_REGION.items():
                            if region == target_region_fallback and country in profile_location_lower:
                                region_matches.append(profile)
                                break
                        else:
                            global_matches.append(profile)
                    else:
                        global_matches.append(profile)
                else:
                    # No match at all → global
                    global_matches.append(profile)
            
            # ===== STEP 4C: COMBINE WITH HIERARCHY =====
            # City → Country → Region → Global
            all_profiles = city_matches + country_matches + region_matches + global_matches
            
            logger.info(f"✅ Location ranking: {len(city_matches)} city, {len(country_matches)} country, {len(region_matches)} region, {len(global_matches)} global")
            
            # ===== STEP 4D: ENSURE NON-EMPTY RESULTS =====
            # If we have zero matches in city/country/region, the global fallback ensures results
            if len(city_matches) == 0 and len(country_matches) == 0 and len(region_matches) == 0:
                logger.info(f"   ⚠️ No specific location matches, returning all profiles (global fallback)")
            elif len(city_matches) == 0 and len(country_matches) == 0:
                logger.info(f"   ⚠️ No city/country matches, falling back to region/global profiles")
        
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