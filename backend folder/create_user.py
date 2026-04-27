"""
Utility script to create a user account directly in the database.
Run from the backend folder:
    python create_user.py <name> <email> <company> <password>

Example:
    python create_user.py "Vinay" "imvinayachandran@gmail.com" "TalentBox" "Password1"
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from models import User
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(password)


def create_or_show_user(name: str, email: str, company: str, password: str):
    db = SessionLocal()
    try:
        email = email.strip().lower()
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User already exists → ID={existing.id}, email={existing.email}")
            return

        user = User(
            name=name.strip(),
            email=email,
            company=company.strip(),
            password_hash=hash_password(password),
            trial_end_date=datetime.now(timezone.utc) + timedelta(days=14),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"User created: ID={user.id}, email={user.email}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)

    _, name, email, company, password = sys.argv
    create_or_show_user(name, email, company, password)
