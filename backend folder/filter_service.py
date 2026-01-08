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

        # Note: We intentionally do NOT filter by location at SQL level here
        # to ensure we can implement proper hierarchical filtering in Python.
        # For example, if user types "San Francisco", we need to return both:
        # - Profiles from San Francisco (city)
        # - Profiles from United States (country)
        # SQL-level filtering would prevent us from getting country-level matches.

        all_profiles = query.all()
        logger.info(f"📊 Loaded {len(all_profiles)} profiles from database")

        location = filters.get("location")
        
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
        
        # ===== STEP 4: HIERARCHICAL LOCATION FILTERING =====
        # MVP logic with clear hierarchy: city → country → region → global
        if location and all_profiles:
            logger.info(f"📍 Location filter: {location}")

            location_lower = location.lower().strip()

            # ===== LOCATION MAPPINGS =====

            # Predefined cities from frontend (these get city + country results)
            PREDEFINED_CITIES = {
                "san francisco", "new york", "seattle", "austin",
                "london", "berlin", "amsterdam",
                "bangalore", "mumbai", "delhi",
                "singapore", "tokyo"
            }

            # Comprehensive city-to-country mapping
            CITY_TO_COUNTRY = {
                # Americas - USA
                "san francisco": "united states",
                "new york": "united states",
                "seattle": "united states",
                "austin": "united states",
                "boston": "united states",
                "chicago": "united states",
                "los angeles": "united states",
                "portland": "united states",
                "denver": "united states",
                "atlanta": "united states",

                # Europe - UK
                "london": "united kingdom",
                "manchester": "united kingdom",
                "edinburgh": "united kingdom",
                "cambridge": "united kingdom",

                # Europe - Germany
                "berlin": "germany",
                "munich": "germany",
                "hamburg": "germany",
                "frankfurt": "germany",

                # Europe - Netherlands
                "amsterdam": "netherlands",
                "rotterdam": "netherlands",

                # Europe - Other
                "paris": "france",
                "madrid": "spain",
                "barcelona": "spain",
                "stockholm": "sweden",
                "copenhagen": "denmark",
                "oslo": "norway",
                "helsinki": "finland",
                "dublin": "ireland",
                "zurich": "switzerland",

                # Asia - India
                "bangalore": "india",
                "mumbai": "india",
                "delhi": "india",
                "hyderabad": "india",
                "pune": "india",
                "chennai": "india",
                "kolkata": "india",

                # Asia - Other
                "singapore": "singapore",
                "tokyo": "japan",
                "osaka": "japan",
                "kyoto": "japan",
                "hong kong": "china",
                "shanghai": "china",
                "beijing": "china",
                "shenzhen": "china",
                "seoul": "south korea",
                "taipei": "taiwan",
                "bangkok": "thailand",

                # Oceania
                "sydney": "australia",
                "melbourne": "australia",
                "brisbane": "australia",
                "auckland": "new zealand",

                # Canada
                "toronto": "canada",
                "vancouver": "canada",
                "montreal": "canada",
            }

            # Country-to-region mapping
            COUNTRY_TO_REGION = {
                # Americas
                "united states": "americas",
                "canada": "americas",
                "mexico": "americas",
                "brazil": "americas",
                "argentina": "americas",

                # Europe
                "united kingdom": "europe",
                "germany": "europe",
                "france": "europe",
                "netherlands": "europe",
                "spain": "europe",
                "italy": "europe",
                "sweden": "europe",
                "norway": "europe",
                "denmark": "europe",
                "finland": "europe",
                "ireland": "europe",
                "switzerland": "europe",
                "poland": "europe",
                "belgium": "europe",
                "austria": "europe",

                # Asia
                "india": "asia",
                "china": "asia",
                "japan": "asia",
                "singapore": "asia",
                "south korea": "asia",
                "taiwan": "asia",
                "thailand": "asia",
                "vietnam": "asia",
                "indonesia": "asia",
                "malaysia": "asia",
                "philippines": "asia",

                # Oceania (treated as part of Asia-Pacific in this context)
                "australia": "asia",
                "new zealand": "asia",
            }

            # ===== DETERMINE FILTER STRATEGY =====

            is_predefined_city = location_lower in PREDEFINED_CITIES
            is_city = location_lower in CITY_TO_COUNTRY
            is_remote = location_lower == "remote"

            # Get country and region for the location
            country = CITY_TO_COUNTRY.get(location_lower)
            region = None
            if country:
                region = COUNTRY_TO_REGION.get(country)

            # Initialize result buckets
            city_matches = []
            country_matches = []
            region_matches = []
            global_matches = []

            logger.info(f"🔍 Filter strategy - Predefined: {is_predefined_city}, IsCity: {is_city}, Country: {country}, Region: {region}")

            # ===== APPLY HIERARCHICAL FILTERING =====

            for profile in all_profiles:
                if not profile.location:
                    # Profiles without location go to global bucket
                    global_matches.append(profile)
                    continue

                profile_location_lower = profile.location.lower()

                # Special case: Remote
                if is_remote:
                    if "remote" in profile_location_lower:
                        city_matches.append(profile)
                    else:
                        global_matches.append(profile)
                    continue

                # ===== CASE 1: Predefined City (SF, NYC, London, etc.) =====
                # Return city profiles first, then country profiles
                if is_predefined_city:
                    # Check for city match (exact or substring)
                    if location_lower in profile_location_lower:
                        city_matches.append(profile)
                    # Check for country match (if city has a country)
                    elif country and country in profile_location_lower:
                        country_matches.append(profile)
                    else:
                        global_matches.append(profile)

                # ===== CASE 2: Typed City in Mapping (but not predefined) =====
                # Example: User types "Melbourne" → resolve to Australia only
                elif is_city and not is_predefined_city:
                    # Only return country-level profiles (not the city itself)
                    if country in profile_location_lower:
                        country_matches.append(profile)
                    else:
                        global_matches.append(profile)

                # ===== CASE 3: Country or Region Search =====
                # Example: "Germany", "Europe", "Asia"
                else:
                    # Try exact location match first
                    if location_lower in profile_location_lower:
                        city_matches.append(profile)
                    # Try as country match
                    elif any(country_name in profile_location_lower for country_name in COUNTRY_TO_REGION.keys() if location_lower in country_name):
                        country_matches.append(profile)
                    # Try as region match
                    elif region and COUNTRY_TO_REGION.get(profile_location_lower.split(',')[0].strip()) == region:
                        region_matches.append(profile)
                    else:
                        global_matches.append(profile)

            # ===== COMBINE RESULTS WITH CLEAR HIERARCHY =====
            # Priority: City > Country > Region > Global
            all_profiles = city_matches + country_matches + region_matches + global_matches

            logger.info(
                f"✅ Location hierarchy - "
                f"City: {len(city_matches)}, "
                f"Country: {len(country_matches)}, "
                f"Region: {len(region_matches)}, "
                f"Global: {len(global_matches)}"
            )

            # ===== FALLBACK: Never return empty results =====
            # If we have no matches at all, widen scope automatically
            if not all_profiles:
                logger.warning(f"⚠️  No matches for '{location}' - returning all profiles as fallback")
                all_profiles = db.query(Profile).all()
        
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