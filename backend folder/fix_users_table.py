from database import engine
from sqlalchemy import text, inspect

def fix_users_table():
    """Add all missing columns to users table"""
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        existing_columns = [col['name'] for col in inspector.get_columns('users')]
        
        print(f"📊 Current user columns: {len(existing_columns)}")
        print(f"   {existing_columns}\n")
        
        # Define all expected columns with their SQL types and defaults
        columns_to_add = [
            ("subscription_plan", "VARCHAR", "'free'"),
            ("billing_cycle", "VARCHAR", "'monthly'"),
            ("stripe_customer_id", "VARCHAR", "NULL"),
            ("stripe_subscription_id", "VARCHAR", "NULL"),
            ("subscription_status", "VARCHAR", "'trial'"),
            ("trial_start_date", "TIMESTAMP", "NULL"),
            ("trial_end_date", "TIMESTAMP", "NULL"),
            ("company_website", "VARCHAR", "NULL"),
            ("career_page_link", "VARCHAR", "NULL"),
            ("searches_used", "INTEGER", "0"),
            ("profile_views_used", "INTEGER", "0"),
            ("emails_sent_count", "INTEGER", "0"),
            ("usage_reset_date", "TIMESTAMP", "NULL")
        ]
        
        added = 0
        for col_name, col_type, default_value in columns_to_add:
            if col_name not in existing_columns:
                print(f"➕ Adding {col_name}...")
                sql = f"ALTER TABLE users ADD COLUMN {col_name} {col_type} DEFAULT {default_value}"
                conn.execute(text(sql))
                conn.commit()
                print(f"   ✅ Added {col_name}\n")
                added += 1
            else:
                print(f"   ✅ {col_name} already exists")
        
        if added == 0:
            print("\n✅ All columns already exist!")
        else:
            print(f"\n{'='*60}")
            print(f"✅ Successfully added {added} columns!")
            print(f"{'='*60}")

if __name__ == "__main__":
    fix_users_table()