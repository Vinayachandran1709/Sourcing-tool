from database import SessionLocal
from models import User
from razorpay_service import RazorpayService
import os

def test_razorpay_integration():
    """Test Razorpay integration"""
    db = SessionLocal()
    user_id = 1
    
    print("\n" + "="*60)
    print("Testing Razorpay Integration")
    print("="*60 + "\n")
    
    # Test 1: Check Razorpay configuration
    print("1️⃣ Checking Razorpay configuration...")
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    
    if key_id and key_id.startswith("rzp_test_"):
        print(f"   ✅ Razorpay Key ID configured (Test Mode)")
    elif key_id and key_id.startswith("rzp_live_"):
        print(f"   ⚠️  Razorpay Key ID is LIVE mode")
    else:
        print(f"   ❌ Razorpay Key ID not configured")
    
    if key_secret:
        print(f"   ✅ Razorpay Key Secret configured")
    else:
        print(f"   ❌ Razorpay Key Secret not configured")
    print()
    
    # Test 2: Check user
    print("2️⃣ Checking user...")
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        print(f"   ✅ User found: {user.email}")
        print(f"   Current plan: {user.plan}")
        print(f"   Status: {user.subscription_status}")
    else:
        print(f"   ❌ User {user_id} not found")
        db.close()
        return
    print()
    
    # Test 3: Initialize Razorpay service
    print("3️⃣ Testing Razorpay service initialization...")
    try:
        razorpay_service = RazorpayService()
        print(f"   ✅ Razorpay service initialized successfully")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        db.close()
        return
    print()
    
    # Test 4: Check plan IDs
    print("4️⃣ Checking plan IDs...")
    plan_ids = RazorpayService.PLAN_IDS
    for key, plan_id in plan_ids.items():
        print(f"   {key}: {plan_id}")
    print()
    
    print("="*60)
    print("✅ Configuration test completed!")
    print("="*60)
    print()
    print("📝 To test subscription creation:")
    print("   1. Make sure you're in Test Mode in Razorpay Dashboard")
    print("   2. Use API endpoint: POST /api/razorpay/create-subscription")
    print("   3. Complete payment using test card: 4111 1111 1111 1111")
    print("   4. Check webhook events in Razorpay Dashboard")
    print()
    
    db.close()

if __name__ == "__main__":
    test_razorpay_integration()