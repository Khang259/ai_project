from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from app.schemas.area import AreaCreate, AreaOut, AreaUpdate
from app.services.area_service import (
    create_area,
    get_area,
    get_areas,
    update_area,
    delete_area,
    get_areas_by_creator,
    check_area_has_cameras,
    get_area_camera_count,
    save_map,
    get_map_by_area_id,
)
from app.core.permissions import get_current_user
from shared.logging import get_logger
from typing import List

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/", response_model=AreaOut, status_code=status.HTTP_201_CREATED)
async def create_new_area(
    area_in: AreaCreate,
    current_user: dict = Depends(get_current_user)
):
    """Tạo area mới"""
    try:
        return await create_area(area_in, current_user["username"])
    except ValueError as e:
        logger.error(f"Area creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during area creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[AreaOut])
async def get_all_areas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Lấy danh sách tất cả areas (yêu cầu quyền areas:read)"""
    try:
        return await get_areas(skip=skip, limit=limit)
    except Exception as e:
        logger.error(f"Error getting areas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{area_id}", response_model=AreaOut)
async def get_area_by_id(
    area_id: str,
):
    """Lấy area theo MongoDB ID (yêu cầu quyền areas:read)"""
    try:
        area = await get_area(area_id)
        if not area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Area not found"
            )
        return area
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting area {area_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{area_id}", response_model=AreaOut)
async def update_area_by_id(
    area_id: str,
    area_update: AreaUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật area theo ID"""
    try:
        area = await update_area(area_id, area_update)
        if not area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Area not found"
            )
        return area
    except ValueError as e:
        logger.error(f"Area update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during area update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{area_id}", status_code=status.HTTP_200_OK)
async def delete_area_by_id(
    area_id: str,
):
    """Xóa area và tất cả nodes trong area đó"""
    try:
        # Lấy thông tin area trước khi xóa
        area = await get_area(area_id)
        if not area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Area not found"
            )
        
        # Lấy số lượng cameras sẽ bị xóa
        camera_count = await get_area_camera_count(area.area_id)
        
        success = await delete_area(area_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Area not found"
            )
        
        return {
            "message": f"Area '{area.area_name}' deleted successfully",
            "area_name": area.area_name,
            "deleted_cameras_count": camera_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during area deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/creator/{created_by}", response_model=List[AreaOut])
async def get_areas_by_creator_endpoint(
    created_by: str,
):
    """Lấy danh sách areas theo người tạo (yêu cầu areas:read)"""
    try:
        return await get_areas_by_creator(created_by)
    except Exception as e:
        logger.error(f"Error getting areas by creator {created_by}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{area_id}/cameras/count")
async def get_area_camera_count_endpoint(
    area_id: str,
):
    """Lấy số lượng cameras trong area"""
    try:
        # Lấy thông tin area trước
        area = await get_area(area_id)
        if not area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Area not found"
            )
        
        camera_count = await get_area_camera_count(area.area_id)
        return {
            "area_id": area_id,
            "area_name": area.area_name,
            "camera_count": camera_count
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting camera count for area {area_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{area_id}/cameras/check")
async def check_area_has_cameras_endpoint(
    area_id: str,
):
    """Kiểm tra xem area có cameras không"""
    try:
        # Lấy thông tin area trước
        area = await get_area(area_id)
        if not area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Area not found"
            )
        
        has_cameras = await check_area_has_cameras(area.area_id)
        return {
            "area_id": area_id,
            "area_name": area.area_name,
            "has_cameras": has_cameras
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking cameras for area {area_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/{area_id}/map")
async def save_map_endpoint(
    area_id: int,
    data: dict = Body(..., description="Map data to save"),
):
    """Lưu map vào database - tự động xóa map cũ nếu đã tồn tại"""
    try:
        map_data = await save_map(data, area_id)
        return {
            "success": True,
            "message": f"Map saved successfully",
            "data": map_data
        }
    except Exception as e:
        logger.error(f"Error saving map for area_id {area_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save map: {str(e)}"
        )

@router.get("/{area_id}/map")
async def get_map_endpoint(
    area_id: int,
):
    """Lấy map theo area_id"""
    try:
        map_data = await get_map_by_area_id(area_id)
        
        if not map_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Map not found for area_id {area_id}"
            )
        
        return {
            "success": True,
            "data": map_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting map for area_id {area_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get map: {str(e)}"
        )
