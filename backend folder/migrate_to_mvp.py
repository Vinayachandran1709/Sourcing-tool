from sqlalchemy import text
from database import engine
import sys

def check_table_exists(table_name):
    """Check if table exists"""
    query = text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = :table_name
        )
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"table_name": table_name})
        return result.fetchone()[0]

def add_column_if_not_exists(table_name, column_name, column_def):
    """Add column if it doesn't exist"""
    check_query = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = :table_name 
        AND column_name = :column_name
    """)
    
    with engine.connect() as conn:
        result = conn.execute(check_query, {"table_name": table_name, "column_name": column_name})
        exists = result.fetchone() is not None
        
        if not exists:
            alter_query = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}")
            conn.execute(alter_query)
            conn.commit()
            print(f"✅ Added column: {table_name}.{column_name}")
            return True
        else:
            print(f"⏭️  Column already exists: {table_name}.{column_name}")
            return False

def migrate_database():
    """Run complete migration"""
    print("=" * 80)
    print("TALENTBOX MVP DATABASE MIGRATION")
    print("=" * 80)
    print()
    
    # Step 1: Update users table
    print("STEP 1: Updating users table...")
    print("-" * 80)
    
    user_columns = [
        ("plan", "VARCHAR DEFAULT 'free'"),
        ("billing_cycle", "VARCHAR DEFAULT 'monthly'"),
        ("stripe_customer_id", "VARCHAR"),
        ("stripe_subscription_id", "VARCHAR"),
        ("subscription_status", "VARCHAR DEFAULT 'trial'"),
        ("trial_start_date", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
        ("trial_end_date", "TIMESTAMP WITH TIME ZONE"),
        ("subscription_start_date", "TIMESTAMP WITH TIME ZONE"),
        ("next_billing_date", "TIMESTAMP WITH TIME ZONE"),
        ("company_website", "VARCHAR"),
        ("career_page_link", "VARCHAR"),
        ("usage_searches", "INTEGER DEFAULT 0"),
        ("usage_profile_views", "INTEGER DEFAULT 0"),
        ("usage_emails_sent", "INTEGER DEFAULT 0"),
        ("usage_reset_date", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"),
    ]
    
    for col_name, col_def in user_columns:
        add_column_if_not_exists("users", col_name, col_def)
    
    print()
    
    # Step 2: Update profiles table
    print("STEP 2: Updating profiles table...")
    print("-" * 80)
    
    profile_columns = [
        ("phone_number", "VARCHAR"),
        ("linkedin_url", "VARCHAR"),
        ("twitter_url", "VARCHAR"),
        ("personal_website", "VARCHAR"),
    ]
    
    for col_name, col_def in profile_columns:
        add_column_if_not_exists("profiles", col_name, col_def)
    
    print()
    
    # Step 3: Create new tables
    print("STEP 3: Creating new tables...")
    print("-" * 80)
    
    tables_to_create = [
        ("saved_lists", """
            CREATE TABLE IF NOT EXISTS saved_lists (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """),
        ("saved_list_profiles", """
            CREATE TABLE IF NOT EXISTS saved_list_profiles (
                id SERIAL PRIMARY KEY,
                list_id INTEGER NOT NULL REFERENCES saved_lists(id) ON DELETE CASCADE,
                profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                notes TEXT,
                UNIQUE(list_id, profile_id)
            )
        """),
        ("email_templates", """
            CREATE TABLE IF NOT EXISTS email_templates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR NOT NULL,
                template_type VARCHAR DEFAULT 'initial',
                subject VARCHAR NOT NULL,
                body TEXT NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """),
        ("email_campaigns", """
            CREATE TABLE IF NOT EXISTS email_campaigns (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                campaign_name VARCHAR,
                enable_followups BOOLEAN DEFAULT TRUE,
                initial_sent_at TIMESTAMP WITH TIME ZONE,
                followup1_sent_at TIMESTAMP WITH TIME ZONE,
                followup2_sent_at TIMESTAMP WITH TIME ZONE,
                replied_at TIMESTAMP WITH TIME ZONE,
                reply_content TEXT,
                status VARCHAR DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """),
        ("usage_logs", """
            CREATE TABLE IF NOT EXISTS usage_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action_type VARCHAR NOT NULL,
                details JSON,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """),
    ]
    
    with engine.connect() as conn:
        for table_name, create_sql in tables_to_create:
            if not check_table_exists(table_name):
                conn.execute(text(create_sql))
                conn.commit()
                print(f"✅ Created table: {table_name}")
            else:
                print(f"⏭️  Table already exists: {table_name}")
    
    print()
    print("=" * 80)
    print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    print()
    print("New database structure:")
    print("  📊 Users: Enhanced with subscription and usage tracking")
    print("  📋 Saved Lists: New table for organizing candidates")
    print("  📧 Email Templates: Store reusable email templates")
    print("  📨 Email Campaigns: Track sequences and responses")
    print("  📈 Usage Logs: Detailed analytics logging")
    print()

if __name__ == "__main__":
    try:
        migrate_database()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)