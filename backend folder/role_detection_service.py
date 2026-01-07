from typing import Dict, List, Tuple
import re

class RoleDetectionService:
    """
    ✅ COMPREHENSIVE ROLE DETECTION with 10 developer roles
    
    Smart matching:
    - Role matches if profile has ANY: language OR framework OR tool
    - Multi-language selection shows all matching roles
    """
    
    # ✅ COMPREHENSIVE ROLE DEFINITIONS (from user's spec)
    ROLE_PATTERNS = {
        "Frontend Engineer": {
            "languages": ["JavaScript", "TypeScript"],
            "frameworks": ["React", "Vue.js", "Vue", "Angular", "Next.js", "Svelte"],
            "tools": ["Git", "REST API", "GraphQL", "Figma", "GitHub Actions"],
            "keywords": ["frontend", "front-end", "ui", "ux", "web design", "responsive", "css", "html"],
            "repo_keywords": ["dashboard", "landing", "portfolio", "website", "frontend", "ui"]
        },
        
        "Backend Engineer": {
            "languages": ["Java", "Python", "JavaScript", "TypeScript", "Go", "Rust", "C#", "Ruby", "PHP", "Scala", "Kotlin", "Elixir", "Clojure", "SQL"],
            "frameworks": ["Django", "Flask", "FastAPI", "Spring Boot", "Spring", "Express.js", "Express", "Laravel", "Rails", "ASP.NET"],
            "tools": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform", "MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch", "REST API", "GraphQL", "Git", "Jenkins", "GitLab CI", "GitHub Actions"],
            "keywords": ["backend", "back-end", "api", "server", "database", "microservices", "rest", "graphql"],
            "repo_keywords": ["api", "server", "backend", "service", "database", "rest"]
        },
        
        "Full Stack Engineer": {
            "languages": ["JavaScript", "TypeScript", "Python", "Java", "Ruby", "PHP", "C#", "SQL"],
            "frameworks": ["React", "Vue.js", "Vue", "Angular", "Next.js", "Express.js", "Express", "Django", "Rails", "Laravel", "ASP.NET"],
            "tools": ["Docker", "AWS", "Azure", "GCP", "MongoDB", "PostgreSQL", "MySQL", "Redis", "REST API", "GraphQL", "Git", "GitHub Actions", "Figma"],
            "keywords": ["full-stack", "fullstack", "full stack", "frontend and backend", "end-to-end"],
            "repo_keywords": ["full-stack", "fullstack", "web-app", "webapp"]
        },
        
        "Mobile Engineer": {
            "languages": ["Swift", "Kotlin", "Dart", "Java", "C#"],
            "frameworks": ["Flutter", "React Native"],
            "tools": ["Git", "GitHub Actions", "REST API", "GraphQL"],
            "keywords": ["mobile", "ios", "android", "app development", "react native", "flutter"],
            "repo_keywords": ["mobile", "ios", "android", "app", "flutter", "react-native"]
        },
        
        "DevOps Engineer": {
            "languages": ["Python", "Go", "JavaScript"],
            "frameworks": [],  # DevOps has no frameworks in spec
            "tools": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform", "Ansible", "Jenkins", "GitLab CI", "GitHub Actions", "Git"],
            "keywords": ["devops", "sre", "infrastructure", "ci/cd", "deployment", "automation", "cloud"],
            "repo_keywords": ["devops", "infrastructure", "ci-cd", "deployment", "docker", "kubernetes"]
        },
        
        "Data Scientist": {
            "languages": ["Python", "R", "Julia"],
            "frameworks": ["Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "Keras"],
            "tools": ["Git", "PostgreSQL", "MySQL"],
            "keywords": ["data science", "machine learning", "analytics", "statistics", "data analysis"],
            "repo_keywords": ["data-science", "analysis", "ml", "statistics", "data"]
        },
        
        "AI/ML Engineer": {
            "languages": ["Python", "C++", "Java", "Julia"],
            "frameworks": ["TensorFlow", "PyTorch", "Keras", "Scikit-learn"],
            "tools": ["Docker", "Kubernetes", "AWS", "GCP", "Git", "PostgreSQL", "Redis"],
            "keywords": ["machine learning", "deep learning", "ai", "artificial intelligence", "neural network", "llm", "nlp"],
            "repo_keywords": ["ml", "ai", "deep-learning", "model", "neural", "tensorflow", "pytorch"]
        },
        
        "Data Engineer": {
            "languages": ["Python", "Java", "Scala", "Go", "SQL"],
            "frameworks": ["Apache Spark", "Spark", "Apache Airflow", "Airflow"],
            "tools": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "PostgreSQL", "MySQL", "Elasticsearch", "Git"],
            "keywords": ["data engineer", "etl", "data pipeline", "big data", "data warehouse"],
            "repo_keywords": ["etl", "pipeline", "data-engineering", "spark", "airflow"]
        },
        
        "QA Engineer": {
            "languages": ["Java", "Python", "JavaScript", "TypeScript", "Ruby", "C#"],
            "frameworks": ["Selenium", "Cypress", "Playwright"],
            "tools": ["Jenkins", "GitHub Actions", "Git", "REST API"],
            "keywords": ["qa", "testing", "automation", "quality assurance", "test automation"],
            "repo_keywords": ["test", "qa", "automation", "testing", "selenium"]
        },
        
        "Security Engineer": {
            "languages": ["Python", "C", "C++", "Rust", "Go", "Java"],
            "frameworks": [],  # Security has no frameworks in spec
            "tools": ["Docker", "Kubernetes", "AWS", "GCP", "Git"],
            "keywords": ["security", "cybersecurity", "penetration", "vulnerability", "infosec", "appsec"],
            "repo_keywords": ["security", "pentest", "vulnerability", "exploit", "infosec"]
        }
    }
    
    @staticmethod
    def detect_roles(profile) -> List[Dict]:
        """
        Analyze profile and return detected roles with confidence scores.
        
        ✅ FLEXIBLE MATCHING: Role matches if profile has ANY:
        - Language from role's languages
        - Framework from role's frameworks
        - Tool from role's tools
        
        Returns:
            [
                {"role": "Backend Engineer", "confidence": 0.85, "signals": [...]},
                {"role": "Frontend Engineer", "confidence": 0.62, "signals": [...]}
            ]
        """
        detected = []
        
        # Extract profile data
        bio = (profile.bio or "").lower()
        languages_data = profile.languages_data or {}
        top_repos = profile.top_repos or []
        primary_language = (profile.primary_language or "").lower()
        
        # Get all languages from profile
        profile_languages = list(languages_data.keys()) if isinstance(languages_data, dict) else []
        
        # Build searchable text from repos
        repo_text = " ".join([
            str(repo.get("name", "")).lower() + " " + 
            str(repo.get("description", "")).lower()
            for repo in top_repos
        ])
        
        # Score each role
        for role_name, patterns in RoleDetectionService.ROLE_PATTERNS.items():
            score, signals = RoleDetectionService._score_role(
                role_name=role_name,
                patterns=patterns,
                bio=bio,
                profile_languages=profile_languages,
                primary_language=primary_language,
                repo_text=repo_text
            )
            
            # Only include roles with >40% confidence
            if score >= 0.40:
                detected.append({
                    "role": role_name,
                    "confidence": round(score, 2),
                    "signals": signals
                })
        
        # Sort by confidence (highest first)
        detected.sort(key=lambda x: x["confidence"], reverse=True)
        
        return detected
    
    @staticmethod
    def _score_role(
        role_name: str,
        patterns: Dict,
        bio: str,
        profile_languages: List[str],
        primary_language: str,
        repo_text: str
    ) -> Tuple[float, List[str]]:
        """
        Calculate confidence score for a single role.
        
        Scoring weights:
        - Explicit keyword in bio: 40%
        - Languages match: 30%
        - Frameworks match: 20%
        - Repo keywords: 10%
        """
        signals = []
        score = 0.0
        
        # 1. Check bio for explicit keywords (40% weight)
        keyword_matches = sum(1 for kw in patterns["keywords"] if kw in bio)
        if keyword_matches > 0:
            keyword_score = min(keyword_matches / len(patterns["keywords"]), 1.0) * 0.40
            score += keyword_score
            signals.append(f"Bio mentions {keyword_matches} relevant keywords")
        
        # 2. Check languages (30% weight)
        language_matches = sum(
            1 for lang in patterns["languages"]
            if lang.lower() in [pl.lower() for pl in profile_languages] or
               lang.lower() in primary_language
        )
        if language_matches > 0:
            language_score = min(language_matches / max(len(patterns["languages"]), 3), 1.0) * 0.30
            score += language_score
            signals.append(f"Uses {language_matches} relevant languages")
        
        # 3. Check frameworks (20% weight)
        framework_matches = sum(
            1 for fw in patterns["frameworks"]
            if fw.lower() in bio or fw.lower() in repo_text
        )
        if framework_matches > 0:
            framework_score = min(framework_matches / max(len(patterns["frameworks"]), 3), 1.0) * 0.20
            score += framework_score
            signals.append(f"Works with {framework_matches} relevant frameworks")
        
        # 4. Check repo keywords (10% weight)
        repo_keyword_matches = sum(
            1 for kw in patterns["repo_keywords"]
            if kw in repo_text
        )
        if repo_keyword_matches > 0:
            repo_score = min(repo_keyword_matches / len(patterns["repo_keywords"]), 1.0) * 0.10
            score += repo_score
            signals.append(f"Has {repo_keyword_matches} relevant projects")
        
        # Bonus: If primary language is a strong match, boost score by 10%
        if any(lang.lower() in primary_language for lang in patterns["languages"][:2]):
            score = min(score * 1.10, 1.0)
            signals.append("Primary language is highly relevant")
        
        return score, signals
    
    @staticmethod
    def matches_role_filter(profile, role_filter: str, min_confidence: float = 0.40) -> bool:
        """
        Check if profile matches a role filter.
        
        Args:
            profile: Profile object with detected_roles
            role_filter: Role name to filter by
            min_confidence: Minimum confidence to consider (default 40%)
        """
        if not profile.detected_roles:
            return False
        
        for role_data in profile.detected_roles:
            if role_data.get("role") == role_filter:
                return role_data.get("confidence", 0) >= min_confidence
        
        return False
    
    @staticmethod
    def get_roles_for_tech(tech_type: str, tech_value: str) -> List[str]:
        """
        ✅ NEW: Get all roles that use a specific technology
        
        Args:
            tech_type: "language", "framework", or "tool"
            tech_value: e.g. "Python", "React", "Docker"
        
        Returns:
            List of role names that use this technology
        """
        matching_roles = []
        
        tech_value_lower = tech_value.lower()
        
        for role_name, patterns in RoleDetectionService.ROLE_PATTERNS.items():
            if tech_type == "language":
                if any(lang.lower() == tech_value_lower for lang in patterns["languages"]):
                    matching_roles.append(role_name)
            elif tech_type == "framework":
                if any(fw.lower() == tech_value_lower for fw in patterns["frameworks"]):
                    matching_roles.append(role_name)
            elif tech_type == "tool":
                if any(tool.lower() == tech_value_lower for tool in patterns["tools"]):
                    matching_roles.append(role_name)
        
        return matching_roles
    
    @staticmethod
    def profile_matches_any_tech(profile, languages=None, frameworks=None, tools=None) -> bool:
        """
        ✅ NEW: Check if profile matches ANY of the selected technologies
        
        Flexible matching:
        - Returns True if profile has ANY language OR framework OR tool from selections
        
        Args:
            profile: Profile object
            languages: List of language names
            frameworks: List of framework names
            tools: List of tool names
        
        Returns:
            True if profile matches at least one selected technology
        """
        languages = languages or []
        frameworks = frameworks or []
        tools = tools or []
        
        # If no tech specified, match all profiles
        if not languages and not frameworks and not tools:
            return True
        
        # Get profile data
        bio = (profile.bio or "").lower()
        languages_data = profile.languages_data or {}
        top_repos = profile.top_repos or []
        primary_language = (profile.primary_language or "").lower()
        
        profile_languages = list(languages_data.keys()) if isinstance(languages_data, dict) else []
        
        repo_text = " ".join([
            str(repo.get("name", "")).lower() + " " + 
            str(repo.get("description", "")).lower()
            for repo in top_repos
        ])
        
        # Check languages
        for lang in languages:
            lang_lower = lang.lower()
            if any(lang_lower in pl.lower() for pl in profile_languages) or lang_lower in primary_language:
                return True
        
        # Check frameworks
        for fw in frameworks:
            fw_lower = fw.lower()
            if fw_lower in bio or fw_lower in repo_text:
                return True
        
        # Check tools (in bio or repos)
        for tool in tools:
            tool_lower = tool.lower()
            if tool_lower in bio or tool_lower in repo_text:
                return True
        
        return False