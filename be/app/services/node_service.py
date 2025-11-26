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
        "process_code": node_in.process_code,
        "start": node_in.start,
        "end": node_in.end,
        "next_start": node_in.next_start,
        "next_end": node_in.next_end,
        "line": node_in.line,
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

            # Validate node_id
            if not node_id or not ObjectId.is_valid(node_id):
                # Node không tồn tại -> Tạo mới với ID được cung cấp
                new_node_data = {
                    "node_name": node_data["node_name"],
                    "node_type": node_data["node_type"],
                    "owner": node_data["owner"],
                    "process_code": node_data["process_code"],
                    "start": node_data["start"],
                    "end": node_data["end"],
                    "next_start": node_data.get("next_start"),
                    "next_end": node_data.get("next_end"),
                    "line": node_data.get("line"),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                await nodes.insert_one(new_node_data)
                created += 1
                logger.info(f"Created new node ID {node_id}: {node_data['node_name']}")
                continue
            
            # Find existing node by ID
            existing = await nodes.find_one({"_id": ObjectId(node_id)})
            
            if existing:
                # Update existing node (bao gồm cả node_name)
                update_data = {
                    "node_name": node_data["node_name"],
                    "node_type": node_data["node_type"],
                    "owner": node_data["owner"],
                    "process_code": node_data["process_code"],
                    "start": node_data["start"],
                    "end": node_data["end"],
                    "next_start": node_data.get("next_start"),
                    "next_end": node_data.get("next_end"),
                    "line": node_data.get("line"),
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
                continue
                
        except Exception as e:
            errors.append({
                "index": idx,
                "node_id": node_data.get("id"),
                "error": str(e)
            })
            logger.error(f"Error processing node {node_data.get('id')}: {e}")
    
    message = f"Processed {total} nodes: {updated} updated, {created} created"
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

def _get_caller_type_from_node_name(node_name: str) -> int:
    """Xác định type từ node_name
    Returns:
        0: PT - nếu phần cuối sau dấu - chỉ là số hoặc rỗng
        1: VL PHP - nếu phần cuối sau dấu - có chứa chữ cái
    """
    parts = node_name.split('-')
    last_part = parts[-1] if parts else ""
    
    # Kiểm tra xem phần cuối có chứa chữ cái không
    if last_part and any(c.isalpha() for c in last_part):
        return 1  # VL - có chữ cái
    else:
        return 0  # PT - chỉ số hoặc rỗng

async def get_nodes_advanced(owner: str) -> dict:
    """Lấy danh sách nodes theo owner và phân loại thành PT/VL, đồng thời nhóm theo node_type và line."""
    nodes = get_collection("nodes")
    cursor = nodes.find({"owner": owner})
    node_list = await cursor.to_list(length=None)
    
    # Phân loại nodes thành 2 loại: PT và VL, và nhóm theo node_type và line
    pt_nodes = {}  # type = 0 -> { node_type: { line: [NodeOut, ...] } }
    vl_nodes = {}  # type = 1 -> { node_type: { line: [NodeOut, ...] } }
    
    for node in node_list:
        node_out = NodeOut(**node, id=str(node["_id"]))
        caller_type = _get_caller_type_from_node_name(node_out.node_name)
        
        node_type_key = node_out.node_type
        line_key = node_out.line
        
        if caller_type == 0:
            if node_type_key not in pt_nodes:
                pt_nodes[node_type_key] = {}
            if line_key not in pt_nodes[node_type_key]:
                pt_nodes[node_type_key][line_key] = []
            pt_nodes[node_type_key][line_key].append(node_out)
        else:
            if node_type_key not in vl_nodes:
                vl_nodes[node_type_key] = {}
            if line_key not in vl_nodes[node_type_key]:
                vl_nodes[node_type_key][line_key] = []
            vl_nodes[node_type_key][line_key].append(node_out)
    
    return {
        "pt_nodes": pt_nodes,  # type = 0 -> { node_type: { line: [...] } }
        "vl_nodes": vl_nodes,  # type = 1 -> { node_type: { line: [...] } }
    }


async def process_caller(node: ProcessCaller, priority: Optional[int] = None) -> str:
    """Gọi process caller"""
    # # Nếu priority là None, sử dụng giá trị mặc định (ví dụ: 5)
    # if priority is None:
    #     priority = 5  # Giá trị mặc định, có thể thay đổi theo yêu cầu
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Tạo order_id duy nhất với format: owner_timestamp_uuid_short
    # Sử dụng 8 ký tự đầu của UUID để giảm độ dài nhưng vẫn đảm bảo tính duy nhất
    order_id = f"{node.owner}_{timestamp}_{str(uuid.uuid4())[:8]}"

    # Xác định type từ node_name
    type = _get_caller_type_from_node_name(node.node_name)

    if type == 0:
        if node.node_type == "supply" or node.node_type == "returns":
            payload = {
                "modelProcessCode": f"{node.process_code}", 
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
                "modelProcessCode": f"{node.process_code}", 
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

    elif type == 1:
        payload = {
            "modelProcessCode": f"{node.process_code}", 
            "priority": priority, 
            "fromSystem": "Thadosoft", 
            "orderId": order_id,  # Gán orderId bằng timestamp
            "taskOrderDetail": [ 
                {    
                    "taskPath": f"{node.start},{node.end},{node.next_start}", 
                } 
            ] 
        }

    else:
        raise ValueError("Invalid caller type")

    return payload
