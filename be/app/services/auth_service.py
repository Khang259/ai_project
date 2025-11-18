from app.core.database import get_collection
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_refresh_token
from app.schemas.user import UserCreate, UserOut
from app.services.role_service import get_user_permissions
from shared.logging import get_logger
from typing import Optional, Dict, List
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
        default_role = await roles_collection.find_one({"name": "user", "is_active": True})
        if default_role:
            role_object_ids = [default_role["_id"]]
        
    user_data = {
        "username": user_in.username,
        "hashed_password": user_in.password,
        "is_active": True,
        "is_superuser": False,
        "area": int(user_in.area) if getattr(user_in, "area", None) is not None else 0,
        "group_id": int(user_in.group_id) if getattr(user_in, "group_id", None) is not None else 0,
        "route": user_in.route,
        "roles": role_object_ids,  # Store as ObjectIds
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
    token_data = {
        "sub": user["username"],
        "user_id": str(user["_id"]),
        "roles": role_ids,
        "permissions": user.get("permissions", [])
    }
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    return access_token, refresh_token

async def refresh_access_token(refresh_token: str) -> Optional[Dict]:
    """Refresh access token using refresh token"""
    payload = verify_refresh_token(refresh_token)
    if not payload:
        logger.warning("Invalid refresh token")
        return None
    
    username = payload.get("sub")
    if not username:
        logger.warning("Refresh token missing username")
        return None
    
    # Get user from database
    users = get_collection("users")
    user = await users.find_one({"username": username, "is_active": True})
    if not user:
        logger.warning(f"User '{username}' not found or inactive")
        return None
    
    # Create new tokens
    role_ids = [str(role_id) for role_id in user.get("roles", [])]
    token_data = {
        "sub": user["username"],
        "user_id": str(user["_id"]),
        "roles": role_ids,
        "permissions": user.get("permissions", [])
    }
    access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token
    }

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
        area=user.get("area", 0),
        group_id=user.get("group_id", 0),
        route=user.get("route", []),
        roles=role_names,
        permissions=permissions,
        created_at=user.get("created_at", datetime.utcnow()),
        last_login=user.get("last_login")
    )

async def get_users_for_operator(group_id: int) -> List[UserOut]:
    """Lấy tất cả user có group_id và role là 'user'"""
    users = get_collection("users")
    roles_collection = get_collection("roles")
    
    # Tìm role có name = "user" để lấy ObjectId
    user_role = await roles_collection.find_one({"name": "user"})
    if not user_role:
        logger.warning("Role 'user' not found")
        return []
    
    # Query users với group_id, is_active và role ObjectId
    users_list = await users.find({
        "group_id": group_id,
        "is_active": True,
        "roles": {"$in": [user_role["_id"]]}
    }).to_list(length=None)
    
    if not users_list:
        return []
    
    # Convert sang UserOut
    result = []
    for user in users_list:
        # Convert role ObjectIds to role names
        role_names = []
        for role_id in user.get("roles", []):
            role = await roles_collection.find_one({"_id": role_id})
            if role:
                role_names.append(role["name"])
        
        # Get user permissions
        permissions = await get_user_permissions(str(user["_id"]))
        
        result.append(UserOut(
            id=str(user["_id"]),
            username=user["username"],
            is_active=user.get("is_active", True),
            is_superuser=user.get("is_superuser", False),
            area=user.get("area", 0),
            group_id=user.get("group_id", 0),
            route=user.get("route", []),
            roles=role_names,
            permissions=permissions,
            created_at=user.get("created_at", datetime.utcnow()),
            last_login=user.get("last_login")
        ))
    
    return result
