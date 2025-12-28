"""
Reset Usage Script - Clears search usage for testing
Run this from backend folder: python reset_usage.py
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in .env")
    exit(1)

# Connect to database
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # Get user ID (assuming user 12 from your logs)
    user_id = 12
    
    # Check current usage
    result = db.execute(
        text("SELECT COUNT(*) FROM usage_logs WHERE user_id = :user_id AND action_type = 'search'"),
        {"user_id": user_id}
    )
    current_count = result.scalar()
    
    print(f"📊 Current search usage for user {user_id}: {current_count}")
    
    # Delete all search usage logs for this user
    db.execute(
        text("DELETE FROM usage_logs WHERE user_id = :user_id AND action_type = 'search'"),
        {"user_id": user_id}
    )
    db.commit()
    
    print(f"✅ Deleted {current_count} search usage records")
    print(f"✅ User {user_id} can now search again!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()

print("\n🎉 Usage reset complete! You can now test searches.")






























































