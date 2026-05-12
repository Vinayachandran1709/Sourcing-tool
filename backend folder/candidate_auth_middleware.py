from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from datetime import datetime, timezone
from database import get_db
from models import Candidate
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

def get_current_candidate(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Candidate:
    """
    Extract and validate candidate from JWT token.
    """
    token = credentials.credentials
    
    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        candidate_id: int = payload.get("candidate_id")
        user_type: str = payload.get("type")
        
        if candidate_id is None or user_type != "candidate":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid candidate authentication token",
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
        
    # Get candidate from database
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Candidate not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return candidate
