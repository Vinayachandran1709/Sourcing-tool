from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import Session
from database import SessionLocal, Base
from datetime import datetime

# Define model
class WaitlistEntry(Base):
    __tablename__ = "waitlist"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    company = Column(String)
    email = Column(String)
    submitted_at = Column(DateTime)

class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    message = Column(Text)
    submitted_at = Column(DateTime)
    status = Column(String)

def view_data():
    """View all waitlist and contact data"""
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("📋 WAITLIST ENTRIES")
        print("=" * 80)
        
        waitlist = db.query(WaitlistEntry).order_by(WaitlistEntry.submitted_at.desc()).all()
        
        if not waitlist:
            print("No entries yet.")
        else:
            for i, entry in enumerate(waitlist, 1):
                print(f"\n{i}. {entry.name} ({entry.company})")
                print(f"   Email: {entry.email}")
                print(f"   Date: {entry.submitted_at}")
        
        print("\n" + "=" * 80)
        print("💬 CONTACT MESSAGES")
        print("=" * 80)
        
        messages = db.query(ContactMessage).order_by(ContactMessage.submitted_at.desc()).all()
        
        if not messages:
            print("No messages yet.")
        else:
            for i, msg in enumerate(messages, 1):
                print(f"\n{i}. {msg.name} ({msg.email})")
                print(f"   Message: {msg.message[:60]}...")
                print(f"   Date: {msg.submitted_at}")
                print(f"   Status: {msg.status}")
        
        print("\n" + "=" * 80)
        print(f"Total Waitlist: {len(waitlist)}")
        print(f"Total Messages: {len(messages)}")
        print("=" * 80)
        
    finally:
        db.close()

if __name__ == "__main__":
    view_data()