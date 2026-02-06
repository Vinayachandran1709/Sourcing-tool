from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from datetime import datetime, timezone
from database import get_db
from models import User
import os
from dotenv import load_dotenv

# Security scheme
security = HTTPBearer()

load_dotenv()

# Get secret key from environment
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Validate secret key exists
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and validate user from JWT token.
    
    Args:
        credentials: JWT token from Authorization header
        db: Database session
        
    Returns:
        User: Authenticated user object
        
    Raises:
        HTTPException: If token is invalid, expired, or user not found
    """
    token = credentials.credentials
    
    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if trial has expired (block after 14 days if not upgraded)
    if user.plan == 'free_trial' or user.subscription_status == 'trial':
        if user.trial_end_date and datetime.now(timezone.utc) > user.trial_end_date:
            # Mark as expired in DB
            if user.subscription_status != 'expired':
                user.subscription_status = 'expired'
                db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "TRIAL_EXPIRED",
                    "message": "Your free trial has expired. Please upgrade your plan.",
                    "trial_end_date": user.trial_end_date.isoformat() if user.trial_end_date else None
                }
            )

    # Check if subscription is active
    if user.subscription_status not in ['active', 'trialing', 'trial']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "SUBSCRIPTION_INACTIVE",
                "message": "Your subscription is not active. Please check your payment status."
            }
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (additional check for future use).
    
    Args:
        current_user: User from get_current_user
        
    Returns:
        User: Active user object
    """
    # Add any additional checks here if needed
    # For example, check if user is banned, email verified, etc.
    
    return current_user