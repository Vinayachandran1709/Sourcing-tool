"""
Add detected_roles column to github_developers table.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

def add_column():
    """Add detected_roles array column if it doesn't exist."""
    print("Adding detected_roles column...")

    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'github_developers'
            AND column_name = 'detected_roles'
        """))

        if result.fetchone() is None:
            # Add the column
            conn.execute(text("""
                ALTER TABLE github_developers
                ADD COLUMN detected_roles VARCHAR[] DEFAULT NULL
            """))
            conn.commit()
            print("✅ detected_roles column added!")
        else:
            print("✅ detected_roles column already exists")

        # Create GIN index for array searching
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_github_developers_detected_roles
            ON github_developers USING GIN (detected_roles)
        """))
        conn.commit()
        print("✅ GIN index created for detected_roles")

if __name__ == "__main__":
    add_column()
