from sqlalchemy import Column, Integer, String, DateTime, Text
from database import SessionLocal, Base
import csv
from datetime import datetime

class WaitlistEntry(Base):
    __tablename__ = "waitlist"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    company = Column(String)
    email = Column(String)
    submitted_at = Column(DateTime)

def export_to_csv():
    """Export waitlist to CSV file"""
    db = SessionLocal()
    
    try:
        entries = db.query(WaitlistEntry).order_by(WaitlistEntry.submitted_at.desc()).all()
        
        if not entries:
            print("❌ No waitlist entries to export")
            return
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"waitlist_export_{timestamp}.csv"
        
        # Write to CSV
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Header
            writer.writerow(['ID', 'Name', 'Company', 'Email', 'Submitted At'])
            
            # Data
            for entry in entries:
                writer.writerow([
                    entry.id,
                    entry.name,
                    entry.company,
                    entry.email,
                    entry.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if entry.submitted_at else ""
                ])
        
        print(f"✅ Exported {len(entries)} entries to {filename}")
        
    finally:
        db.close()

if __name__ == "__main__":
    export_to_csv()