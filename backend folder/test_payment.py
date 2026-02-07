import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_razorpay_config():
    """Test Razorpay credentials are configured"""
    print("=" * 50)
    print("TalentBox Payment Configuration Test")
    print("=" * 50)
    
    # Check environment variables
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    
    print("\n1. Environment Variables:")
    print(f"   RAZORPAY_KEY_ID: {'✅ Set' if key_id else '❌ Missing'}")
    if key_id:
        print(f"      → {key_id[:12]}{'*' * (len(key_id) - 12)}")
        if key_id.startswith("rzp_test"):
            print("      ⚠️  Using TEST mode keys")
        elif key_id.startswith("rzp_live"):
            print("      ✅ Using LIVE mode keys")
    
    print(f"   RAZORPAY_KEY_SECRET: {'✅ Set' if key_secret else '❌ Missing'}")
    if key_secret:
        print(f"      → {key_secret[:4]}{'*' * 20}")
    
    print(f"   RAZORPAY_WEBHOOK_SECRET: {'✅ Set' if webhook_secret else '❌ Missing'}")
    if webhook_secret:
        print(f"      → {webhook_secret[:4]}{'*' * 20}")
    
    if not key_id or not key_secret:
        print("\n❌ Cannot proceed without Razorpay credentials!")
        print("   Add to your .env file:")
        print("   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx")
        print("   RAZORPAY_KEY_SECRET=your_secret_here")
        return False
    
    # Test Razorpay connection
    print("\n2. Testing Razorpay Connection:")
    try:
        import razorpay
        client = razorpay.Client(auth=(key_id, key_secret))
        
        # Try to create a test order
        test_order = client.order.create({
            "amount": 100,  # 1 INR in paise
            "currency": "INR",
            "receipt": "test_receipt_001",
            "notes": {"test": "true"}
        })
        
        if test_order.get("id"):
            print(f"   ✅ Successfully created test order: {test_order['id']}")
            print(f"   ✅ Razorpay connection working!")
        else:
            print(f"   ❌ Unexpected response: {test_order}")
            return False
            
    except razorpay.errors.BadRequestError as e:
        print(f"   ❌ Bad Request: {e}")
        return False
    except razorpay.errors.ServerError as e:
        print(f"   ❌ Server Error: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        print("   Make sure razorpay is installed: pip install razorpay")
        return False
    
    # Test database connection
    print("\n3. Testing Database Connection:")
    try:
        from database import get_db_connection
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users")
            count = cur.fetchone()[0]
            print(f"   ✅ Database connected. Users count: {count}")
        conn.close()
    except Exception as e:
        print(f"   ❌ Database error: {e}")
        return False
    
    # Check if payment tables exist
    print("\n4. Checking Payment Tables:")
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Check payment_history table
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'payment_history'
                )
            """)
            has_payment_history = cur.fetchone()[0]
            print(f"   payment_history table: {'✅ Exists' if has_payment_history else '❌ Missing - Run migration!'}")
            
            # Check subscription_events table
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'subscription_events'
                )
            """)
            has_subscription_events = cur.fetchone()[0]
            print(f"   subscription_events table: {'✅ Exists' if has_subscription_events else '❌ Missing - Run migration!'}")
            
            # Check users table has Razorpay columns
            cur.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'razorpay_customer_id'
            """)
            has_razorpay_col = cur.fetchone()
            print(f"   users.razorpay_customer_id: {'✅ Exists' if has_razorpay_col else '❌ Missing - Run migration!'}")
            
        conn.close()
        
        if not has_payment_history or not has_subscription_events or not has_razorpay_col:
            print("\n   ⚠️  Run the payment migration:")
            print("   psql $DATABASE_URL -f migrations/migration_005_payments.sql")
            
    except Exception as e:
        print(f"   ❌ Error checking tables: {e}")
    
    print("\n" + "=" * 50)
    print("Configuration test complete!")
    print("=" * 50)
    return True

if __name__ == "__main__":
    test_razorpay_config()