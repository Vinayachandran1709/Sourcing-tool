from typing import Dict, List, Tuple
import re

class RoleDetectionService:
    """
    Smart role detection based on languages, frameworks, repos, and bio.
    Uses multi-signal scoring with soft thresholds (40%+ confidence shown).
    """
    
    # Role definitions with weighted signals
    ROLE_PATTERNS = {
        "Frontend Developer": {
            "languages": ["JavaScript", "TypeScript", "HTML", "CSS"],
            "frameworks": ["React", "Vue", "Angular", "Next.js", "Svelte", "Tailwind"],
            "keywords": ["frontend", "front-end", "ui", "ux", "web design", "responsive"],
            "repo_keywords": ["dashboard", "landing", "portfolio", "website", "app"]
        },
        "Backend Developer": {
            "languages": ["Python", "Java", "Go", "Node.js", "PHP", "Ruby", "C#", "Rust"],
            "frameworks": ["Django", "Flask", "FastAPI", "Spring", "Express", "Laravel", "Rails"],
            "keywords": ["backend", "back-end", "api", "server", "database", "microservices"],
            "repo_keywords": ["api", "server", "backend", "service", "database"]
        },
        "Full-Stack Developer": {
            "languages": ["JavaScript", "TypeScript", "Python", "Java"],
            "frameworks": ["React", "Next.js", "Django", "Flask", "Express", "Node.js"],
            "keywords": ["full-stack", "fullstack", "full stack", "frontend and backend"],
            "repo_keywords": ["full-stack", "fullstack", "web-app", "webapp"]
        },
        "Mobile Developer": {
            "languages": ["Swift", "Kotlin", "Dart", "Java", "Objective-C"],
            "frameworks": ["React Native", "Flutter", "SwiftUI", "Android SDK", "Ionic"],
            "keywords": ["mobile", "ios", "android", "app development"],
            "repo_keywords": ["mobile", "ios", "android", "app"]
        },
        "DevOps Engineer": {
            "languages": ["Python", "Go", "Bash", "Ruby"],
            "frameworks": ["Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins"],
            "keywords": ["devops", "sre", "infrastructure", "ci/cd", "deployment"],
            "repo_keywords": ["devops", "infrastructure", "ci-cd", "deployment", "docker"]
        },
        "Data Scientist": {
            "languages": ["Python", "R", "SQL", "Julia"],
            "frameworks": ["Pandas", "NumPy", "Scikit-learn", "Matplotlib", "Jupyter"],
            "keywords": ["data science", "machine learning", "analytics", "statistics"],
            "repo_keywords": ["data-science", "analysis", "ml", "statistics"]
        },
        "AI/ML Engineer": {
            "languages": ["Python", "R", "C++"],
            "frameworks": ["TensorFlow", "PyTorch", "Keras", "Hugging Face", "OpenAI"],
            "keywords": ["machine learning", "deep learning", "ai", "neural network", "llm"],
            "repo_keywords": ["ml", "ai", "deep-learning", "model", "neural"]
        },
        "Data Engineer": {
            "languages": ["Python", "Scala", "Java", "SQL"],
            "frameworks": ["Apache Spark", "Airflow", "Kafka", "Hadoop", "dbt"],
            "keywords": ["data engineer", "etl", "data pipeline", "big data"],
            "repo_keywords": ["etl", "pipeline", "data-engineering", "spark"]
        },
        "QA Engineer": {
            "languages": ["Python", "Java", "JavaScript"],
            "frameworks": ["Selenium", "Pytest", "Jest", "Cypress", "JUnit"],
            "keywords": ["qa", "testing", "automation", "quality assurance"],
            "repo_keywords": ["test", "qa", "automation", "testing"]
        },
        "Security Engineer": {
            "languages": ["Python", "Go", "C", "C++"],
            "frameworks": ["Metasploit", "Burp Suite", "OWASP"],
            "keywords": ["security", "cybersecurity", "penetration", "vulnerability"],
            "repo_keywords": ["security", "pentest", "vulnerability", "exploit"]
        }
    }
    
    @staticmethod
    def detect_roles(profile) -> List[Dict]:
        """
        Analyze profile and return detected roles with confidence scores.
        
        Returns:
            [
                {"role": "Backend Developer", "confidence": 0.85, "signals": [...]},
                {"role": "Frontend Developer", "confidence": 0.62, "signals": [...]}
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
            
            # Only include roles with >40% confidence (soft threshold)
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
            # More lenient: even 1 language match gives partial credit
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
        Check if profile matches a role filter with soft threshold.
        
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