from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr, validator
from database import get_db
from models import User 
from passlib.context import CryptContext
import hashlib
import jwt  # ADD THIS
from datetime import datetime, timedelta  # ADD THIS
import os
from dotenv import load_dotenv
import re

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
ACCESS_TOKEN_EXPIRE_DAYS = 30

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# ===== REQUEST MODELS =====

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    company: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ===== HELPER =====

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
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
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Create new user account and return JWT token"""
    
    # Check if email exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # Create user
    user = User(
        name=request.name,
        email=request.email,
        company=request.company,
        password_hash=hash_password(request.password)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate JWT token for immediate login
    token = create_access_token(user.id)
    
    return {
        "success": True,
        "token": token,  # ADD THIS
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company": user.company,
            "subscription_plan": user.subscription_plan if hasattr(user, 'subscription_plan') else 'free_trial',
            "subscription_status": user.subscription_status if hasattr(user, 'subscription_status') else 'active',
            "trial_end_date": user.trial_end_date.isoformat() if hasattr(user, 'trial_end_date') and user.trial_end_date else None
        }
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.password_hash != hash_password(request.password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Generate JWT token
    token = create_access_token(user.id)
    
    return {
        "success": True,
        "token": token,  # ADD THIS
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company": user.company,
            "subscription_plan": user.subscription_plan if hasattr(user, 'subscription_plan') else 'free_trial',
            "subscription_status": user.subscription_status if hasattr(user, 'subscription_status') else 'active',
            "trial_end_date": user.trial_end_date.isoformat() if hasattr(user, 'trial_end_date') and user.trial_end_date else None
        }
    }