"""
Backfill detected_roles for existing profiles.
Re-runs role detection on all existing profiles to populate the detected_roles array.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import GithubDeveloper
from role_detection_service import detect_all_roles

def backfill_roles():
    """Update all existing profiles with multi-role detection."""
    db = SessionLocal()

    try:
        # Get all profiles
        total = db.query(GithubDeveloper).count()
        print(f"🔄 Backfilling roles for {total:,} profiles...")

        batch_size = 500
        updated = 0

        # Process in batches
        offset = 0
        while True:
            profiles = db.query(GithubDeveloper).offset(offset).limit(batch_size).all()

            if not profiles:
                break

            for profile in profiles:
                # Re-detect roles
                languages = profile.primary_languages or []
                bio = profile.bio or ""

                primary_role, all_roles = detect_all_roles(bio, languages)

                # Update profile
                profile.detected_role = primary_role
                profile.detected_roles = all_roles
                updated += 1

            db.commit()
            print(f"   Updated {updated:,} / {total:,} profiles")

            offset += batch_size

        print(f"\n✅ Backfill complete! Updated {updated:,} profiles")

        # Show new distribution
        print("\n📊 New Role Distribution:")
        from sqlalchemy import func

        # Count by detected_role (primary)
        results = db.query(
            GithubDeveloper.detected_role,
            func.count(GithubDeveloper.id)
        ).group_by(GithubDeveloper.detected_role).order_by(func.count(GithubDeveloper.id).desc()).all()

        for role, count in results:
            print(f"   {role or 'Unknown':25} : {count:,}")

    finally:
        db.close()

if __name__ == "__main__":
    backfill_roles()
