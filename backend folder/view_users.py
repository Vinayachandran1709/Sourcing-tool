from sqlalchemy import Column, Integer, String, DateTime
from database import SessionLocal, Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    company = Column(String)
    created_at = Column(DateTime)

def view_users():
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        print("=" * 60)
        print("REGISTERED USERS")
        print("=" * 60)
        if not users:
            print("No users yet.")
        else:
            for i, user in enumerate(users, 1):
                print(f"\n{i}. {user.name}")
                print(f"   Email: {user.email}")
                print(f"   Company: {user.company}")
                print(f"   Joined: {user.created_at}")
        print(f"\nTotal Users: {len(users)}")
    finally:
        db.close()

if __name__ == "__main__":
    view_users()