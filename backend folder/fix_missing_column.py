from database import engine, Base
from sqlalchemy import text, inspect

def add_missing_columns():
    """Add any missing columns to profiles table"""
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        existing_columns = [col['name'] for col in inspector.get_columns('profiles')]
        
        print(f"📊 Existing columns in profiles table: {len(existing_columns)}")
        print(f"   {existing_columns}\n")
        
        # Check and add cached_at
        if 'cached_at' not in existing_columns:
            print("➕ Adding cached_at column...")
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN cached_at TIMESTAMP
            """))
            conn.commit()
            print("   ✅ Added cached_at\n")
        else:
            print("   ✅ cached_at already exists\n")
        
        # Check and add phone_number
        if 'phone_number' not in existing_columns:
            print("➕ Adding phone_number column...")
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN phone_number VARCHAR
            """))
            conn.commit()
            print("   ✅ Added phone_number\n")
        else:
            print("   ✅ phone_number already exists\n")
        
        # Check and add linkedin_url
        if 'linkedin_url' not in existing_columns:
            print("➕ Adding linkedin_url column...")
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN linkedin_url VARCHAR
            """))
            conn.commit()
            print("   ✅ Added linkedin_url\n")
        else:
            print("   ✅ linkedin_url already exists\n")
        
        # Check and add twitter_url
        if 'twitter_url' not in existing_columns:
            print("➕ Adding twitter_url column...")
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN twitter_url VARCHAR
            """))
            conn.commit()
            print("   ✅ Added twitter_url\n")
        else:
            print("   ✅ twitter_url already exists\n")
        
        # Check and add personal_website
        if 'personal_website' not in existing_columns:
            print("➕ Adding personal_website column...")
            conn.execute(text("""
                ALTER TABLE profiles 
                ADD COLUMN personal_website VARCHAR
            """))
            conn.commit()
            print("   ✅ Added personal_website\n")
        else:
            print("   ✅ personal_website already exists\n")
        
        print("=" * 60)
        print("✅ ALL MISSING COLUMNS ADDED!")
        print("=" * 60)

if __name__ == "__main__":
    add_missing_columns()