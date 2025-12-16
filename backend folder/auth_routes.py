from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User 
import hashlib

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


# ===== ENDPOINTS =====

@router.post("/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Create new user account"""
    
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
    
    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company": user.company
        }
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login user"""
    
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.password_hash != hash_password(request.password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    return {
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "company": user.company
        }
    }