from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from app.schemas.route import RouteCreate, RouteOut, RouteUpdate
from app.services.route_service import (
    create_route,
    get_route,
    get_routes,
    update_route,
    delete_route,
    get_routes_by_creator,
    get_routes_by_group_id,
)
from app.core.permissions import get_current_user
from shared.logging import get_logger
from typing import List

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/", response_model=RouteOut, status_code=status.HTTP_201_CREATED)
async def create_new_route(
    route_in: RouteCreate,
    current_user: dict = Depends(get_current_user)
):
    """Tạo route mới"""
    try:
        return await create_route(route_in, current_user["username"])
    except ValueError as e:
        logger.error(f"Route creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during route creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[RouteOut])
async def get_all_routes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Lấy danh sách tất cả routes (yêu cầu quyền routes:read)"""
    try:
        return await get_routes(skip=skip, limit=limit)
    except Exception as e:
        logger.error(f"Error getting routes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{route_id}", response_model=RouteOut)
async def get_route_by_id(
    route_id: str,
):
    """Lấy route theo MongoDB ID (yêu cầu quyền routes:read)"""
    try:
        route = await get_route(route_id)
        if not route:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Route not found"
            )
        return route
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting route {route_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{route_id}", response_model=RouteOut)
async def update_route_by_id(
    route_id: str,
    route_update: RouteUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Cập nhật route theo ID"""
    try:
        route = await update_route(route_id, route_update)
        if not route:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Route not found"
            )
        return route
    except ValueError as e:
        logger.error(f"Route update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during route update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{route_id}", status_code=status.HTTP_200_OK)
async def delete_route_by_id(
    route_id: str,
):
    """Xóa route và tất cả nodes trong route đó"""
    try:
        # Lấy thông tin route trước khi xóa
        route = await get_route(route_id)
        if not route:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Route not found"
            )
        
        success = await delete_route(route_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Route not found"
            )
        
        return {
            "message": f"Route '{route.route_name}' deleted successfully",
            "route_name": route.route_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during route deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/creator/{created_by}", response_model=List[RouteOut])
async def get_routes_by_creator_endpoint(
    created_by: str,
):
    """Lấy danh sách routes theo người tạo (yêu cầu routes:read)"""
    try:
        return await get_routes_by_creator(created_by)
    except Exception as e:
        logger.error(f"Error getting routes by creator {created_by}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/group/{group_id}", response_model=List[RouteOut])
async def get_routes_by_group_id_endpoint(
    group_id: int,
):
    """Lấy danh sách routes theo group_id"""
    try:
        return await get_routes_by_group_id(group_id)
    except Exception as e:
        logger.error(f"Error getting routes by group_id {group_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )