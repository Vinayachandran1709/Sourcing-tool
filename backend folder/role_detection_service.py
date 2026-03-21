"""
Improved Role Detection Service
Detects multiple roles per developer based on bio, languages, and repo names.
"""

import re
from typing import List, Tuple

# Primary role keywords - more comprehensive
ROLE_KEYWORDS = {
    "Frontend Developer": [
        "frontend", "front-end", "front end", "react", "vue", "angular", "svelte",
        "css", "html", "ui developer", "ui engineer", "ux engineer", "web developer",
        "javascript developer", "typescript developer", "nextjs", "next.js"
    ],
    "Backend Developer": [
        "backend", "back-end", "back end", "api", "server", "microservices",
        "django", "flask", "fastapi", "express", "rails", "spring", "laravel",
        "node.js", "nodejs", "graphql", "rest api"
    ],
    "Full-Stack Developer": [
        "fullstack", "full-stack", "full stack", "mern", "mean", "lamp",
        "web application", "full-stack engineer", "product engineer"
    ],
    "Mobile Developer": [
        "ios", "android", "mobile", "swift developer", "kotlin developer",
        "react native", "flutter", "mobile engineer", "app developer",
        "iphone", "ipad", "mobile app"
    ],
    "DevOps Engineer": [
        "devops", "sre", "site reliability", "infrastructure", "platform engineer",
        "kubernetes", "k8s", "docker", "aws", "azure", "gcp", "cloud engineer",
        "ci/cd", "cicd", "terraform", "ansible", "jenkins", "gitlab ci",
        "cloud architect", "infrastructure engineer", "platform engineering"
    ],
    "Data Scientist": [
        "data science", "data scientist", "machine learning", "ml engineer",
        "data analyst", "analytics", "statistics", "statistical", "pandas",
        "numpy", "jupyter", "data mining", "predictive modeling", "r programmer"
    ],
    "AI/ML Engineer": [
        "artificial intelligence", "ai engineer", "ai/ml", "ml engineer",
        "deep learning", "neural network", "pytorch", "tensorflow", "keras",
        "nlp", "natural language", "computer vision", "cv engineer",
        "machine learning engineer", "ai researcher", "llm", "gpt", "transformer",
        "reinforcement learning", "generative ai", "diffusion", "stable diffusion",
        "langchain", "hugging face", "huggingface", "openai"
    ],
    "Data Engineer": [
        "data engineer", "data engineering", "etl", "data pipeline", "data warehouse",
        "spark", "kafka", "airflow", "databricks", "snowflake", "bigquery",
        "data infrastructure", "data platform", "dbt", "data lakehouse"
    ],
    "Security Engineer": [
        "security", "cybersecurity", "cyber security", "infosec", "appsec",
        "penetration", "pentest", "devsecops", "security engineer", "soc analyst",
        "threat", "vulnerability", "cryptography", "security researcher"
    ],
    "QA Engineer": [
        "qa", "quality assurance", "test engineer", "testing", "test automation",
        "selenium", "cypress", "playwright", "sdet", "quality engineer"
    ],
    "Blockchain Developer": [
        "blockchain", "web3", "smart contract", "solidity", "ethereum", "crypto",
        "defi", "nft", "dapp", "decentralized"
    ],
    "Game Developer": [
        "game developer", "game dev", "unity", "unreal", "gamedev", "game engine",
        "game programmer", "game designer"
    ],
    "Embedded Engineer": [
        "embedded", "firmware", "iot", "arduino", "raspberry pi", "microcontroller",
        "embedded systems", "rtos", "hardware"
    ],
}

# Language combinations that strongly indicate specific roles
LANGUAGE_ROLE_SIGNALS = {
    # AI/ML indicators
    ("Python", "Jupyter Notebook"): ["AI/ML Engineer", "Data Scientist"],
    ("Python", "C++"): ["AI/ML Engineer"],  # Often ML with performance needs
    ("Python", "CUDA"): ["AI/ML Engineer"],

    # Data indicators
    ("Python", "SQL"): ["Data Engineer", "Data Scientist"],
    ("Scala", "Python"): ["Data Engineer"],
    ("Python", "R"): ["Data Scientist"],

    # Full-stack indicators
    ("JavaScript", "Python"): ["Full-Stack Developer"],
    ("TypeScript", "Python"): ["Full-Stack Developer"],
    ("JavaScript", "Ruby"): ["Full-Stack Developer"],
    ("TypeScript", "Go"): ["Full-Stack Developer"],

    # Mobile indicators
    ("Swift", "Objective-C"): ["Mobile Developer"],
    ("Kotlin", "Java"): ["Mobile Developer"],
    ("Dart",): ["Mobile Developer"],

    # DevOps indicators
    ("Shell", "Python"): ["DevOps Engineer"],
    ("Go", "Shell"): ["DevOps Engineer"],
    ("HCL", "Python"): ["DevOps Engineer"],
    ("HCL",): ["DevOps Engineer"],

    # Security indicators
    ("Python", "C"): ["Security Engineer"],
    ("Rust", "C"): ["Security Engineer"],
}

