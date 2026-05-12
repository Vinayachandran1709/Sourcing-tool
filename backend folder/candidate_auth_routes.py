from typing import Annotated, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from database import get_db
from models import Candidate, CandidateProfile
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt
import os
from dotenv import load_dotenv
import re
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get configuration from environment
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_DAYS = int(os.getenv("JWT_EXPIRATION_DAYS", "30"))

# Validate secret key
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

DbSession = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/api/candidate/auth", tags=["Candidate Authentication"])


# ===== REQUEST MODELS =====

class CandidateSignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v
    
    @validator('name')
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()
    
    @validator('email')
    def validate_email_not_empty(cls, v):
        if not v or not str(v).strip():
            raise ValueError('Email cannot be empty')
        return str(v).strip().lower()

    @validator('github_username')
    def validate_github(cls, v):
        if v:
            v = v.strip()
            # Basic validation for github username (alphanumeric and single hyphens, max 39 chars)
            if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,37}[a-zA-Z0-9])?$', v):
                raise ValueError("Invalid GitHub username")
        return v


class CandidateLoginRequest(BaseModel):
    email: EmailStr
    password: str

    @validator('email')
    def validate_email_not_empty(cls, v):
        if not v or not str(v).strip():
            raise ValueError('Email cannot be empty')
        return str(v).strip().lower()

    @validator('password')
    def validate_password_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Password cannot be empty')
        return v


# ===== HELPER FUNCTIONS =====

def hash_password(password: str) -> str:
    """Hash password using bcrypt (max 72 bytes)"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_candidate_jwt_token(data: dict) -> str:
    """Create a JWT token with expiration"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ===== ENDPOINTS =====

@router.post("/signup")
@limiter.limit("5/minute")
def signup(request: Request, signup_data: CandidateSignupRequest, db: DbSession):
    """Create new candidate account and return JWT token"""
    
    # Check if email exists
    existing = db.query(Candidate).filter(Candidate.email == signup_data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # Create candidate
    candidate = Candidate(
        name=signup_data.name,
        email=signup_data.email.lower(),
        password_hash=hash_password(signup_data.password),
        phone=signup_data.phone,
        github_username=signup_data.github_username,
        linkedin_url=signup_data.linkedin_url,
        portfolio_url=signup_data.portfolio_url,
        location=signup_data.location,
        onboarding_status="pending"
    )
    
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    
    # Create empty CandidateProfile linked to the candidate
    profile = CandidateProfile(candidate_id=candidate.id)
    db.add(profile)
    db.commit()
    
    # Generate JWT token for immediate login
    token = create_candidate_jwt_token({"candidate_id": candidate.id, "type": "candidate"})
    
    return {
        "success": True,
        "access_token": token,
        "candidate": {
            "id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "github_username": candidate.github_username,
            "onboarding_status": candidate.onboarding_status
        }
    }


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, login_data: CandidateLoginRequest, db: DbSession):
    """Login candidate and return JWT token"""

    # Find candidate by email
    candidate = db.query(Candidate).filter(Candidate.email == login_data.email.lower()).first()

    if not candidate:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password
    if not verify_password(login_data.password, candidate.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate JWT token
    token = create_candidate_jwt_token({"candidate_id": candidate.id, "type": "candidate"})

    return {
        "success": True,
        "access_token": token,
        "candidate": {
            "id": candidate.id,
            "name": candidate.name,
            "email": candidate.email,
            "github_username": candidate.github_username,
            "onboarding_status": candidate.onboarding_status
        }
    }
