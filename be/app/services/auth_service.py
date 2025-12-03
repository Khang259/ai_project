from app.core.database import get_collection
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_refresh_token
from app.schemas.user import UserCreate, UserOut
from app.services.role_service import get_user_permissions
from shared.logging import get_logger
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from bson import ObjectId
from jose import jwt
from app.core.config import settings

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
        "area_id": int(user_in.area_id) if getattr(user_in, "area_id", None) is not None else 0,
        "group_id": int(user_in.group_id) if getattr(user_in, "group_id", None) is not None else 0,
        "route_id": user_in.route_id,
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
    # Check if refresh token is blacklisted
    if await is_token_blacklisted(refresh_token):
        logger.warning("Attempted to use blacklisted refresh token")
        return None
    
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
        area_id=user.get("area_id", 0),
        group_id=user.get("group_id", 0),
        route_id=user.get("route_id", 0),
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
            area_id=user.get("area_id", 0),
            group_id=user.get("group_id", 0),
            route_id=user.get("route_id", 0),
            roles=role_names,
            permissions=permissions,
            created_at=user.get("created_at", datetime.utcnow()),
            last_login=user.get("last_login")
        ))
    
    return result

async def logout_user(access_token: Optional[str] = None, refresh_token: Optional[str] = None) -> bool:
    """Blacklist tokens when user logs out. Only blacklist tokens that are provided."""
    try:
        blacklist = get_collection("token_blacklist")
        
        # Blacklist access token if provided
        if access_token:
            try:
                # Decode token to get expiration time (allow expired tokens for cleanup)
                payload = jwt.decode(access_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], options={"verify_exp": False})
                exp = payload.get("exp")
                
                # Calculate expiration datetime
                if exp:
                    expires_at = datetime.utcfromtimestamp(exp)
                else:
                    # Default to 30 minutes from now if no exp in token
                    expires_at = datetime.utcnow() + timedelta(minutes=30)
            except Exception as e:
                # If token can't be decoded, still blacklist it with a default expiration
                logger.warning(f"Could not decode access token, using default expiration: {str(e)}")
                expires_at = datetime.utcnow() + timedelta(minutes=30)
            
            # Store blacklisted access token in database
            blacklist_data = {
                "token": access_token,
                "type": "access",
                "expires_at": expires_at,
                "blacklisted_at": datetime.utcnow()
            }
            await blacklist.insert_one(blacklist_data)
            logger.info("Access token blacklisted successfully")
        
        # Blacklist refresh token if provided
        if refresh_token:
            try:
                refresh_payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], options={"verify_exp": False})
                refresh_exp = refresh_payload.get("exp")
                if refresh_exp:
                    refresh_expires_at = datetime.utcfromtimestamp(refresh_exp)
                else:
                    refresh_expires_at = datetime.utcnow() + timedelta(days=7)
                
                refresh_blacklist_data = {
                    "token": refresh_token,
                    "type": "refresh",
                    "expires_at": refresh_expires_at,
                    "blacklisted_at": datetime.utcnow()
                }
                await blacklist.insert_one(refresh_blacklist_data)
            except Exception as e:
                logger.warning(f"Error blacklisting refresh token: {str(e)}")
                # Still try to blacklist with default expiration
                refresh_blacklist_data = {
                    "token": refresh_token,
                    "type": "refresh",
                    "expires_at": datetime.utcnow() + timedelta(days=7),
                    "blacklisted_at": datetime.utcnow()
                }
                await blacklist.insert_one(refresh_blacklist_data)
            logger.info("Refresh token blacklisted successfully")
        
        # At least one token should have been blacklisted
        if not access_token and not refresh_token:
            logger.warning("No tokens provided to blacklist")
            return False
        
        logger.info("Logout completed successfully")
        return True
    except Exception as e:
        logger.error(f"Error during logout: {str(e)}")
        return False

async def is_token_blacklisted(token: str) -> bool:
    """Check if a token is in the blacklist"""
    blacklist = get_collection("token_blacklist")
    blacklisted = await blacklist.find_one({"token": token})
    return blacklisted is not None

async def cleanup_expired_blacklist_tokens():
    """Clean up expired tokens from blacklist (can be called periodically)"""
    blacklist = get_collection("token_blacklist")
    result = await blacklist.delete_many({"expires_at": {"$lt": datetime.utcnow()}})
    if result.deleted_count > 0:
        logger.info(f"Cleaned up {result.deleted_count} expired blacklist tokens")
