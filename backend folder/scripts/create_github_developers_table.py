import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models import Base, GithubDeveloper

def create_table():
    """Create github_developers table if it doesn't exist."""
    print("Creating github_developers table...")

    # Create only the GithubDeveloper table
    GithubDeveloper.__table__.create(engine, checkfirst=True)

    print("✅ github_developers table created successfully!")

if __name__ == "__main__":
    create_table()
