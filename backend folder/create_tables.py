from database import engine, Base
from models import Profile, OutreachLog

print("Creating tables in Neon PostgreSQL database...")
print("=" * 50)

try:
    # Create all tables defined in models
    Base.metadata.create_all(bind=engine)
    
    print("✅ Tables created successfully!")
    print("\nTables created:")
    print("  1. profiles")
    print("  2. outreach_logs")
    print("\n" + "=" * 50)
    print("You can now verify tables in Neon dashboard:")
    print("  1. Go to https://console.neon.tech")
    print("  2. Select your project")
    print("  3. Click 'SQL Editor'")
    print("  4. Run: SELECT * FROM profiles;")
    
except Exception as e:
    print("❌ Error creating tables!")
    print(f"Error message: {e}")
    print("\nTroubleshooting steps:")
    print("  1. Check DATABASE_URL in .env file")
    print("  2. Make sure Neon project is active")
    print("  3. Verify internet connection")
