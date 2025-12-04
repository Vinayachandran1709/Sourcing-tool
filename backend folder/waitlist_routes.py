from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from database import get_db, Base

router = APIRouter(prefix="/api/public", tags=["Public"])

# ===== MODELS =====

class WaitlistEntry(Base):
    __tablename__ = "waitlist"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="new")


# ===== REQUEST MODELS =====

class WaitlistRequest(BaseModel):
    name: str
    company: str
    email: EmailStr


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str


# ===== ENDPOINTS =====

@router.post("/waitlist/join")
def join_waitlist(request: WaitlistRequest, db: Session = Depends(get_db)):
    """Add user to beta waitlist (PUBLIC - no auth)"""
    
    # Check if already exists
    existing = db.query(WaitlistEntry).filter(
        WaitlistEntry.email == request.email
    ).first()
    
    if existing:
        return {
            "success": True,
            "message": "You're already on the waitlist!",
            "already_exists": True
        }
    
    # Add to waitlist
    entry = WaitlistEntry(
        name=request.name,
        company=request.company,
        email=request.email
    )
    
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    return {
        "success": True,
        "message": "Successfully added to waitlist!",
        "id": entry.id
    }


@router.post("/contact/send")
def send_contact_message(request: ContactRequest, db: Session = Depends(get_db)):
    """Receive contact form (PUBLIC - no auth)"""
    
    message = ContactMessage(
        name=request.name,
        email=request.email,
        message=request.message
    )
    
    db.add(message)
    db.commit()
    
    return {
        "success": True,
        "message": "Message received! We'll get back to you soon."
    }


@router.get("/waitlist/count")
def get_waitlist_count(db: Session = Depends(get_db)):
    """Get total waitlist signups (PUBLIC)"""
    
    count = db.query(WaitlistEntry).count()
    
    return {
        "total": count,
        "message": f"{count} people on the waitlist!"
    }