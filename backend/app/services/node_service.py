from app.core.database import get_collection
from app.schemas.node import NodeCreate, NodeOut, NodeUpdate, ProcessCaller
from shared.logging import get_logger
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import json
from functools import lru_cache
import uuid


logger = get_logger("camera_ai_app")

async def create_node(node_in: NodeCreate) -> NodeOut:
    """Tạo node mới"""
    nodes = get_collection("nodes")
    users = get_collection("users")
    
    # Kiểm tra owner có tồn tại không
    user_exists = await users.find_one({"username": node_in.owner, "is_active": True})
    if not user_exists:
        logger.warning(f"Node creation failed: owner '{node_in.owner}' does not exist or is inactive")
        raise ValueError("Owner does not exist or is inactive")
    
    # Kiểm tra xem node_name đã tồn tại chưa (trong cùng owner)
    existing = await nodes.find_one({"node_name": node_in.node_name, "owner": node_in.owner, "node_type": node_in.node_type})
    if existing:
        logger.warning(f"Node creation failed: node_name '{node_in.node_name}' already exists for owner '{node_in.owner}'")
        raise ValueError("Node name already exists for this owner")
    
    
    node_data = {
        "node_name": node_in.node_name,
        "node_type": node_in.node_type,
        "owner": node_in.owner,
        "start": node_in.start,
        "end": node_in.end,
        "next_start": node_in.next_start,
        "next_end": node_in.next_end,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await nodes.insert_one(node_data)
    logger.info(f"Node created successfully: {node_in.node_name} for owner {node_in.owner}")
    
    # Lấy node vừa tạo để trả về
    created_node = await nodes.find_one({"_id": result.inserted_id})
    return NodeOut(**created_node, id=str(created_node["_id"]))

async def update_node(node_id: str, node_update: NodeUpdate) -> Optional[NodeOut]:
    """Cập nhật node"""
    nodes = get_collection("nodes")
    
    if not ObjectId.is_valid(node_id):
        logger.warning(f"Invalid node ID format: {node_id}")
        return None
    
    # Kiểm tra node có tồn tại không
    existing_node = await nodes.find_one({"_id": ObjectId(node_id)})
    if not existing_node:
        logger.warning(f"Node not found for update: {node_id}")
        return None
    
    # Chuẩn bị dữ liệu cập nhật
    update_data = {}
    for field, value in node_update.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    # Kiểm tra node_name mới có trùng không (nếu có thay đổi)
    if "node_name" in update_data:
        existing_name = await nodes.find_one({
            "node_name": update_data["node_name"],
            "owner": update_data.get("owner", existing_node["owner"]),
            "_id": {"$ne": ObjectId(node_id)}
        })
        if existing_name:
            logger.warning(f"Node update failed: node_name '{update_data['node_name']}' already exists for owner")
            raise ValueError("Node name already exists for this owner")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await nodes.update_one(
        {"_id": ObjectId(node_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        logger.warning(f"No changes made to node: {node_id}")
        return None
    
    logger.info(f"Node updated successfully: {node_id}")
    
    # Lấy node đã cập nhật để trả về
    updated_node = await nodes.find_one({"_id": ObjectId(node_id)})
    return NodeOut(**updated_node, id=str(updated_node["_id"]))

async def update_multiple_nodes(nodes_data: List[dict]) -> dict:
    """Cập nhật nhiều nodes theo ID"""
    nodes = get_collection("nodes")
    users = get_collection("users")
    
    total = len(nodes_data)
    updated = 0
    created = 0
    errors = []
    
    for idx, node_data in enumerate(nodes_data):
        try:
            node_id = node_data.get("id")
            
            # Validate node_id
            if not node_id or not ObjectId.is_valid(node_id):
                errors.append({
                    "index": idx,
                    "node_id": node_id,
                    "error": "Invalid or missing node ID"
                })
                continue
            
            # Validate owner exists
            owner = node_data.get("owner")
            user_exists = await users.find_one({"username": owner, "is_active": True})
            if not user_exists:
                errors.append({
                    "index": idx,
                    "node_id": node_id,
                    "error": f"Owner '{owner}' does not exist or is inactive"
                })
                continue
            
            # Find existing node by ID
            existing = await nodes.find_one({"_id": ObjectId(node_id)})
            
            if existing:
                # Update existing node (bao gồm cả node_name)
                update_data = {
                    "node_name": node_data["node_name"],
                    "node_type": node_data["node_type"],
                    "owner": node_data["owner"],
                    "start": node_data["start"],
                    "end": node_data["end"],
                    "next_start": node_data.get("next_start"),
                    "next_end": node_data.get("next_end"),
                    "updated_at": datetime.utcnow()
                }
                
                await nodes.update_one(
                    {"_id": ObjectId(node_id)},
                    {"$set": update_data}
                )
                updated += 1
                logger.info(f"Updated node ID {node_id}: {node_data['node_name']}")
            else:
                errors.append({
                    "index": idx,
                    "node_id": node_id,
                    "error": "Node not found"
                })
                logger.warning(f"Node not found: {node_id}")
                
        except Exception as e:
            errors.append({
                "index": idx,
                "node_id": node_data.get("id"),
                "error": str(e)
            })
            logger.error(f"Error processing node {node_data.get('id')}: {e}")
    
    message = f"Processed {total} nodes: {updated} updated"
    if errors:
        message += f", {len(errors)} errors"
    
    return {
        "total": total,
        "updated": updated,
        "created": created,
        "errors": errors,
        "message": message
    }

async def delete_node(node_id: str) -> bool:
    """Xóa node"""
    nodes = get_collection("nodes")
    
    if not ObjectId.is_valid(node_id):
        logger.warning(f"Invalid node ID format: {node_id}")
        return False
    
    result = await nodes.delete_one({"_id": ObjectId(node_id)})
    
    if result.deleted_count == 0:
        logger.warning(f"Node not found for deletion: {node_id}")
        return False
    
    logger.info(f"Node deleted successfully: {node_id}")
    return True

async def get_nodes(owner: str) -> List[NodeOut]:
    """Lấy danh sách nodes theo owner"""
    nodes = get_collection("nodes")
    
    cursor = nodes.find({"owner": owner})
    node_list = await cursor.to_list(length=None)
    
    return [NodeOut(**node, id=str(node["_id"])) for node in node_list]

async def get_nodes_by_owner_and_type(owner: str, node_type: str) -> List[NodeOut]:
    """Lấy danh sách nodes theo owner và type"""
    nodes = get_collection("nodes")
    
    cursor = nodes.find({"owner": owner, "node_type": node_type})
    node_list = await cursor.to_list(length=None)
    
    return [NodeOut(**node, id=str(node["_id"])) for node in node_list]


@lru_cache
def load_config_caller():
    with open("app/services/config_caller.json") as f:
        return json.load(f)

def get_process_code(node_type: str, owner: str) -> str:
    """Lấy process code từ config_caller.json - sử dụng owner thay vì area"""
    config_caller = load_config_caller()
    # Tạm thời sử dụng owner như area_id, có thể cần điều chỉnh logic
    return config_caller[owner][node_type]["modelProcessCode"]

def process_caller(node: ProcessCaller, priority: int) -> str:
    """Gọi process caller"""
    process_code = get_process_code(node.node_type, node.owner)
    order_id = str(uuid.uuid4())

    if node.node_type == "Supply" or node.node_type == "Return":
        payload = {
            "modelProcessCode": f"{process_code}", 
            "priority": priority, 
            "fromSystem": "Thadosoft", 
            "orderId": order_id,  # Gán orderId bằng timestamp
            "taskOrderDetail": [ 
                {    
                    "taskPath": f"{node.start},{node.end}", 
                } 
            ] 
        }
    else:
        payload = {
            "modelProcessCode": f"{process_code}", 
            "priority": priority, 
            "fromSystem": "Thadosoft", 
            "orderId": order_id,  # Gán orderId bằng timestamp
            "taskOrderDetail": [ 
                {    
                    "taskPath": f"{node.start},{node.end}", 
                }, 
                {    
                    "taskPath": f"{node.next_start},{node.next_end}", 
                } 
            ] 
        }

    return payload
