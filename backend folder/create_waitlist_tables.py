from sqlalchemy import Column, Integer, String, DateTime, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from database import engine, Base
import sys

# Define models
class WaitlistEntry(Base):
    """Beta waitlist signups"""
    __tablename__ = "waitlist"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String, default="landing_page")
    notes = Column(Text, nullable=True)


class ContactMessage(Base):
    """Contact form submissions"""
    __tablename__ = "contact_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="new")


print("Creating waitlist tables in Neon database...")
print("=" * 60)

try:
    Base.metadata.create_all(bind=engine)
    
    print("✅ Tables created successfully!")
    print("\nNew tables:")
    print("  1. waitlist")
    print("  2. contact_messages")
    print("\n" + "=" * 60)
    print("Verify in Neon: https://console.neon.tech")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)