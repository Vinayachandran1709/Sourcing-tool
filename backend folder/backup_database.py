from database import engine
from models import Profile
from sqlalchemy.orm import Session
import json
from datetime import datetime

def backup_profiles():
    """Backup all profiles to JSON file"""
    
    # Create database session
    session = Session(bind=engine)
    
    try:
        # Get all profiles
        profiles = session.query(Profile).all()
        
        print(f"Found {len(profiles)} profiles to backup")
        
        # Convert to list of dictionaries
        backup_data = []
        for profile in profiles:
            profile_dict = {
                'id': profile.id,
                'github_username': profile.github_username,
                'name': profile.name,
                'email': profile.email,
                'location': profile.location,
                'bio': profile.bio,
                'public_repos': profile.public_repos,
                'primary_language': profile.primary_language,
                'contributions_last_year': profile.contributions_last_year,
                'portfolio_url': profile.portfolio_url,
                'avatar_url': profile.avatar_url,
                'selected': profile.selected,
                'last_fetched': profile.last_fetched.isoformat() if profile.last_fetched else None
            }
            backup_data.append(profile_dict)
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_profiles_{timestamp}.json"
        
        # Save to file
        with open(filename, 'w') as f:
            json.dump(backup_data, f, indent=2)
        
        print(f"✅ Backup saved to {filename}")
        
    except Exception as e:
        print(f"❌ Backup failed: {e}")
    
    finally:
        session.close()

if __name__ == "__main__":
    backup_profiles()