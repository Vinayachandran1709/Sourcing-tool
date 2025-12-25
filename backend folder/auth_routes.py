from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User 
import hashlib
import jwt  # ADD THIS
from datetime import datetime, timedelta  # ADD THIS

# JWT Configuration (MUST MATCH auth_middleware.py)
SECRET_KEY = "52b86e7f43a5d32c108b620e7b961cdc79b5394f748db3bc6e0da6a9e3b9f68e"
ALGORITHM = "HS256"
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
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(user_id: int) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "user_id": user_id,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


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