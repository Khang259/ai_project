from app.core.database import get_collection
from app.schemas.node import NodeCreate, NodeOut, NodeUpdate, ProcessCaller
from shared.logging import get_logger
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import json


logger = get_logger("camera_ai_app")

async def create_node(node_in: NodeCreate) -> NodeOut:
    """Tạo node mới"""
    nodes = get_collection("nodes")
    areas = get_collection("areas")
    
    # Kiểm tra area có tồn tại không
    area_exists = await areas.find_one({"area_name": node_in.area})
    if not area_exists:
        logger.warning(f"Node creation failed: area '{node_in.area}' does not exist")
        raise ValueError("Area does not exist")
    
    # Kiểm tra xem node_name đã tồn tại chưa
    existing = await nodes.find_one({"node_name": node_in.node_name, "area": node_in.area, "node_type": node_in.node_type})
    if existing:
        logger.warning(f"Node creation failed: node_name '{node_in.node_name}' already exists")
        raise ValueError("Node name already exists")
    
    # Kiểm tra xem vị trí (row, column) đã được sử dụng chưa trong cùng area
    existing_position = await nodes.find_one({
        "row": node_in.row,
        "column": node_in.column,
        "area": node_in.area
    })

    if existing_position:
        logger.warning(f"Node creation failed: position ({node_in.row}, {node_in.column}) already occupied in area '{node_in.area}'")
        raise ValueError("Position already occupied in this area")
    
    node_data = {
        "node_name": node_in.node_name,
        "node_type": node_in.node_type,
        "row": node_in.row,
        "column": node_in.column,
        "area": node_in.area,
        "start": node_in.start,
        "end": node_in.end,
        "next_start": node_in.next_start,
        "next_end": node_in.next_end,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await nodes.insert_one(node_data)
    logger.info(f"Node created successfully: {node_in.node_name} in area {node_in.area}")
    
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
            "area": update_data.get("area", existing_node["area"]),
            "_id": {"$ne": ObjectId(node_id)}
        })
        if existing_name:
            logger.warning(f"Node update failed: node_name '{update_data['node_name']}' already exists")
            raise ValueError("Node name already exists")
    
    # Kiểm tra vị trí mới có trùng không (nếu có thay đổi)
    if "row" in update_data or "column" in update_data:
        new_row = update_data.get("row", existing_node["row"])
        new_column = update_data.get("column", existing_node["column"])
        
        existing_position = await nodes.find_one({
            "row": new_row,
            "column": new_column,
            "area": update_data.get("area", existing_node["area"]),
            "_id": {"$ne": ObjectId(node_id)}
        })
        if existing_position:
            logger.warning(f"Node update failed: position ({new_row}, {new_column}) already occupied")
            raise ValueError("Position already occupied")
    
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

async def get_nodes(node_type: str, area: str) -> List[NodeOut]:
    """Lấy danh sách nodes theo area"""
    nodes = get_collection("nodes")
    
    cursor = nodes.find({"node_type": node_type, "area": area})
    node_list = await cursor.to_list(length=None)
    
    return [NodeOut(**node, id=str(node["_id"])) for node in node_list]

async def get_nodes_by_area_and_type(area: str, node_type: str) -> List[NodeOut]:
    """Lấy danh sách nodes theo area"""
    nodes = get_collection("nodes")
    
    cursor = nodes.find({"area": area, "node_type": node_type})
    node_list = await cursor.to_list(length=None)
    
    return [NodeOut(**node, id=str(node["_id"])) for node in node_list]


def get_process_code(node_type: str, area: str) -> str:
    """Lấy process code từ config_caller.json"""
    with open("app/services/config_caller.json", "r") as f:
        config_caller = json.load(f)
    return config_caller[area][node_type]["modelProcessCode"]

def process_caller(node: ProcessCaller, priority: int) -> str:
    """Gọi process caller"""
    process_code = get_process_code(node.node_type, node.area)
    order_id = datetime.now().timestamp()

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

def cancel_task(order_id: str) -> bool:
    """Hủy task"""
    return True
