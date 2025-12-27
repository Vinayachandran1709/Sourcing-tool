import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# GitHub API Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_API_URL = "https://api.github.com"

# Rate limiting
RATE_LIMIT_THRESHOLD = 100

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Email (for later use)
COMPANY_EMAIL = os.getenv("COMPANY_EMAIL")
COMPANY_EMAIL_PASSWORD = os.getenv("COMPANY_EMAIL_PASSWORD")

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

print(f"✅ Config loaded: GitHub token = {GITHUB_TOKEN[:10]}..." if GITHUB_TOKEN else "❌ GitHub token missing!")