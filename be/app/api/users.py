from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.database import get_collection
from app.schemas.user import UserOut, UserUpdate
from app.core.permissions import require_permission
from shared.logging import get_logger
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.get("/", response_model=List[UserOut])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: UserOut = Depends(require_permission("users:read"))
):
    """Get list of users (requires users:read permission)"""
    users_collection = get_collection("users")
    users = await users_collection.find().skip(skip).limit(limit).to_list(length=None)
    
    result = []
    for user in users:
        # Convert role ObjectIds to strings
        role_ids = [str(role_id) for role_id in user.get("roles", [])]
        result.append(UserOut(
            id=str(user["_id"]),
            username=user["username"],
            is_active=user.get("is_active", True),
            is_superuser=user.get("is_superuser", False),
            roles=role_ids,
            permissions=user.get("permissions", []),
            supply=user.get("supply"),
            returns=user.get("returns"),
            both=user.get("both"),
            created_at=user.get("created_at"),
            last_login=user.get("last_login")
        ))
    
    return result

@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    current_user: UserOut = Depends(require_permission("users:read"))
):
    """Get specific user (requires users:read permission)"""
    users_collection = get_collection("users")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert role ObjectIds to strings
    role_ids = [str(role_id) for role_id in user.get("roles", [])]
    
    return UserOut(
        id=str(user["_id"]),
        username=user["username"],
        is_active=user.get("is_active", True),
        is_superuser=user.get("is_superuser", False),
        roles=role_ids,
        permissions=user.get("permissions", []),
        supply=user.get("supply"),
        returns=user.get("returns"),
        both=user.get("both"),
        created_at=user.get("created_at"),
        last_login=user.get("last_login")
    )

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: UserOut = Depends(require_permission("users:write"))
):
    """Update user (requires users:write permission)"""
    users_collection = get_collection("users")
    roles_collection = get_collection("roles")
    
    # Check if user exists
    existing_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = {}
    if user_update.username is not None:
        update_data["username"] = user_update.username
    if user_update.is_active is not None:
        update_data["is_active"] = user_update.is_active
    if user_update.roles is not None:
        # Convert role IDs or role names to ObjectIds
        role_object_ids = []
        for role_identifier in user_update.roles:
            if ObjectId.is_valid(role_identifier):
                # It's a valid ObjectId, use it directly
                role_object_ids.append(ObjectId(role_identifier))
            else:
                # It's a role name, look up the role
                role = await roles_collection.find_one({"name": role_identifier, "is_active": True})
                if role:
                    role_object_ids.append(role["_id"])
                else:
                    logger.warning(f"Role '{role_identifier}' not found or inactive")
        update_data["roles"] = role_object_ids
    if user_update.supply is not None:
        update_data["supply"] = user_update.supply
    if user_update.returns is not None:
        update_data["returns"] = user_update.returns
    if user_update.both is not None:
        update_data["both"] = user_update.both
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update user")
    
    # Return updated user
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    # Convert role ObjectIds to strings
    role_ids = [str(role_id) for role_id in updated_user.get("roles", [])]
    
    return UserOut(
        id=str(updated_user["_id"]),
        username=updated_user["username"],
        is_active=updated_user.get("is_active", True),
        is_superuser=updated_user.get("is_superuser", False),
        roles=role_ids,
        permissions=updated_user.get("permissions", []),
        supply=updated_user.get("supply"),
        returns=updated_user.get("returns"),
        both=updated_user.get("both"),
        created_at=updated_user.get("created_at"),
        last_login=updated_user.get("last_login")
    )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: UserOut = Depends(require_permission("users:delete"))
):
    """Delete user (requires users:delete permission)"""
    users_collection = get_collection("users")
    
    # Prevent self-deletion
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await users_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"User {user_id} deleted by {current_user.username}")
    return {"message": "User deleted successfully"}