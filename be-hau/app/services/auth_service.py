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
    roles_collection = get_collection("roles")
    
    existing = await users.find_one({"username": user_in.username})
    if existing:
        logger.warning(f"Signup failed: username '{user_in.username}' already exists")
        raise ValueError("User already exists")

    # Convert role IDs to ObjectIds (user_in.roles contains role IDs as strings)
    role_object_ids = []
    if user_in.roles:
        for role_id in user_in.roles:
            if ObjectId.is_valid(role_id):
                # Verify role exists
                role = await roles_collection.find_one({"_id": ObjectId(role_id), "is_active": True})
                if role:
                    role_object_ids.append(ObjectId(role_id))
                else:
                    logger.warning(f"Role with ID '{role_id}' not found or inactive")
                    raise ValueError(f"Role with ID '{role_id}' not found or inactive")
            else:
                logger.warning(f"Invalid role ID format: {role_id}")
                raise ValueError(f"Invalid role ID format: {role_id}")
    else:
        # Get default "viewer" role
        default_role = await roles_collection.find_one({"name": "viewer", "is_active": True})
        if default_role:
            role_object_ids = [default_role["_id"]]
        
    user_data = {
        "username": user_in.username,
        "hashed_password": user_in.password,
        "is_active": True,
        "is_superuser": False,
        "roles": role_object_ids,  # Store as ObjectIds
        "permissions": [],
        "supply": user_in.supply,
        "returns": user_in.returns,
        "both": user_in.both,
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
    user = await users.find_one({"username": username, "hashed_password": password})

    if not user:
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
    # Convert role ObjectIds to strings for token
    role_ids = [str(role_id) for role_id in user.get("roles", [])]
    return create_access_token(data={
        "sub": user["username"],
        "user_id": str(user["_id"]),
        "roles": role_ids,
        "permissions": user.get("permissions", [])
    })

async def get_current_user_info(user_id: str) -> Optional[UserOut]:
    """Get current user information with permissions"""
    users = get_collection("users")
    roles_collection = get_collection("roles")
    user = await users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    
    # Get user permissions
    permissions = await get_user_permissions(user_id)
    
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
        roles=role_names,
        permissions=permissions,
        supply=user.get("supply"),
        returns=user.get("returns"),
        both=user.get("both"),
        created_at=user.get("created_at", datetime.utcnow()),
        last_login=user.get("last_login")
    )
