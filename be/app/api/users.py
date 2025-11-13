from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.database import get_collection
from app.schemas.user import UserOut, UserUpdate
from app.core.permissions import require_permission, require_role
from shared.logging import get_logger
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from app.services.auth_service import get_users_for_operator

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
    roles_collection = get_collection("roles")
    users = await users_collection.find().skip(skip).limit(limit).to_list(length=None)
    
    result = []
    for user in users:
        # Convert role ObjectIds to role names
        role_names = []
        for role_id in user.get("roles", []):
            role = await roles_collection.find_one({"_id": role_id})
            if role:
                role_names.append(role["name"])
        
        result.append(UserOut(
            id=str(user["_id"]),
            username=user["username"],
            is_active=user.get("is_active", True),
            is_superuser=user.get("is_superuser", False),
            area=user.get("area", 0),
            group_id=user.get("group_id", 0),
            route=user.get("route", []),
            roles=role_names,
            permissions=user.get("permissions", []),
            created_at=user.get("created_at"),
            last_login=user.get("last_login")
        ))
    
    return result

@router.get("/operator", response_model=List[UserOut])
async def get_users_operator(group_id: int):
    """Get all users for operator"""
    return await get_users_for_operator(group_id)

@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    current_user: UserOut = Depends(require_permission("users:read"))
):
    """Get specific user (requires users:read permission)"""
    users_collection = get_collection("users")
    roles_collection = get_collection("roles")
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert role ObjectIds to role names
    role_names = []
    for role_id in user.get("roles", []):
        role = await roles_collection.find_one({"_id": role_id})
        if role:
            role_names.append(role["name"])
    
    return UserOut(
        id=str(user["_id"]),
        username=user["username"],
        is_active=user.get("is_active", True),
        is_superuser=user.get("is_superuser", False),
        area=user.get("area", 0),
        group_id=user.get("group_id", 0),
        route=user.get("route", []),
        roles=role_names,
        permissions=user.get("permissions", []),
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
        # Convert role IDs to ObjectIds
        role_object_ids = []
        for role_id in user_update.roles:
            if ObjectId.is_valid(role_id):
                # Verify role exists
                role = await roles_collection.find_one({"_id": ObjectId(role_id), "is_active": True})
                if role:
                    role_object_ids.append(ObjectId(role_id))
                else:
                    logger.warning(f"Role with ID '{role_id}' not found or inactive")
                    raise HTTPException(status_code=400, detail=f"Role with ID '{role_id}' not found or inactive")
            else:
                logger.warning(f"Invalid role ID format: {role_id}")
                raise HTTPException(status_code=400, detail=f"Invalid role ID format: {role_id}")
        update_data["roles"] = role_object_ids

    if user_update.area is not None:
        update_data["area"] = int(user_update.area)

    if user_update.group_id is not None:
        try:
            update_data["group_id"] = int(user_update.group_id)
        except Exception:
            raise HTTPException(status_code=400, detail="group_id must be an integer")

    if user_update.route is not None:
        update_data["route"] = user_update.route

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
    # Convert role ObjectIds to role names
    role_names = []
    for role_id in updated_user.get("roles", []):
        role = await roles_collection.find_one({"_id": role_id})
        if role:
            role_names.append(role["name"])
    
    return UserOut(
        id=str(updated_user["_id"]),
        username=updated_user["username"],
        is_active=updated_user.get("is_active", True),
        is_superuser=updated_user.get("is_superuser", False),
        area=updated_user.get("area", 0),
        group_id=updated_user.get("group_id", 0),
        route=updated_user.get("route", []),
        roles=role_names,
        permissions=updated_user.get("permissions", []),
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


