from database import engine
from sqlalchemy import text

def update_columns():
    """Rename Stripe columns to Razorpay"""
    
    with engine.connect() as conn:
        print("Updating payment provider columns...")
        
        # Check if stripe columns exist
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('stripe_customer_id', 'stripe_subscription_id')
        """)
        
        result = conn.execute(check_query)
        existing_cols = [row[0] for row in result]
        
        if 'stripe_customer_id' in existing_cols:
            # Rename stripe_customer_id to razorpay_customer_id
            conn.execute(text("""
                ALTER TABLE users 
                RENAME COLUMN stripe_customer_id TO razorpay_customer_id
            """))
            print("✅ Renamed stripe_customer_id to razorpay_customer_id")
        
        if 'stripe_subscription_id' in existing_cols:
            # Rename stripe_subscription_id to razorpay_subscription_id
            conn.execute(text("""
                ALTER TABLE users 
                RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id
            """))
            print("✅ Renamed stripe_subscription_id to razorpay_subscription_id")
        
        # If columns don't exist, create them
        if not existing_cols:
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR
            """))
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR
            """))
            print("✅ Created razorpay columns")
        
        conn.commit()
        print("\n✅ Database updated successfully!")

if __name__ == "__main__":
    update_columns()