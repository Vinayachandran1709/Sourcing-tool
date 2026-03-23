from typing import Annotated
import logging
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
from email_service import EmailService

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

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.talentbox.co")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

DbSession = Annotated[Session, Depends(get_db)]

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @validator('new_password')
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


def create_reset_token(user_id: int, password_hash: str) -> str:
    """Create a short-lived JWT for password reset, signed with SECRET_KEY + password_hash"""
    payload = {
        "user_id": user_id,
        "purpose": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, SECRET_KEY + password_hash, algorithm=ALGORITHM)


def verify_reset_token(token: str, password_hash: str) -> dict:
    """Verify a password reset token. Returns payload or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY + password_hash, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ===== ENDPOINTS =====

@router.post("/signup")
@limiter.limit("3/minute")
def signup(request: Request, signup_data: SignupRequest, db: DbSession):
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
        "access_token": token,
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


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest, db: DbSession):
    """Send password reset email. Always returns success to avoid email enumeration."""

    user = db.query(User).filter(User.email == data.email.lower()).first()

    if user:
        try:
            reset_token = create_reset_token(user.id, user.password_hash)
            reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

            html = f'''
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #1a1a1a; margin: 0;">Reset Your Password</h2>
                </div>
                <p>Hi {user.name},</p>
                <p>We received a request to reset your TalentBox password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="display: inline-block; padding: 14px 32px; background-color: #FF6B35; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This link will expire in 15 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                    &copy; TalentBox &mdash; <a href="{FRONTEND_URL}" style="color: #FF6B35; text-decoration: none;">talentbox.co</a>
                </p>
            </body>
            </html>
            '''

            result = EmailService.send_single_email(
                to_email=user.email,
                subject="Reset your TalentBox password",
                body_html=html,
                sender_email="noreply@talentbox.co",
                sender_name="TalentBox",
            )

            if not result['success']:
                logger.error(f"Failed to send reset email to {user.email}: {result.get('error')}")
        except Exception as e:
            logger.error(f"Error in forgot-password for {data.email}: {e}")

    # Always return success to prevent email enumeration
    return {"success": True, "message": "If an account exists with this email, we've sent a password reset link."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPasswordRequest, db: DbSession):
    """Reset password using a valid reset token."""

    # First decode without verification to get user_id
    try:
        unverified = jwt.decode(data.token, options={"verify_signature": False, "verify_exp": False})
        user_id = unverified.get("user_id")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    # Now verify the token with the user's current password hash
    payload = verify_reset_token(data.token, user.password_hash)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")

    # Update password
    user.password_hash = hash_password(data.new_password)
    db.commit()

    return {"success": True, "message": "Password has been reset successfully. You can now log in."}

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, login_data: LoginRequest, db: DbSession):
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
        "access_token": token,
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