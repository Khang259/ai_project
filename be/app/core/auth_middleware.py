from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_collection
from shared.logging import get_logger
from typing import Optional
from bson import ObjectId

logger = get_logger("camera_ai_app")
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    users = get_collection("users")
    user = await users.find_one({"username": username, "is_active": True})
    if user is None:
        raise credentials_exception
    
    return user

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin privileges (superuser or admin role)"""
    # Check if user is superuser
    if current_user.get("is_superuser", False):
        return current_user
    
    # Check if user has admin role
    roles_collection = get_collection("roles")
    user_role_ids = current_user.get("roles", [])
    
    for role_id in user_role_ids:
        role = await roles_collection.find_one({"_id": role_id, "is_active": True})
        if role and role.get("name") == "admin":
            logger.info(f"User '{current_user['username']}' granted admin access via 'admin' role")
            return current_user
    
    # No admin access
    logger.warning(f"Admin access denied: User '{current_user['username']}' is not admin")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required"
    )