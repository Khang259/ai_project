from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user import UserCreate, Token, UserLogin, UserOut, RoleOut, PermissionOut, RoleCreate, RoleUpdate
from app.services.auth_service import register_user, authenticate_user, create_user_token, get_current_user_info
from app.services.role_service import (
    initialize_default_permissions, initialize_default_roles,
    assign_role_to_user, remove_role_from_user, get_all_roles, get_all_permissions,
    create_role, update_role, delete_role, get_role_by_id
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

@router.post("/roles/create", response_model=RoleOut)
async def role_create(role_in: RoleCreate, current_user: UserOut = Depends(require_permission("users:write"))):
    """Create a new role (requires users:write permission)"""
    try:    
        role = await create_role(role_in.dict(), current_user.username)
        return RoleOut(**role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating role: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/roles/{role_id}", response_model=RoleOut)
async def update_role_endpoint(
    role_id: str,
    role_update: RoleUpdate,
    current_user: UserOut = Depends(require_permission("users:write"))
):
    """Update role (requires users:write permission)"""
    try:
        # Convert to dict and remove None values
        update_data = {k: v for k, v in role_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        success = await update_role(role_id, update_data, current_user.username)
        if not success:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Return updated role
        updated_role = await get_role_by_id(role_id)
        if not updated_role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return RoleOut(**updated_role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating role: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/roles/{role_id}")
async def delete_role_endpoint(
    role_id: str,
    current_user: UserOut = Depends(require_permission("users:write"))
):
    """Delete role (requires users:write permission)"""
    try:
        success = await delete_role(role_id, current_user.username)
        if not success:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return {"message": "Role deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting role: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

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
