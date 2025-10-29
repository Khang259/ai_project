from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.schemas.node import NodeCreate, NodeOut, NodeUpdate, NodeBatchUpdate, NodeBatchUpdateResponse, NodesAdvancedResponse
from app.services.node_service import (
    create_node,
    get_nodes,
    update_node,
    update_multiple_nodes,
    delete_node,
    get_nodes_by_owner_and_type,
    get_nodes_advanced,
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
async def get_nodes_by_owner(
    owner: str,
):
    """Lấy danh sách nodes theo owner"""
    try:
        return await get_nodes(owner)
    except Exception as e:
        logger.error(f"Error getting nodes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/batch", response_model=NodeBatchUpdateResponse)
async def batch_update_nodes(
    batch_update: NodeBatchUpdate,
):
    """Cập nhật hoặc tạo nhiều nodes với dữ liệu khác nhau (upsert)"""
    try:
        # Convert NodeBatchUpdateItem objects to dicts
        nodes_data = [node.dict() for node in batch_update.nodes]
        result = await update_multiple_nodes(nodes_data)
        return NodeBatchUpdateResponse(**result)
    except Exception as e:
        logger.error(f"Unexpected error during batch update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{node_id}", response_model=NodeOut)
async def update_node_by_id(
    node_id: str,
    node_update: NodeUpdate,
):
    """Cập nhật một node theo ID"""
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

@router.get("/owner/{owner}/{node_type}", response_model=List[NodeOut])
async def get_nodes_by_owner_and_type_endpoint(
    owner: str,
    node_type: str,
):
    """Lấy danh sách nodes theo owner và type"""
    try:
        return await get_nodes_by_owner_and_type(owner, node_type)
    except Exception as e:
        logger.error(f"Error getting nodes by owner {owner}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/advanced/{owner}", response_model=NodesAdvancedResponse)
async def get_nodes_advanced_endpoint(
    owner: str,
):
    """Lấy danh sách nodes theo owner và phân loại theo PT/VL, node_type và line"""
    try:
        result = await get_nodes_advanced(owner)
        return NodesAdvancedResponse(**result)
    except Exception as e:
        logger.error(f"Error getting advanced nodes for owner {owner}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )



