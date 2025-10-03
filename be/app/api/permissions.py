from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.schemas.permission import PermissionCreate, PermissionUpdate, PermissionOut
from app.services.role_service import (
    create_permission, get_all_permissions, get_permission_by_id,
    update_permission, delete_permission, get_permissions_by_resource,
    get_permissions_by_action, initialize_default_permissions
)
from app.core.auth_middleware import require_admin
from shared.logging import get_logger
from typing import List, Optional

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/", response_model=PermissionOut)
async def create_new_permission(
    permission_data: PermissionCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new permission (Admin only)"""
    try:
        permission = await create_permission(permission_data.dict(), current_user["username"])
        return PermissionOut(**permission)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating permission: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[PermissionOut])
async def get_permissions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    resource: Optional[str] = Query(None, description="Filter by resource"),
    action: Optional[str] = Query(None, description="Filter by action"),
    current_user: dict = Depends(require_admin)
):
    """Get all permissions (Admin only)"""
    try:
        if resource:
            permissions = await get_permissions_by_resource(resource)
        elif action:
            permissions = await get_permissions_by_action(action)
        else:
            permissions = await get_all_permissions()
        
        # Apply pagination
        permissions = permissions[skip:skip + limit]
        
        return [PermissionOut(**perm) for perm in permissions]
    except Exception as e:
        logger.error(f"Error getting permissions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{permission_id}", response_model=PermissionOut)
async def get_permission(
    permission_id: str,
    current_user: dict = Depends(require_admin)
):
    """Get specific permission by ID (Admin only)"""
    permission = await get_permission_by_id(permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return PermissionOut(**permission)

@router.put("/{permission_id}", response_model=PermissionOut)
async def update_permission_by_id(
    permission_id: str,
    permission_update: PermissionUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update permission (Admin only)"""
    # Check if permission exists
    existing_permission = await get_permission_by_id(permission_id)
    if not existing_permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    # Prepare update data
    update_data = {k: v for k, v in permission_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    success = await update_permission(permission_id, update_data, current_user["username"])
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update permission")
    
    # Return updated permission
    updated_permission = await get_permission_by_id(permission_id)
    return PermissionOut(**updated_permission)

@router.delete("/{permission_id}")
async def delete_permission_by_id(
    permission_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete permission (Admin only)"""
    # Check if permission exists
    existing_permission = await get_permission_by_id(permission_id)
    if not existing_permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    success = await delete_permission(permission_id, current_user["username"])
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete permission")
    
    return {"message": "Permission deleted successfully"}

@router.post("/initialize-defaults")
async def initialize_default_permissions_endpoint(
    current_user: dict = Depends(require_admin)
):
    """Initialize default permissions (Admin only)"""
    try:
        await initialize_default_permissions()
        return {"message": "Default permissions initialized successfully"}
    except Exception as e:
        logger.error(f"Error initializing default permissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize default permissions")

@router.get("/resources/list")
async def get_available_resources(current_user: dict = Depends(require_admin)):
    """Get list of available resources (Admin only)"""
    permissions = await get_all_permissions()
    resources = list(set(perm["resource"] for perm in permissions))
    return {"resources": sorted(resources)}

@router.get("/actions/list")
async def get_available_actions(current_user: dict = Depends(require_admin)):
    """Get list of available actions (Admin only)"""
    permissions = await get_all_permissions()
    actions = list(set(perm["action"] for perm in permissions))
    return {"actions": sorted(actions)}