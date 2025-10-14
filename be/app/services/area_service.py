from app.core.database import get_collection
from app.schemas.area import AreaCreate, AreaOut, AreaUpdate
from shared.logging import get_logger
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

logger = get_logger("camera_ai_app")

async def create_area(area_in: AreaCreate, created_by: str) -> AreaOut:
    """Tạo area mới"""
    areas = get_collection("areas")
    
    # Kiểm tra xem area_id đã tồn tại chưa
    existing_id = await areas.find_one({"area_id": area_in.area_id})
    if existing_id:
        logger.warning(f"Area creation failed: area_id '{area_in.area_id}' already exists")
        raise ValueError("Area ID already exists")
    
    # Kiểm tra xem area_name đã tồn tại chưa
    existing_name = await areas.find_one({"area_name": area_in.area_name})
    if existing_name:
        logger.warning(f"Area creation failed: area_name '{area_in.area_name}' already exists")
        raise ValueError("Area name already exists")
    
    area_data = {
        "area_id": area_in.area_id,
        "area_name": area_in.area_name,
        "created_by": created_by,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await areas.insert_one(area_data)
    logger.info(f"Area created successfully: {area_in.area_id} - {area_in.area_name}")
    
    # Lấy area vừa tạo để trả về
    created_area = await areas.find_one({"_id": result.inserted_id})
    return AreaOut(**created_area, id=str(created_area["_id"]))

async def get_area(area_id: str) -> Optional[AreaOut]:
    """Lấy area theo MongoDB ID"""
    areas = get_collection("areas")
    
    if not ObjectId.is_valid(area_id):
        logger.warning(f"Invalid area ID format: {area_id}")
        return None
    
    area = await areas.find_one({"_id": ObjectId(area_id)})
    if not area:
        logger.warning(f"Area not found: {area_id}")
        return None
    
    return AreaOut(**area, id=str(area["_id"]))

async def get_areas(skip: int = 0, limit: int = 100) -> List[AreaOut]:
    """Lấy danh sách tất cả areas"""
    areas = get_collection("areas")
    
    cursor = areas.find().skip(skip).limit(limit)
    area_list = await cursor.to_list(length=limit)
    
    return [AreaOut(**area, id=str(area["_id"])) for area in area_list]

async def update_area(area_id: str, area_update: AreaUpdate) -> Optional[AreaOut]:
    """Cập nhật area"""
    areas = get_collection("areas")
    
    if not ObjectId.is_valid(area_id):
        logger.warning(f"Invalid area ID format: {area_id}")
        return None
    
    # Kiểm tra area có tồn tại không
    existing_area = await areas.find_one({"_id": ObjectId(area_id)})
    if not existing_area:
        logger.warning(f"Area not found for update: {area_id}")
        return None
    
    # Chuẩn bị dữ liệu cập nhật
    update_data = {}
    for field, value in area_update.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    # Kiểm tra area_id mới có trùng không (nếu có thay đổi)
    if "area_id" in update_data:
        existing_id = await areas.find_one({
            "area_id": update_data["area_id"],
            "_id": {"$ne": ObjectId(area_id)}
        })
        if existing_id:
            logger.warning(f"Area update failed: area_id '{update_data['area_id']}' already exists")
            raise ValueError("Area ID already exists")
    
    # Kiểm tra area_name mới có trùng không (nếu có thay đổi)
    if "area_name" in update_data:
        existing_name = await areas.find_one({
            "area_name": update_data["area_name"],
            "_id": {"$ne": ObjectId(area_id)}
        })
        if existing_name:
            logger.warning(f"Area update failed: area_name '{update_data['area_name']}' already exists")
            raise ValueError("Area name already exists")
    
    # Kiểm tra created_by có tồn tại không (nếu có thay đổi)
    if "created_by" in update_data:
        users = get_collection("users")
        user_exists = await users.find_one({
            "username": update_data["created_by"],
            "is_active": True
        })
        if not user_exists:
            logger.warning(f"Area update failed: user '{update_data['created_by']}' does not exist or is inactive")
            raise ValueError("User does not exist or is inactive")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await areas.update_one(
        {"_id": ObjectId(area_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        logger.warning(f"No changes made to area: {area_id}")
        return None
    
    # Ghi log nếu có thay đổi created_by
    if "created_by" in update_data:
        old_owner = existing_area.get("created_by", "unknown")
        new_owner = update_data["created_by"]
        logger.info(f"Area '{existing_area['area_name']}' ownership changed from '{old_owner}' to '{new_owner}'")
    
    logger.info(f"Area updated successfully: {area_id}")
    
    # Lấy area đã cập nhật để trả về
    updated_area = await areas.find_one({"_id": ObjectId(area_id)})
    return AreaOut(**updated_area, id=str(updated_area["_id"]))

async def delete_area(area_id: str) -> bool:
    """Xóa area và tất cả nodes trong area đó"""
    areas = get_collection("areas")
    nodes = get_collection("nodes")
    
    if not ObjectId.is_valid(area_id):
        logger.warning(f"Invalid area ID format: {area_id}")
        return False
    
    # Lấy thông tin area trước khi xóa
    area = await areas.find_one({"_id": ObjectId(area_id)})
    if not area:
        logger.warning(f"Area not found for deletion: {area_id}")
        return False
    
    area_name = area["area_name"]
    
    # Xóa area (không còn xóa nodes vì nodes không còn map với area)
    area_result = await areas.delete_one({"_id": ObjectId(area_id)})
    
    if area_result.deleted_count == 0:
        logger.warning(f"Area not found for deletion: {area_id}")
        return False
    
    logger.info(f"Area '{area_name}' deleted successfully")
    return True

async def get_areas_by_creator(created_by: str) -> List[AreaOut]:
    """Lấy danh sách areas theo người tạo"""
    areas = get_collection("areas")
    
    cursor = areas.find({"created_by": created_by})
    area_list = await cursor.to_list(length=None)
    
    return [AreaOut(**area, id=str(area["_id"])) for area in area_list]

async def check_area_has_cameras(area_id: int) -> bool:
    """Kiểm tra xem area có đang được sử dụng bởi cameras không"""
    cameras = get_collection("cameras")
    
    camera_count = await cameras.count_documents({"area": area_id})
    return camera_count > 0

async def get_area_camera_count(area_id: int) -> int:
    """Lấy số lượng cameras trong area"""
    cameras = get_collection("cameras")
    
    return await cameras.count_documents({"area": area_id})

async def get_available_owners() -> List[str]:
    """Lấy danh sách các user có thể làm owner (từ users collection)"""
    users = get_collection("users")
    
    cursor = users.find({"is_active": True}, {"username": 1})
    user_list = await cursor.to_list(length=None)
    
    return [user["username"] for user in user_list]

async def save_map(map: dict, area_id: int):
    """Lưu map vào database - xóa map cũ nếu có và thêm map mới"""
    maps = get_collection("maps")
    
    # Kiểm tra xem đã có map của area_id này chưa
    existing_map = await maps.find_one({"area_id": area_id})
    
    if existing_map:
        # Xóa map cũ
        delete_result = await maps.delete_one({"area_id": area_id})
        logger.info(f"Deleted existing map for area_id {area_id} (deleted count: {delete_result.deleted_count})")
    
    # Thêm map mới
    payload = {
        "area_id": area_id,
        "data": map,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await maps.insert_one(payload)
    logger.info(f"Saved new map for area_id {area_id} (map_id: {result.inserted_id})")
    
    return map

async def get_map_by_area_id(area_id: int) -> Optional[dict]:
    """Lấy map theo area_id"""
    maps = get_collection("maps")
    
    map_data = await maps.find_one({"area_id": area_id})
    
    if not map_data:
        logger.warning(f"Map not found for area_id: {area_id}")
        return None
    
    return map_data["data"]