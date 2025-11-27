from app.core.database import get_collection
from app.schemas.route import RouteCreate, RouteOut, RouteUpdate
from shared.logging import get_logger
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

logger = get_logger("camera_ai_app")

async def validate_area_exists(area_id: int) -> bool:
    """Kiểm tra xem area có tồn tại không theo area_id"""
    areas = get_collection("areas")
    area = await areas.find_one({"area_id": area_id})
    return area is not None

async def create_route(route_in: RouteCreate, created_by: str) -> RouteOut:
    """Tạo route mới"""
    routes = get_collection("routes")
    
    # Validate area tồn tại
    if not await validate_area_exists(route_in.area_id):
        logger.warning(f"Route creation failed: area '{route_in.area_id}' does not exist")
        raise ValueError("Area does not exist")
    
    # Kiểm tra xem route_id đã tồn tại chưa
    existing_id = await routes.find_one({"route_id": route_in.route_id})
    if existing_id:
        logger.warning(f"Route creation failed: route_id '{route_in.route_id}' already exists")
        raise ValueError("Route ID already exists")
    
    # Kiểm tra xem route_name đã tồn tại chưa
    existing_name = await routes.find_one({"route_name": route_in.route_name})
    if existing_name:
        logger.warning(f"Route creation failed: route_name '{route_in.route_name}' already exists")
        raise ValueError("Route name already exists")
    
    route_data = {
        "route_id": route_in.route_id,
        "route_name": route_in.route_name,
        "area_id": route_in.area_id,
        "group_id": route_in.group_id,
        "robot_list": route_in.robot_list,
        "created_by": created_by,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await routes.insert_one(route_data)
    logger.info(f"Route created successfully: {route_in.route_id} - {route_in.route_name}")
    
    # Lấy route vừa tạo để trả về
    created_route = await routes.find_one({"_id": result.inserted_id})
    return RouteOut(**created_route, id=str(created_route["_id"]))

async def get_route(route_id: str) -> Optional[RouteOut]:
    """Lấy route theo MongoDB ID"""
    routes = get_collection("routes")
    
    if not ObjectId.is_valid(route_id):
        logger.warning(f"Invalid route ID format: {route_id}")
        return None
    
    route = await routes.find_one({"_id": ObjectId(route_id)})
    if not route:
        logger.warning(f"Route not found: {route_id}")
        return None
    return RouteOut(**route, id=str(route["_id"]))

async def get_routes(skip: int = 0, limit: int = 100) -> List[RouteOut]:
    """Lấy danh sách tất cả routes"""
    routes = get_collection("routes")
    
    cursor = routes.find().skip(skip).limit(limit)
    route_list = await cursor.to_list(length=limit)
    
    return [RouteOut(**route, id=str(route["_id"])) for route in route_list]

async def update_route(route_id: str, route_update: RouteUpdate) -> Optional[RouteOut]:
    """Cập nhật route"""
    routes = get_collection("routes")
    
    if not ObjectId.is_valid(route_id):
        logger.warning(f"Invalid route ID format: {route_id}")
        return None
    
    # Kiểm tra route có tồn tại không
    existing_route = await routes.find_one({"_id": ObjectId(route_id)})
    if not existing_route:
        logger.warning(f"Route not found for update: {route_id}")
        return None
    
    # Chuẩn bị dữ liệu cập nhật
    update_data = {}
    for field, value in route_update.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    # Kiểm tra route_id mới có trùng không (nếu có thay đổi)
    if "route_id" in update_data:
        existing_id = await routes.find_one({
            "route_id": update_data["route_id"],
            "_id": {"$ne": ObjectId(route_id)}
        })
        if existing_id:
            logger.warning(f"Route update failed: route_id '{update_data['route_id']}' already exists")
            raise ValueError("Route ID already exists")
    
    # Kiểm tra route_name mới có trùng không (nếu có thay đổi)
    if "route_name" in update_data:
        existing_name = await routes.find_one({
            "route_name": update_data["route_name"],
            "_id": {"$ne": ObjectId(route_id)}
        })
        if existing_name:
            logger.warning(f"Route update failed: route_name '{update_data['route_name']}' already exists")
            raise ValueError("Route name already exists")
    
    # Validate area nếu có thay đổi
    if "area_id" in update_data:
        if not await validate_area_exists(update_data["area_id"]):
            logger.warning(f"Route update failed: area '{update_data['area_id']}' does not exist")
            raise ValueError("Area does not exist")
    
    # Kiểm tra created_by có tồn tại không (nếu có thay đổi)
    if "created_by" in update_data:
        users = get_collection("users")
        user_exists = await users.find_one({
            "username": update_data["created_by"],
            "is_active": True
        })
        if not user_exists:
            logger.warning(f"Route update failed: user '{update_data['created_by']}' does not exist or is inactive")
            raise ValueError("User does not exist or is inactive")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await routes.update_one(
        {"_id": ObjectId(route_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        logger.warning(f"No changes made to route: {route_id}")
        return None
    
    # Ghi log nếu có thay đổi created_by
    if "created_by" in update_data:
        old_owner = existing_route.get("created_by", "unknown")
        new_owner = update_data["created_by"]
        logger.info(f"Route '{existing_route['route_name']}' ownership changed from '{old_owner}' to '{new_owner}'")
    
    logger.info(f"Route updated successfully: {route_id}")
    
    # Lấy route đã cập nhật để trả về
    updated_route = await routes.find_one({"_id": ObjectId(route_id)})
    return RouteOut(**updated_route, id=str(updated_route["_id"]))

async def delete_route(route_id: str) -> bool:
    """Xóa route và tất cả nodes trong route đó"""
    routes = get_collection("routes")
    
    if not ObjectId.is_valid(route_id):
        logger.warning(f"Invalid route ID format: {route_id}")
        return False
    
    # Lấy thông tin route trước khi xóa
    route = await routes.find_one({"_id": ObjectId(route_id)})
    if not route:
        logger.warning(f"Route not found for deletion: {route_id}")
        return False
    
    route_name = route["route_name"]
    
    # Xóa route (không còn xóa nodes vì nodes không còn map với route)
    route_result = await routes.delete_one({"_id": ObjectId(route_id)})
    
    if route_result.deleted_count == 0:
        logger.warning(f"Route not found for deletion: {route_id}")
        return False
    
    logger.info(f"Route '{route_name}' deleted successfully")
    return True

async def get_routes_by_creator(created_by: str) -> List[RouteOut]:
    """Lấy danh sách routes theo người tạo"""
    routes = get_collection("routes")
    
    cursor = routes.find({"created_by": created_by})
    route_list = await cursor.to_list(length=None)
    
    return [RouteOut(**route, id=str(route["_id"])) for route in route_list]

async def get_routes_by_group_id(group_id: int) -> List[RouteOut]:
    """Lấy danh sách routes theo group_id"""
    routes = get_collection("routes")
    
    cursor = routes.find({"group_id": group_id})
    route_list = await cursor.to_list(length=None)
    
    return [RouteOut(**route, id=str(route["_id"])) for route in route_list]

