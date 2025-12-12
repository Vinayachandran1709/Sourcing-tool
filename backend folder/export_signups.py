import psycopg2
import csv
from datetime import datetime

DATABASE_URL = "postgresql://your-neon-connection-string"

def export_to_csv():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Export Waitlist
    cursor.execute("SELECT * FROM waitlist ORDER BY submitted_at DESC")
    waitlist = cursor.fetchall()
    
    with open('waitlist_export.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ID', 'Email', 'Company', 'Created At'])
        for row in waitlist:
            writer.writerow(row)
    
    print(f"Exported {len(waitlist)} waitlist entries to waitlist_export.csv")
    
    # Export Contact Submissions
    cursor.execute("SELECT * FROM contact_messages ORDER BY submitted_at DESC")
    contacts = cursor.fetchall()
    
    with open('contacts_export.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['ID', 'Name', 'Email', 'Company', 'Message', 'Created At'])
        for row in contacts:
            writer.writerow(row)
    
    print(f"Exported {len(contacts)} contact entries to contacts_export.csv")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    export_to_csv()