from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_collection
from app.services.role_service import check_permission, get_user_permissions
from app.schemas.user import UserOut
from shared.logging import get_logger
from typing import List, Optional
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
        user_id: str = payload.get("user_id")
        if username is None or user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Get user from database
    users = get_collection("users")
    user = await users.find_one({"_id": ObjectId(user_id), "is_active": True})
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> UserOut:
    """Get current active user with full information"""
    permissions = await get_user_permissions(str(current_user["_id"]))
    
    return UserOut(
        id=str(current_user["_id"]),
        username=current_user["username"],
        is_active=current_user.get("is_active", True),
        is_superuser=current_user.get("is_superuser", False),
        roles=current_user.get("roles", []),
        permissions=permissions,
        created_at=current_user.get("created_at"),
        last_login=current_user.get("last_login")
    )

def require_permission(permission: str):
    """Decorator to require specific permission"""
    async def permission_checker(current_user: UserOut = Depends(get_current_active_user)):
        # Superuser bypasses all permission checks
        if current_user.is_superuser:
            logger.debug(f"Superuser '{current_user.username}' bypasses permission check for '{permission}'")
            return current_user
        
        user_permissions = current_user.permissions
        
        # Check for wildcard permission (admin)
        if "*" in user_permissions:
            return current_user
        
        # Check for exact permission
        if permission in user_permissions:
            return current_user
        
        # Check for resource-level permission
        resource_action = permission.split(":")
        if len(resource_action) >= 2:
            base_permission = f"{resource_action[0]}:{resource_action[1]}"
            if base_permission in user_permissions:
                return current_user
        
        logger.warning(f"Permission denied: User '{current_user.username}' lacks permission '{permission}'")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission} required"
        )
    
    return permission_checker

def require_role(role: str):
    """Decorator to require specific role"""
    async def role_checker(current_user: UserOut = Depends(get_current_active_user)):
        if role in current_user.roles or current_user.is_superuser:
            return current_user
        
        logger.warning(f"Role denied: User '{current_user.username}' lacks role '{role}'")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role denied: {role} required"
        )
    
    return role_checker

def require_any_role(roles: List[str]):
    """Decorator to require any of the specified roles"""
    async def roles_checker(current_user: UserOut = Depends(get_current_active_user)):
        if current_user.is_superuser:
            return current_user
        
        if any(role in current_user.roles for role in roles):
            return current_user
        
        logger.warning(f"Role denied: User '{current_user.username}' lacks any of roles {roles}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role denied: one of {roles} required"
        )
    
    return roles_checker

def require_superuser():
    """Decorator to require superuser status"""
    async def superuser_checker(current_user: UserOut = Depends(get_current_active_user)):
        if current_user.is_superuser:
            return current_user
        
        logger.warning(f"Superuser access denied: User '{current_user.username}' is not superuser")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    
    return superuser_checker
