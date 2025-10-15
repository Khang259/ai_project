from fastapi import APIRouter, HTTPException, status, Query
from app.schemas.camera import CameraCreate, CameraOut, CameraUpdate
from app.services.camera_service import (
    create_camera,
    get_camera,
    get_cameras,
    get_cameras_by_area,
    update_camera,
    delete_camera,
    get_camera_count_by_area,
)
from shared.logging import get_logger
from typing import List

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/", response_model=CameraOut, status_code=status.HTTP_201_CREATED)
async def create_new_camera(
    camera_in: CameraCreate,
):
    """Tạo camera mới"""
    try:
        return await create_camera(camera_in)
    except ValueError as e:
        logger.error(f"Camera creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during camera creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[CameraOut])
async def get_all_cameras(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Lấy danh sách tất cả cameras"""
    try:
        return await get_cameras(skip=skip, limit=limit)
    except Exception as e:
        logger.error(f"Error getting cameras: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{camera_id}", response_model=CameraOut)
async def get_camera_by_id(
    camera_id: str,
):
    """Lấy camera theo MongoDB ID"""
    try:
        camera = await get_camera(camera_id)
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        return camera
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting camera {camera_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{camera_id}", response_model=CameraOut)
async def update_camera_by_id(
    camera_id: str,
    camera_update: CameraUpdate,
):
    """Cập nhật camera theo ID"""
    try:
        camera = await update_camera(camera_id, camera_update)
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        return camera
    except ValueError as e:
        logger.error(f"Camera update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during camera update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{camera_id}", status_code=status.HTTP_200_OK)
async def delete_camera_by_id(
    camera_id: str,
):
    """Xóa camera"""
    try:
        # Lấy thông tin camera trước khi xóa
        camera = await get_camera(camera_id)
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        success = await delete_camera(camera_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        return {
            "message": f"Camera '{camera.camera_name}' deleted successfully",
            "camera_name": camera.camera_name
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during camera deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/area/{area_id}/cameras", response_model=List[CameraOut])
async def get_cameras_by_area_endpoint(
    area_id: int,
):
    """Lấy danh sách cameras theo area"""
    try:
        return await get_cameras_by_area(area_id)
    except Exception as e:
        logger.error(f"Error getting cameras by area {area_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/area/{area_id}/count")
async def get_camera_count_by_area_endpoint(
    area_id: int,
):
    """Lấy số lượng cameras trong area"""
    try:
        camera_count = await get_camera_count_by_area(area_id)
        return {
            "area_id": area_id,
            "camera_count": camera_count
        }
    except Exception as e:
        logger.error(f"Error getting camera count for area {area_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
