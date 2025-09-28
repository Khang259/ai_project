from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user import UserCreate, Token, UserLogin, UserOut, RoleOut, PermissionOut
from app.services.auth_service import register_user, authenticate_user, create_user_token, get_current_user_info
from app.services.role_service import (
    initialize_default_permissions, initialize_default_roles,
    assign_role_to_user, remove_role_from_user, get_all_roles, get_all_permissions,
    get_user_permissions
)
from app.core.permissions import get_current_active_user, require_permission, require_superuser
from shared.logging import get_logger

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/signup", response_model=Token)
async def signup(user_in: UserCreate):
    try:
        user = await register_user(user_in)
        logger.info(f"Signup success for username='{user_in.username}'")
    except ValueError:
        logger.error(f"Signup attempt with existing username='{user_in.username}'")
        raise HTTPException(status_code=400, detail="User already exists")

    token = create_user_token(user)
    user_info = await get_current_user_info(str(user["_id"]))
    return {"access_token": token, "token_type": "bearer", "user": user_info}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    user = await authenticate_user(user_in.username, user_in.password)
    if not user:
        logger.error(f"Login attempt with invalid username='{user_in.username}'")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    logger.info(f"Login success for username='{user_in.username}'")
    token = create_user_token(user)
    user_info = await get_current_user_info(str(user["_id"]))
    return {"access_token": token, "token_type": "bearer", "user": user_info}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: UserOut = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@router.get("/roles", response_model=list[RoleOut])
async def get_roles(current_user: UserOut = Depends(require_permission("users:read"))):
    """Get all roles (requires users:read permission)"""
    roles = await get_all_roles()
    return [RoleOut(**role) for role in roles]

@router.get("/permissions", response_model=list[PermissionOut])
async def get_permissions(current_user: UserOut = Depends(require_permission("users:read"))):
    """Get all permissions (requires users:read permission)"""
    permissions = await get_all_permissions()
    return [PermissionOut(**permission) for permission in permissions]

@router.post("/users/{user_id}/roles/{role_name}")
async def assign_user_role(
    user_id: str,
    role_name: str,
    current_user: UserOut = Depends(require_permission("users:write"))
):
    """Assign role to user (requires users:write permission)"""
    success = await assign_role_to_user(user_id, role_name)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to assign role")
    return {"message": f"Role '{role_name}' assigned to user"}

@router.delete("/users/{user_id}/roles/{role_name}")
async def remove_user_role(
    user_id: str,
    role_name: str,
    current_user: UserOut = Depends(require_permission("users:write"))
):
    """Remove role from user (requires users:write permission)"""
    success = await remove_role_from_user(user_id, role_name)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove role")
    return {"message": f"Role '{role_name}' removed from user"}

@router.post("/initialize-permissions")
async def initialize_permissions(current_user: UserOut = Depends(require_superuser())):
    """Initialize default permissions and roles (superuser only)"""
    await initialize_default_permissions()
    await initialize_default_roles()
    return {"message": "Default permissions and roles initialized"}
