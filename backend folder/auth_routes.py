from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
from database import get_db
from models import User 
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt
import os
from dotenv import load_dotenv
import re
from slowapi import Limiter
from slowapi.util import get_remote_address

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

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)


# ===== REQUEST MODELS =====

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    company: str
    password: str
    
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
    
    @validator('name', 'company')
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()
    
    @validator('email')
    def validate_email_not_empty(cls, v):
        if not v or not str(v).strip():
            raise ValueError('Email cannot be empty')
        return str(v).strip().lower()


class LoginRequest(BaseModel):
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
    # Bcrypt has a 72-byte limit - truncate password if needed
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_jwt_token(data: dict) -> str:
    """Create a JWT token with expiration"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ===== ENDPOINTS =====

@router.post("/signup")
@limiter.limit("3/minute")
def signup(request: Request, signup_data: SignupRequest, db: Session = Depends(get_db)):
    """Create new user account and return JWT token"""
    
    # Check if email exists
    existing = db.query(User).filter(User.email == signup_data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # Create user with trial_end_date auto-set to 14 days from now
    user = User(
        name=signup_data.name,
        email=signup_data.email.lower(),
        company=signup_data.company,
        password_hash=hash_password(signup_data.password),
        trial_end_date=datetime.now(timezone.utc) + timedelta(days=14)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate JWT token for immediate login
    token = create_jwt_token({"user_id": user.id})
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company": user.company,
            "subscription_plan": user.plan or "free_trial",
            "subscription_status": user.subscription_status or "trial",
            "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None,
            "next_billing_date": user.next_billing_date.isoformat() if user.next_billing_date else None,
            "billing_cycle": user.billing_cycle or "monthly"
        }
    }


@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login user and return JWT token"""

    # Find user by email
    user = db.query(User).filter(User.email == login_data.email.lower()).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password using bcrypt
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Generate JWT token
    token = create_jwt_token({"user_id": user.id})

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company": user.company,
            "subscription_plan": user.plan or "free_trial",
            "subscription_status": user.subscription_status or "trial",
            "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None,
            "next_billing_date": user.next_billing_date.isoformat() if user.next_billing_date else None,
            "billing_cycle": user.billing_cycle or "monthly"
        }
    }