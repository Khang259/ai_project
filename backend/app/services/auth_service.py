from app.core.database import get_collection
from app.core.security import get_password_hash, verify_password, create_access_token
from app.schemas.user import UserCreate, UserOut
from app.services.role_service import get_user_permissions
from shared.logging import get_logger
from typing import Optional
from datetime import datetime
from bson import ObjectId

logger = get_logger("camera_ai_app")

async def register_user(user_in: UserCreate):
    users = get_collection("users")
    existing = await users.find_one({"username": user_in.username})
    if existing:
        logger.warning(f"Signup failed: username '{user_in.username}' already exists")
        raise ValueError("User already exists")

    user_data = {
        "username": user_in.username,
        "hashed_password": user_in.password,
        "is_active": True,
        "is_superuser": False,
        "roles": user_in.roles or ["viewer"],  # Default role
        "permissions": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_login": None
    }
    
    result = await users.insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)
    logger.info(f"New user registered: {user_in.username} (id={user_data['_id']})")
    return user_data

async def authenticate_user(username: str, password: str):
    users = get_collection("users")
    user = await users.find_one({"username": username})
    if not user or not verify_password(password, user["hashed_password"]):
        logger.warning(f"Login failed: invalid password or username")
        return None
    
    # Update last login
    await users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return user

def create_user_token(user):
    logger.debug(f"Creating token for user '{user['username']}'")
    return create_access_token(data={
        "sub": user["username"],
        "user_id": str(user["_id"]),
        "roles": user.get("roles", []),
        "permissions": user.get("permissions", [])
    })

async def get_current_user_info(user_id: str) -> Optional[UserOut]:
    """Get current user information with permissions"""
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    
    # Get user permissions
    permissions = await get_user_permissions(user_id)
    
    return UserOut(
        id=str(user["_id"]),
        username=user["username"],
        is_active=user.get("is_active", True),
        is_superuser=user.get("is_superuser", False),
        roles=user.get("roles", []),
        permissions=permissions,
        created_at=user.get("created_at", datetime.utcnow()),
        last_login=user.get("last_login")
    )
