from database import SessionLocal
from models import Profile, User
from config import GITHUB_TOKEN

db = SessionLocal()

print("=" * 60)
print("🔍 TALENTBOX DATABASE CHECK")
print("=" * 60)

# Check GitHub Token
print(f"\n1️⃣ GITHUB TOKEN: {GITHUB_TOKEN[:10]}..." if GITHUB_TOKEN else "❌ MISSING")

# Check Users
user_count = db.query(User).count()
print(f"\n2️⃣ USERS IN DATABASE: {user_count}")
if user_count > 0:
    users = db.query(User).limit(3).all()
    for u in users:
        print(f"   - {u.email} (ID: {u.id})")

# Check Profiles
profile_count = db.query(Profile).count()
print(f"\n3️⃣ GITHUB PROFILES: {profile_count}")

if profile_count > 0:
    print("\n   📋 Sample profiles:")
    profiles = db.query(Profile).limit(10).all()
    for p in profiles:
        print(f"   - {p.github_username} | {p.name or 'No name'} | Score: {p.developer_score}")
        
    # Check by location
    bangalore = db.query(Profile).filter(
        Profile.location.ilike('%bangalore%')
    ).count()
    print(f"\n   🌍 Profiles with 'Bangalore' in location: {bangalore}")
    
    # Check by language
    python_devs = db.query(Profile).filter(
        Profile.language.ilike('%python%')
    ).count()
    print(f"   🐍 Profiles with Python: {python_devs}")
else:
    print("   ⚠️ Database is EMPTY - no profiles cached yet")

db.close()
print("\n" + "=" * 60)