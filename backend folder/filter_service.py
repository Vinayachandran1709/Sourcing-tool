from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, cast, String
from models import Profile
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)


class FilterService:
    """Handle advanced profile filtering with soft matching (40% threshold)"""
    
    @staticmethod
    def apply_filters(db: Session, filters: Dict) -> List[Profile]:
        """
        Apply SOFT filters and return RANKED profiles.
        
        ✅ SOFT FILTERING (40% match threshold):
        - Languages: Match 40%+ of selected languages
        - Frameworks: Match 40%+ of selected frameworks
        - Tools: Match 40%+ of selected tools
        - Location: Fuzzy match
        - Score Ranges: Multi-select (removed from main filters)
        - Contribution Ranges: Multi-select
        - Repo Ranges: Multi-select
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
                    match_score -= 30
                    match_signals.append(f"⚠ Role mismatch")
            
            # ✅ 2. LANGUAGE FILTER (SOFT - 40% threshold)
            languages = filters.get("languages", [])
            if languages:
                language_matches = 0
                profile_langs = []
                
                if profile.primary_language:
                    profile_langs.append(profile.primary_language.lower())
                
                if profile.languages_data:
                    profile_langs.extend([lang.lower() for lang in profile.languages_data.keys()])
                
                for lang in languages:
                    if any(lang.lower() in pl for pl in profile_langs):
                        language_matches += 1
                
                match_percentage = language_matches / len(languages)
                
                if match_percentage >= 1.0:
                    # 100% match
                    match_score += 20
                    match_signals.append(f"✅ All languages match ({language_matches}/{len(languages)})")
                elif match_percentage >= 0.75:
                    # 75%+ match
                    match_score += 15
                    match_signals.append(f"✅ Most languages match ({language_matches}/{len(languages)})")
                elif match_percentage >= 0.40:
                    # 40%+ match (SOFT threshold)
                    match_score += 8
                    match_signals.append(f"✓ Some languages match ({language_matches}/{len(languages)})")
                else:
                    # Below 40% threshold - still show but rank lower
                    match_score -= 15
                    match_signals.append(f"○ Few languages match ({language_matches}/{len(languages)})")
            
            # ✅ 3. FRAMEWORKS FILTER (SOFT - 40% threshold)
            frameworks = filters.get("frameworks", [])
            if frameworks:
                framework_matches = 0
                search_text = f"{profile.bio or ''} {str(profile.languages_data or '')} {str(profile.top_repos or '')}".lower()
                
                for fw in frameworks:
                    if fw.lower() in search_text:
                        framework_matches += 1
                
                if framework_matches > 0:
                    match_percentage = framework_matches / len(frameworks)
                    
                    if match_percentage >= 1.0:
                        match_score += 15
                        match_signals.append(f"✅ All frameworks match ({framework_matches}/{len(frameworks)})")
                    elif match_percentage >= 0.75:
                        match_score += 12
                        match_signals.append(f"✅ Most frameworks match ({framework_matches}/{len(frameworks)})")
                    elif match_percentage >= 0.40:
                        match_score += 7
                        match_signals.append(f"✓ Some frameworks match ({framework_matches}/{len(frameworks)})")
                    else:
                        match_score -= 10
                        match_signals.append(f"○ Few frameworks match ({framework_matches}/{len(frameworks)})")
            
            # ✅ 4. TOOLS FILTER (SOFT - 40% threshold)
            tools = filters.get("tools", [])
            if tools:
                tool_matches = 0
                search_text = f"{profile.bio or ''} {str(profile.languages_data or '')} {str(profile.top_repos or '')}".lower()
                
                for tool in tools:
                    if tool.lower() in search_text:
                        tool_matches += 1
                
                if tool_matches > 0:
                    match_percentage = tool_matches / len(tools)
                    
                    if match_percentage >= 1.0:
                        match_score += 15
                        match_signals.append(f"✅ All tools match ({tool_matches}/{len(tools)})")
                    elif match_percentage >= 0.75:
                        match_score += 12
                        match_signals.append(f"✅ Most tools match ({tool_matches}/{len(tools)})")
                    elif match_percentage >= 0.40:
                        match_score += 7
                        match_signals.append(f"✓ Some tools match ({tool_matches}/{len(tools)})")
                    else:
                        match_score -= 10
                        match_signals.append(f"○ Few tools match ({tool_matches}/{len(tools)})")
            
            # 5. LOCATION FILTER (Very Soft - fuzzy matching)
            location = filters.get("location")
            if location and profile.location:
                # Check if filter location is contained in profile location (case-insensitive)
                if location.lower() in profile.location.lower():
                    match_score += 15
                    match_signals.append(f"✅ Location match: {profile.location}")
                else:
                    # Check reverse (profile location in filter)
                    if profile.location.lower() in location.lower():
                        match_score += 10
                        match_signals.append(f"✓ Location partial: {profile.location}")
                    else:
                        match_score -= 8
                        match_signals.append(f"○ Location: {profile.location}")
            elif location and not profile.location:
                match_score -= 5
            
            # ✅ 6. CONTRIBUTION RANGES (Multi-Select - from main filters)
            contribution_ranges = filters.get("contributionRanges", [])
            if contribution_ranges:
                contrib_match = False
                for contrib_range in contribution_ranges:
                    if contrib_range["min"] <= profile.contributions_last_year <= contrib_range["max"]:
                        contrib_match = True
                        match_score += 15
                        match_signals.append(f"✅ Contributions {profile.contributions_last_year} in range {contrib_range['min']}-{contrib_range['max']}")
                        break
                
                if not contrib_match:
                    match_score -= 12
                    match_signals.append(f"○ Contributions {profile.contributions_last_year} outside selected ranges")
            
            # ✅ 7. REPO RANGES (Multi-Select - from main filters)
            repo_ranges = filters.get("repoRanges", [])
            if repo_ranges:
                repo_match = False
                for repo_range in repo_ranges:
                    if repo_range["min"] <= profile.public_repos <= repo_range["max"]:
                        repo_match = True
                        match_score += 10
                        match_signals.append(f"✅ Repos {profile.public_repos} in range {repo_range['min']}-{repo_range['max']}")
                        break
                
                if not repo_match:
                    match_score -= 8
                    match_signals.append(f"○ Repos {profile.public_repos} outside selected ranges")
            
            # Calculate final score
            final_score = profile.developer_score + match_score
            final_score = max(0, min(200, final_score))
            
            # Store results
            profile.match_score = final_score
            profile.match_signals = match_signals
            profile.adjusted_score = final_score
            
            # ✅ SOFT EXCLUSION: Only exclude if match_score is EXTREMELY negative (less than -40)
            # This ensures profiles with 40%+ match in ANY filter are still shown
            if match_score > -40:
                scored_profiles.append(profile)
        
        # Sort by match score (highest first)
        scored_profiles.sort(key=lambda p: p.match_score, reverse=True)
        
        logger.info(f"FilterService returning {len(scored_profiles)} profiles (was {len(all_profiles)})")
        if scored_profiles:
            logger.info(f"Top profile score: {scored_profiles[0].match_score}")
            logger.info(f"Bottom profile score: {scored_profiles[-1].match_score}")
        
        return scored_profiles
    
    @staticmethod
    def filter_by_score(profiles: List[Profile], min_score: int = 0, max_score: int = 100) -> List[Profile]:
        """
        Filter profiles by developer score range (applied AFTER initial search)
        NOTE: This is now handled client-side in SearchDashboard with multi-select
        """
        return [p for p in profiles if min_score <= p.developer_score <= max_score]