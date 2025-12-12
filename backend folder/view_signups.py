import psycopg2
from datetime import datetime

# Your Neon connection string
DATABASE_URL = 'postgresql://neondb_owner:npg_s70WJHfiCmOe@ep-odd-term-a43froyn-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

def view_all_signups():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n" + "="*60)
    print("WAITLIST SIGNUPS")
    print("="*60)
    
    cursor.execute("SELECT * FROM waitlist ORDER BY submitted_at DESC")
    waitlist = cursor.fetchall()
    
    if waitlist:
        for row in waitlist:
            print(f"\nID: {row[0]}")
            print(f"Email: {row[1]}")
            print(f"Company: {row[2] if len(row) > 2 else 'N/A'}")
            print(f"Date: {row[-1] if row[-1] else 'N/A'}")
            print("-"*40)
    else:
        print("No waitlist signups yet.")
    
    print(f"\nTotal Waitlist: {len(waitlist)}")
    
    print("\n" + "="*60)
    print("CONTACT FORM SUBMISSIONS")
    print("="*60)
    
    cursor.execute("SELECT * FROM contact_messages ORDER BY submitted_at DESC")
    contacts = cursor.fetchall()
    
    if contacts:
        for row in contacts:
            print(f"\nID: {row[0]}")
            print(f"Name: {row[1]}")
            print(f"Email: {row[2]}")
            print(f"Company: {row[3] if len(row) > 3 else 'N/A'}")
            print(f"Message: {row[4] if len(row) > 4 else 'N/A'}")
            print(f"Date: {row[-1] if row[-1] else 'N/A'}")
            print("-"*40)
    else:
        print("No contact submissions yet.")
    
    print(f"\nTotal Contacts: {len(contacts)}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    view_all_signups()