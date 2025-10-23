from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.schemas.user import RoleCreate, RoleOut, RoleUpdate
from app.services.role_service import (
    create_role, get_all_roles, get_role_by_id, update_role,
    delete_role, assign_permission_to_role, remove_permission_from_role,
    initialize_default_roles
)
from app.core.permissions import require_permission
from shared.logging import get_logger
from typing import List, Optional
from pydantic import BaseModel
from app.core.auth_middleware import require_admin

router = APIRouter()
logger = get_logger("camera_ai_app")

class PermissionAssignment(BaseModel):
    permission_id: str

@router.post("/", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_new_role(
    role_in: RoleCreate,
    current_user = Depends(require_admin)
):
    """Tạo role mới (yêu cầu quyền roles:write)"""
    try:
        role_data = role_in.dict()
        role_data["created_by"] = current_user.username
        role = await create_role(role_data)
        return RoleOut(**role)
    except ValueError as e:
        logger.error(f"Role creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during role creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[RoleOut])
async def get_all_roles_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user = Depends(require_admin)
):
    """Lấy danh sách tất cả roles (yêu cầu quyền roles:read)"""
    try:
        roles = await get_all_roles()
        # Apply pagination
        roles = roles[skip:skip + limit]
        return [RoleOut(**role) for role in roles]
    except Exception as e:
        logger.error(f"Error getting roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{role_id}", response_model=RoleOut)
async def get_role_by_id_endpoint(
    role_id: str,
    current_user = Depends(require_admin)
):
    """Lấy role theo ID (yêu cầu quyền roles:read)"""
    try:
        role = await get_role_by_id(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        return RoleOut(**role)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting role {role_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{role_id}", response_model=RoleOut)
async def update_role_by_id(
    role_id: str,
    role_update: RoleUpdate,
    current_user = Depends(require_admin)
):
    """Cập nhật role theo ID (yêu cầu quyền roles:write)"""
    try:
        update_data = {k: v for k, v in role_update.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data to update"
            )
        
        success = await update_role(role_id, update_data, current_user.username)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Return updated role
        updated_role = await get_role_by_id(role_id)
        return RoleOut(**updated_role)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during role update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role_by_id(
    role_id: str,
    current_user = Depends(require_admin)
):
    """Xóa role theo ID (yêu cầu quyền roles:delete)"""
    try:
        success = await delete_role(role_id, current_user.username)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during role deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/{role_id}/permissions", status_code=status.HTTP_200_OK)
async def assign_permission_to_role_endpoint(
    role_id: str,
    permission_assignment: PermissionAssignment,
    current_user = Depends(require_admin)
):
    """Gán permission cho role (yêu cầu quyền roles:write)"""
    try:
        success = await assign_permission_to_role(role_id, permission_assignment.permission_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to assign permission to role"
            )
        return {"message": "Permission assigned to role successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during permission assignment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{role_id}/permissions/{permission_id}", status_code=status.HTTP_200_OK)
async def remove_permission_from_role_endpoint(
    role_id: str,
    permission_id: str,
    current_user = Depends(require_admin)
):
    """Xóa permission khỏi role (yêu cầu quyền roles:write)"""
    try:
        success = await remove_permission_from_role(role_id, permission_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to remove permission from role"
            )
        return {"message": "Permission removed from role successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during permission removal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/initialize-defaults", status_code=status.HTTP_200_OK)
async def initialize_default_roles_endpoint(
    current_user = Depends(require_admin)
):
    """Khởi tạo các role mặc định (yêu cầu quyền roles:write)"""
    try:
        await initialize_default_roles()
        return {"message": "Default roles initialized successfully"}
    except Exception as e:
        logger.error(f"Error initializing default roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize default roles"
        )
