from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.schemas.node import NodeCreate, NodeOut, NodeUpdate
from app.services.node_service import (
    create_node,
    get_nodes,
    update_node,
    delete_node,
    get_nodes_by_area,
    get_available_areas
)
from shared.logging import get_logger
from typing import List

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/", response_model=NodeOut, status_code=status.HTTP_201_CREATED)
async def create_new_node(
    node_in: NodeCreate,
):
    """Tạo node mới"""
    try:
        return await create_node(node_in)
    except ValueError as e:
        logger.error(f"Node creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during node creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/", response_model=List[NodeOut])
async def get_all_nodes(
    node_type: str,
    area: str,
):
    """Lấy danh sách tất cả nodes (yêu cầu quyền nodes:read)"""
    try:
        return await get_nodes(node_type, area)
    except Exception as e:
        logger.error(f"Error getting nodes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{node_id}", response_model=NodeOut)
async def update_node_by_id(
    node_id: str,
    node_update: NodeUpdate,
):
    """Cập nhật node theo ID (yêu cầu quyền nodes:write)"""
    try:
        node = await update_node(node_id, node_update)
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )
        return node
    except ValueError as e:
        logger.error(f"Node update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during node update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node_by_id(
    node_id: str,
):
    """Xóa node theo ID (yêu cầu quyền nodes:delete)"""
    try:
        success = await delete_node(node_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during node deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/area/{area}", response_model=List[NodeOut])
async def get_nodes_by_area_endpoint(
    area: str,
):
    """Lấy danh sách nodes theo area"""
    try:
        return await get_nodes_by_area(area)
    except Exception as e:
        logger.error(f"Error getting nodes by area {area}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )



