from sqlalchemy import text
from database import engine

def migrate_search_history():
    """Add new columns to search_history and create profile_views table"""
    
    print("\n" + "="*70)
    print("🔄 MIGRATING DATABASE FOR PHASE 7")
    print("="*70 + "\n")
    
    # 1. Add new columns to search_history
    print("1️⃣ Updating search_history table...")
    
    columns_to_add = [
        ("search_type", "VARCHAR DEFAULT 'general'"),
        ("keywords", "VARCHAR"),
        ("role", "VARCHAR"),
        ("location", "VARCHAR"),
        ("min_followers", "INTEGER"),
        ("min_repos", "INTEGER"),
        ("languages", "VARCHAR[]"),
        ("frameworks", "VARCHAR[]"),
        ("min_score", "INTEGER"),
        ("results_count", "INTEGER DEFAULT 0"),
        ("top_profile_id", "INTEGER REFERENCES profiles(id)"),
        ("last_recreated", "TIMESTAMP WITH TIME ZONE")
    ]
    
    with engine.connect() as conn:
        for column_name, column_type in columns_to_add:
            try:
                conn.execute(text(f"""
                    ALTER TABLE search_history 
                    ADD COLUMN IF NOT EXISTS {column_name} {column_type}
                """))
                conn.commit()
                print(f"   ✅ Added column: {column_name}")
            except Exception as e:
                conn.rollback()
                if "already exists" in str(e):
                    print(f"   ℹ️  Column already exists: {column_name}")
                else:
                    print(f"   ⚠️  Error adding {column_name}: {e}")
    
    # 2. Drop and recreate profile_views table (to ensure it's correct)
    print("\n2️⃣ Creating profile_views table...")
    
    with engine.connect() as conn:
        try:
            # Drop if exists
            conn.execute(text("DROP TABLE IF EXISTS profile_views CASCADE"))
            conn.commit()
            print("   ℹ️  Dropped existing profile_views table (if any)")
        except Exception as e:
            conn.rollback()
            print(f"   ⚠️  Error dropping table: {e}")
        
        try:
            # Create fresh table
            conn.execute(text("""
                CREATE TABLE profile_views (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    viewed_from VARCHAR,
                    search_history_id INTEGER REFERENCES search_history(id) ON DELETE SET NULL,
                    first_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    view_count INTEGER DEFAULT 1
                )
            """))
            conn.commit()
            print("   ✅ profile_views table created")
        except Exception as e:
            conn.rollback()
            if "already exists" in str(e):
                print("   ℹ️  profile_views table already exists")
            else:
                print(f"   ⚠️  Error creating table: {e}")
                return  # Stop if table creation fails
    
    # 3. Create indexes
    print("\n3️⃣ Creating indexes...")
    
    indexes = [
        ("idx_profile_views_user", "profile_views(user_id)"),
        ("idx_profile_views_profile", "profile_views(profile_id)"),
        ("idx_profile_views_viewed", "profile_views(last_viewed)"),
        ("idx_search_history_user_date", "search_history(user_id, search_date)"),
        ("idx_search_history_type", "search_history(search_type)")
    ]
    
    with engine.connect() as conn:
        for index_name, index_def in indexes:
            try:
                conn.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {index_name} ON {index_def}
                """))
                conn.commit()
                print(f"   ✅ Created index: {index_name}")
            except Exception as e:
                conn.rollback()
                if "already exists" in str(e):
                    print(f"   ℹ️  Index already exists: {index_name}")
                else:
                    print(f"   ⚠️  Error creating index: {e}")
    
    # 4. Verify tables exist
    print("\n4️⃣ Verifying tables...")
    
    with engine.connect() as conn:
        # Check search_history columns
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'search_history' 
            AND column_name IN ('search_type', 'keywords', 'role', 'location')
        """))
        cols = [row[0] for row in result]
        
        if len(cols) >= 4:
            print(f"   ✅ search_history has {len(cols)} new columns")
        else:
            print(f"   ⚠️  search_history missing some columns")
        
        # Check profile_views table
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'profile_views'
        """))
        cols = [row[0] for row in result]
        
        if len(cols) >= 7:
            print(f"   ✅ profile_views table has {len(cols)} columns")
        else:
            print(f"   ⚠️  profile_views table might be incomplete")
    
    print("\n" + "="*70)
    print("✅ DATABASE MIGRATION COMPLETE")
    print("="*70 + "\n")

if __name__ == "__main__":
    migrate_search_history()