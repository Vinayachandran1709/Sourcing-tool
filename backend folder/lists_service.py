from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import SavedList, SavedListProfile, Profile, User
from fastapi import HTTPException
from datetime import datetime, timezone


class ListsService:
    """Handle saved lists operations with usage limits"""
    
    @staticmethod
    def check_list_limits(db: Session, user_id: int) -> Dict:
        """Check if user can create more lists"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count current lists
        current_lists = db.query(func.count(SavedList.id)).filter(
            SavedList.user_id == user_id
        ).scalar()
        
        # Free trial: 1 list max
        if user.plan in ("free", "free_trial"):
            if current_lists >= 1:
                return {
                    "can_create": False,
                    "reason": "Free trial allows only 1 saved list. Upgrade to Starter plan for unlimited lists.",
                    "current": current_lists,
                    "limit": 1
                }

        return {
            "can_create": True,
            "current": current_lists,
            "limit": "unlimited" if user.plan not in ("free", "free_trial") else 1
        }
    
    @staticmethod
    def check_profile_limit(db: Session, list_id: int) -> Dict:
        """Check if list can accept more profiles"""
        saved_list = db.query(SavedList).filter(SavedList.id == list_id).first()
        if not saved_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        user = db.query(User).filter(User.id == saved_list.user_id).first()
        
        # Count profiles in this list
        profile_count = db.query(func.count(SavedListProfile.id)).filter(
            SavedListProfile.list_id == list_id
        ).scalar()
        
        # Free trial: 25 profiles max per list
        if user.plan in ("free", "free_trial"):
            if profile_count >= 25:
                return {
                    "can_add": False,
                    "reason": "Free trial allows max 25 profiles per list. Upgrade to Starter for unlimited.",
                    "current": profile_count,
                    "limit": 25
                }

        return {
            "can_add": True,
            "current": profile_count,
            "limit": "unlimited" if user.plan not in ("free", "free_trial") else 25
        }
    
    @staticmethod
    def create_list(db: Session, user_id: int, name: str, description: Optional[str] = None) -> SavedList:
        """Create a new saved list"""
        # Check limits
        limit_check = ListsService.check_list_limits(db, user_id)
        if not limit_check["can_create"]:
            raise HTTPException(status_code=403, detail=limit_check["reason"])
        
        # Create list
        new_list = SavedList(
            user_id=user_id,
            name=name,
            description=description
        )
        db.add(new_list)
        db.commit()
        db.refresh(new_list)
        
        return new_list
    
    @staticmethod
    def get_user_lists(db: Session, user_id: int) -> List[Dict]:
        """
        Get all lists for a user with profile counts.
        ⭐ OPTIMIZED - Single query with GROUP BY (fixes N+1 problem)
        """
        
        # ⭐ SINGLE QUERY with LEFT JOIN and GROUP BY
        list_counts = db.query(
            SavedList.id,
            SavedList.name,
            SavedList.description,
            SavedList.created_at,
            SavedList.updated_at,
            func.count(SavedListProfile.id).label('profile_count')
        ).outerjoin(
            SavedListProfile, SavedList.id == SavedListProfile.list_id
        ).filter(
            SavedList.user_id == user_id
        ).group_by(
            SavedList.id,
            SavedList.name,
            SavedList.description,
            SavedList.created_at,
            SavedList.updated_at
        ).all()
        
        # Convert to dictionaries
        result = []
        for lst in list_counts:
            result.append({
                "id": lst.id,
                "name": lst.name,
                "description": lst.description,
                "profile_count": lst.profile_count,
                "created_at": lst.created_at.isoformat() if lst.created_at else None,
                "updated_at": lst.updated_at.isoformat() if lst.updated_at else None
            })
        
        return result
    
    @staticmethod
    def get_list_profiles(db: Session, list_id: int, user_id: int) -> List[Dict]:
        """Get all profiles in a list with their notes"""
        # Verify list belongs to user
        saved_list = db.query(SavedList).filter(
            SavedList.id == list_id,
            SavedList.user_id == user_id
        ).first()
        
        if not saved_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        # Get profiles with notes
        list_profiles = db.query(SavedListProfile, Profile).join(
            Profile, SavedListProfile.profile_id == Profile.id
        ).filter(
            SavedListProfile.list_id == list_id
        ).all()
        
        result = []
        for list_profile, profile in list_profiles:
            result.append({
                "profile_id": profile.id,
                "github_username": profile.github_username,
                "name": profile.name,
                "email": profile.email,
                "location": profile.location,
                "bio": profile.bio,
                "primary_language": profile.primary_language,
                "developer_score": profile.developer_score,
                "total_stars": profile.total_stars,
                "contributions_last_year": profile.contributions_last_year,
                "avatar_url": profile.avatar_url,
                "notes": list_profile.notes,
                "added_at": list_profile.added_at.isoformat() if list_profile.added_at else None
            })
        
        return result
    
    @staticmethod
    def add_profile_to_list(db: Session, list_id: int, profile_id: int, notes: Optional[str] = None) -> Dict:
        """Add a profile to a list"""
        # Check if list exists
        saved_list = db.query(SavedList).filter(SavedList.id == list_id).first()
        if not saved_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        # Check limits
        limit_check = ListsService.check_profile_limit(db, list_id)
        if not limit_check["can_add"]:
            raise HTTPException(status_code=403, detail=limit_check["reason"])
        
        # Check if profile exists
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Check if already in list
        existing = db.query(SavedListProfile).filter(
            SavedListProfile.list_id == list_id,
            SavedListProfile.profile_id == profile_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Profile already in this list")
        
        # Add to list
        list_profile = SavedListProfile(
            list_id=list_id,
            profile_id=profile_id,
            notes=notes
        )
        db.add(list_profile)
        
        # Update list's updated_at
        saved_list.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {"message": "Profile added to list", "profile_id": profile_id}
    
    @staticmethod
    def remove_profile_from_list(db: Session, list_id: int, profile_id: int) -> Dict:
        """Remove a profile from a list"""
        list_profile = db.query(SavedListProfile).filter(
            SavedListProfile.list_id == list_id,
            SavedListProfile.profile_id == profile_id
        ).first()
        
        if not list_profile:
            raise HTTPException(status_code=404, detail="Profile not in this list")
        
        db.delete(list_profile)
        
        # Update list's updated_at
        saved_list = db.query(SavedList).filter(SavedList.id == list_id).first()
        if saved_list:
            saved_list.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {"message": "Profile removed from list"}
    
    @staticmethod
    def update_list(db: Session, list_id: int, user_id: int, name: Optional[str] = None, 
                   description: Optional[str] = None) -> SavedList:
        """Update list name/description"""
        saved_list = db.query(SavedList).filter(
            SavedList.id == list_id,
            SavedList.user_id == user_id
        ).first()
        
        if not saved_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        if name:
            saved_list.name = name
        if description is not None:  # Allow empty string
            saved_list.description = description
        
        saved_list.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(saved_list)
        
        return saved_list
    
    @staticmethod
    def delete_list(db: Session, list_id: int, user_id: int) -> Dict:
        """Delete a list and all its profile associations"""
        saved_list = db.query(SavedList).filter(
            SavedList.id == list_id,
            SavedList.user_id == user_id
        ).first()
        
        if not saved_list:
            raise HTTPException(status_code=404, detail="List not found")
        
        # Delete all profile associations first
        db.query(SavedListProfile).filter(SavedListProfile.list_id == list_id).delete()
        
        # Delete the list
        db.delete(saved_list)
        db.commit()
        
        return {"message": "List deleted successfully"}
    
    @staticmethod
    def update_profile_notes(db: Session, list_id: int, profile_id: int, notes: str) -> Dict:
        """Update notes for a profile in a list"""
        list_profile = db.query(SavedListProfile).filter(
            SavedListProfile.list_id == list_id,
            SavedListProfile.profile_id == profile_id
        ).first()
        
        if not list_profile:
            raise HTTPException(status_code=404, detail="Profile not in this list")
        
        list_profile.notes = notes
        db.commit()
        
        return {"message": "Notes updated", "notes": notes}