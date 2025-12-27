from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import User  # ⭐ ADDED THIS IMPORT
from lists_service import ListsService
from auth_middleware import get_current_user

router = APIRouter(prefix="/api/lists", tags=["Saved Lists"])

# ===== REQUEST MODELS =====

class CreateListRequest(BaseModel):
    name: str
    description: Optional[str] = None

class UpdateListRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class AddProfileRequest(BaseModel):
    profile_id: int
    notes: Optional[str] = None

class UpdateNotesRequest(BaseModel):
    notes: str


# ===== ENDPOINTS =====

@router.post("/create")
def create_list(
    request: CreateListRequest, 
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Create a new saved list"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    
    try:
        new_list = ListsService.create_list(db, user_id, request.name, request.description)
        return {
            "message": "List created successfully",
            "list": {
                "id": new_list.id,
                "name": new_list.name,
                "description": new_list.description,
                "created_at": new_list.created_at.isoformat() if new_list.created_at else None
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def get_lists(
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Get all lists for user"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    lists = ListsService.get_user_lists(db, user_id)
    return {"lists": lists, "total": len(lists)}


@router.get("/{list_id}/profiles")
def get_list_profiles(
    list_id: int, 
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Get all profiles in a list"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    profiles = ListsService.get_list_profiles(db, list_id, user_id)
    return {"profiles": profiles, "total": len(profiles)}


@router.post("/{list_id}/add-profile")
def add_profile_to_list(
    list_id: int,
    request: AddProfileRequest,
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Add a profile to a list"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    result = ListsService.add_profile_to_list(db, list_id, request.profile_id, request.notes)
    return result


@router.delete("/{list_id}/remove-profile/{profile_id}")
def remove_profile_from_list(
    list_id: int, 
    profile_id: int,
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Remove a profile from a list"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    result = ListsService.remove_profile_from_list(db, list_id, profile_id)
    return result


@router.put("/{list_id}")
def update_list(
    list_id: int, 
    request: UpdateListRequest,
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Update list name/description"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    updated_list = ListsService.update_list(db, list_id, user_id, request.name, request.description)
    return {
        "message": "List updated successfully",
        "list": {
            "id": updated_list.id,
            "name": updated_list.name,
            "description": updated_list.description,
            "updated_at": updated_list.updated_at.isoformat() if updated_list.updated_at else None
        }
    }


@router.delete("/{list_id}")
def delete_list(
    list_id: int,
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Delete a list"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    result = ListsService.delete_list(db, list_id, user_id)
    return result


@router.put("/{list_id}/profiles/{profile_id}/notes")
def update_profile_notes(
    list_id: int, 
    profile_id: int, 
    request: UpdateNotesRequest,
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Update notes for a profile in a list"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    result = ListsService.update_profile_notes(db, list_id, profile_id, request.notes)
    return result


@router.get("/limits")
def get_list_limits(
    current_user: User = Depends(get_current_user),  # ✅ CHANGED dict to User
    db: Session = Depends(get_db)
):
    """Check list creation limits"""
    user_id = current_user.id  # ✅ CHANGED ["id"] to .id
    limits = ListsService.check_list_limits(db, user_id)
    return limits