# Single language to role mappings (fallback)
LANGUAGE_TO_ROLES = {
    "JavaScript": ["Frontend Developer"],
    "TypeScript": ["Frontend Developer"],
    "Python": ["Backend Developer"],  # Default, but can be overridden
    "Java": ["Backend Developer"],
    "Go": ["Backend Developer", "DevOps Engineer"],
    "Rust": ["Backend Developer", "Security Engineer"],
    "Ruby": ["Backend Developer"],
    "PHP": ["Backend Developer"],
    "C#": ["Backend Developer"],
    "Swift": ["Mobile Developer"],
    "Kotlin": ["Mobile Developer"],
    "Dart": ["Mobile Developer"],
    "R": ["Data Scientist"],
    "Julia": ["Data Scientist", "AI/ML Engineer"],
    "Scala": ["Data Engineer", "Backend Developer"],
    "Shell": ["DevOps Engineer"],
    "HCL": ["DevOps Engineer"],
    "Solidity": ["Blockchain Developer"],
    "C++": ["Backend Developer"],  # Can also indicate ML
    "C": ["Embedded Engineer", "Backend Developer"],
}


def detect_roles_from_bio(bio: str) -> List[str]:
    """Detect all matching roles from bio text."""
    if not bio:
        return []

    bio_lower = bio.lower()
    detected = []

    for role, keywords in ROLE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in bio_lower:
                if role not in detected:
                    detected.append(role)
                break  # Found one keyword for this role, move to next role

    return detected


def detect_roles_from_languages(languages: List[str]) -> List[str]:
    """Detect roles based on language combinations."""
    if not languages:
        return []

    detected = []
    lang_set = set(languages)

    # Check language combinations first (more specific)
    for lang_combo, roles in LANGUAGE_ROLE_SIGNALS.items():
        if all(lang in lang_set for lang in lang_combo):
            for role in roles:
                if role not in detected:
                    detected.append(role)

    # If no combinations matched, use single language mappings
    if not detected:
        for lang in languages[:3]:  # Top 3 languages
            if lang in LANGUAGE_TO_ROLES:
                for role in LANGUAGE_TO_ROLES[lang]:
                    if role not in detected:
                        detected.append(role)

    return detected


def detect_all_roles(bio: str, languages: List[str], repos: List[str] = None) -> Tuple[str, List[str]]:
    """
    Detect all applicable roles for a developer.

    Returns:
        Tuple of (primary_role, all_roles_list)
    """
    all_roles = []

    # Get roles from bio (highest priority)
    bio_roles = detect_roles_from_bio(bio)
    all_roles.extend(bio_roles)

    # Get roles from languages
    lang_roles = detect_roles_from_languages(languages)
    for role in lang_roles:
        if role not in all_roles:
            all_roles.append(role)

    # Check for AI/ML signals in bio even if not caught by keywords
    if bio:
        bio_lower = bio.lower()
        ai_signals = ["ml", "ai", "machine learning", "deep learning", "neural", "model", "training"]
        if any(signal in bio_lower for signal in ai_signals):
            if "AI/ML Engineer" not in all_roles:
                all_roles.append("AI/ML Engineer")

        # Check for data signals
        data_signals = ["data", "analytics", "etl", "pipeline", "warehouse"]
        if any(signal in bio_lower for signal in data_signals):
            if "Data Scientist" not in all_roles and "Data Engineer" not in all_roles:
                all_roles.append("Data Scientist")

    # Default if nothing detected
    if not all_roles:
        all_roles = ["Software Developer"]

    # Primary role is the first one (bio takes priority)
    primary_role = all_roles[0]

    return primary_role, all_roles


def detect_role(bio: str, languages: List[str]) -> str:
    """
    Legacy function for backward compatibility.
    Returns single primary role.
    """
    primary_role, _ = detect_all_roles(bio, languages)
    return primary_role
