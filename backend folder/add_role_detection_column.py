"""
Migration: Add detected_roles and roles_analyzed_at columns to profiles table.
"""

from sqlalchemy import create_engine, text
from database import DATABASE_URL

engine = create_engine(DATABASE_URL)

def run_migration():
    print("🔄 Adding role detection columns to profiles table...")
    
    with engine.connect() as conn:
        try:
            # Add detected_roles column (JSONB)
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN IF NOT EXISTS detected_roles JSONB;
            """))
            
            # Add roles_analyzed_at column
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN IF NOT EXISTS roles_analyzed_at TIMESTAMP WITH TIME ZONE;
            """))
            
            conn.commit()
            print("✅ Migration complete!")
            print("   - Added 'detected_roles' column (JSONB)")
            print("   - Added 'roles_analyzed_at' column (TIMESTAMP)")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    run_migration()