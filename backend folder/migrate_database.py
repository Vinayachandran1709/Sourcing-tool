from sqlalchemy import text
from database import engine
import sys

def check_column_exists(table_name, column_name):
    """Check if a column already exists in table"""
    query = text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = :table_name 
        AND column_name = :column_name
    """)
    
    with engine.connect() as conn:
        result = conn.execute(
            query, 
            {"table_name": table_name, "column_name": column_name}
        )
        return result.fetchone() is not None

def add_new_columns():
    """Add new columns to profiles table"""
    
    print("Starting database migration...")
    print("=" * 60)
    
    # List of columns to add
    columns_to_add = [
        {
            "name": "languages_data",
            "type": "JSON",
            "description": "Language distribution data"
        },
        {
            "name": "top_repos",
            "type": "JSON",
            "description": "Top 5 repositories"
        },
        {
            "name": "last_active_date",
            "type": "TIMESTAMP",
            "description": "Last activity date"
        },
        {
            "name": "total_stars",
            "type": "INTEGER DEFAULT 0",
            "description": "Total stars across all repos"
        },
        {
            "name": "developer_score",
            "type": "INTEGER DEFAULT 0",
            "description": "Calculated developer score (0-100)"
        }
    ]
    
    with engine.connect() as conn:
        for column in columns_to_add:
            column_name = column["name"]
            column_type = column["type"]
            description = column["description"]
            
            # Check if column already exists
            if check_column_exists("profiles", column_name):
                print(f"⏭️  Column '{column_name}' already exists, skipping...")
                continue
            
            # Add the column
            try:
                alter_query = text(
                    f"ALTER TABLE profiles ADD COLUMN {column_name} {column_type}"
                )
                conn.execute(alter_query)
                conn.commit()
                print(f"✅ Added column: {column_name} ({description})")
            
            except Exception as e:
                print(f"❌ Error adding column '{column_name}': {e}")
                conn.rollback()
                return False
    
    print("=" * 60)
    print("✅ Migration completed successfully!")
    print("\nNew columns added:")
    for column in columns_to_add:
        print(f"  - {column['name']}: {column['description']}")
    
    return True

def verify_migration():
    """Verify all new columns were added"""
    print("\n" + "=" * 60)
    print("Verifying migration...")
    
    required_columns = [
        "languages_data",
        "top_repos", 
        "last_active_date",
        "total_stars",
        "developer_score"
    ]
    
    all_exist = True
    for column in required_columns:
        exists = check_column_exists("profiles", column)
        status = "✅" if exists else "❌"
        print(f"{status} {column}: {'Present' if exists else 'MISSING'}")
        if not exists:
            all_exist = False
    
    print("=" * 60)
    
    if all_exist:
        print("✅ All columns verified successfully!")
        return True
    else:
        print("❌ Some columns are missing. Migration may have failed.")
        return False

def main():
    """Run migration"""
    print("Database Migration Script")
    print("This will add new columns to the profiles table")
    print()
    
    # Ask for confirmation
    response = input("Continue with migration? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Migration cancelled.")
        sys.exit(0)
    
    # Run migration
    success = add_new_columns()
    
    if not success:
        print("\n❌ Migration failed. Check errors above.")
        sys.exit(1)
    
    # Verify migration
    verified = verify_migration()
    
    if verified:
        print("\n🎉 Migration complete! Your database is ready.")
        print("\nNext steps:")
        print("1. Update github_service.py to fetch new data")
        print("2. Test with: python test_github_service.py")
    else:
        print("\n⚠️  Migration completed but verification failed.")
        print("Check your database manually.")

if __name__ == "__main__":
    main()