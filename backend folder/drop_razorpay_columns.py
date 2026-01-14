import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in .env")
    sys.exit(1)

# Remove channel_binding parameter if present
if "&channel_binding=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("&channel_binding=require", "")
    print("Note: Removed channel_binding parameter from DATABASE_URL")

print(f"Connecting to database...")

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("\n1. Checking current columns in users table...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY column_name;
        """))
        columns = [row[0] for row in result]
        print(f"   Found {len(columns)} columns")
        
        razorpay_cols = [col for col in columns if 'razorpay' in col.lower()]
        if razorpay_cols:
            print(f"   Razorpay columns found: {razorpay_cols}")
        else:
            print(f"   No Razorpay columns found - already clean!")
        
        print("\n2. Dropping razorpay columns (if they exist)...")
        
        # Drop razorpay_customer_id
        if 'razorpay_customer_id' in columns:
            conn.execute(text("ALTER TABLE users DROP COLUMN razorpay_customer_id CASCADE;"))
            conn.commit()
            print("   ✅ Dropped razorpay_customer_id")
        else:
            print("   ⏭️  razorpay_customer_id not found (already removed)")
            
        # Drop razorpay_subscription_id
        if 'razorpay_subscription_id' in columns:
            conn.execute(text("ALTER TABLE users DROP COLUMN razorpay_subscription_id CASCADE;"))
            conn.commit()
            print("   ✅ Dropped razorpay_subscription_id")
        else:
            print("   ⏭️  razorpay_subscription_id not found (already removed)")
        
        print("\n3. Verifying final schema...")
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY column_name;
        """))
        columns = [row[0] for row in result]
        print(f"   Final columns ({len(columns)}): {', '.join(columns)}")
        
        # Verify no razorpay columns remain
        razorpay_cols = [col for col in columns if 'razorpay' in col.lower()]
        if razorpay_cols:
            print(f"\n   ⚠️  WARNING: Razorpay columns still present: {razorpay_cols}")
        else:
            print(f"\n   ✅ No Razorpay columns - schema is clean!")
        
        print("\n✅ Migration completed successfully!")
        
except Exception as e:
    print(f"\n❌ Migration failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)