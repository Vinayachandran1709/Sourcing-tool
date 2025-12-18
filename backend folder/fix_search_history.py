from sqlalchemy import text
from database import engine

def fix_search_history():
    """Fix missing columns in search_history table"""
    
    print("\n" + "="*70)
    print("🔧 FIXING SEARCH_HISTORY TABLE")
    print("="*70 + "\n")
    
    with engine.connect() as conn:
        
        # Check what columns exist
        print("1️⃣ Checking existing columns...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'search_history'
            ORDER BY ordinal_position
        """))
        
        existing_columns = [row[0] for row in result]
        print(f"   Existing columns: {', '.join(existing_columns)}")
        
        # Add missing columns
        print("\n2️⃣ Adding missing columns...")
        
        required_columns = [
            ("user_id", "INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE"),
            ("query", "VARCHAR"),
            ("search_date", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        ]
        
        for column_name, column_def in required_columns:
            if column_name not in existing_columns:
                try:
                    # Special handling for NOT NULL columns
                    if "NOT NULL" in column_def and column_name == "user_id":
                        # First add as nullable
                        conn.execute(text(f"""
                            ALTER TABLE search_history 
                            ADD COLUMN {column_name} INTEGER REFERENCES users(id) ON DELETE CASCADE
                        """))
                        conn.commit()
                        
                        # Set default value for existing rows (user_id = 1)
                        conn.execute(text("""
                            UPDATE search_history 
                            SET user_id = 1 
                            WHERE user_id IS NULL
                        """))
                        conn.commit()
                        
                        # Now make it NOT NULL
                        conn.execute(text(f"""
                            ALTER TABLE search_history 
                            ALTER COLUMN {column_name} SET NOT NULL
                        """))
                        conn.commit()
                    else:
                        conn.execute(text(f"""
                            ALTER TABLE search_history 
                            ADD COLUMN IF NOT EXISTS {column_name} {column_def}
                        """))
                        conn.commit()
                    
                    print(f"   ✅ Added column: {column_name}")
                except Exception as e:
                    conn.rollback()
                    print(f"   ⚠️  Error adding {column_name}: {e}")
            else:
                print(f"   ℹ️  Column exists: {column_name}")
        
        # Now create the missing index
        print("\n3️⃣ Creating missing index...")
        
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_search_history_user_date 
                ON search_history(user_id, search_date)
            """))
            conn.commit()
            print("   ✅ Created index: idx_search_history_user_date")
        except Exception as e:
            conn.rollback()
            if "already exists" in str(e):
                print("   ℹ️  Index already exists")
            else:
                print(f"   ⚠️  Error creating index: {e}")
        
        # Verify final state
        print("\n4️⃣ Verifying final state...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'search_history'
            ORDER BY ordinal_position
        """))
        
        final_columns = [row[0] for row in result]
        print(f"   Final columns ({len(final_columns)}): {', '.join(final_columns)}")
        
        # Check indexes
        result = conn.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'search_history'
        """))
        
        indexes = [row[0] for row in result]
        print(f"   Indexes ({len(indexes)}): {', '.join(indexes)}")
    
    print("\n" + "="*70)
    print("✅ SEARCH_HISTORY TABLE FIXED")
    print("="*70 + "\n")

if __name__ == "__main__":
    fix_search_history()