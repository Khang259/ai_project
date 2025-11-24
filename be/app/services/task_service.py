from datetime import datetime
from app.core.database import get_collection
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

async def extract_task_by_group_id(data: dict):
    routes = get_collection("routes")

    route = await routes.find_one({"robot_list": {"$in": [data["device_code"]]}})
    if route:
        data["group_id"] = str(route["group_id"])
        data["route_name"] = route["route_name"]
        return {"status": "success", "data": "Extracted task by group id successfully"}
    else:
        data["group_id"] = "No Group"
        data["route_name"] = "No Route"
        return {"status": "error", "data": "Route not found"}

async def filter_raw_task(payload):
    # if isinstance(payload, dict):
    #     payload = [payload]

    tasks_collection = get_collection("tasks")

    task_list = []
    grouped = {}
    for record in payload:
        task_data = {
            "order_id": record.get("orderId"),
            "device_code": record.get("deviceCode"),
            "model_process_code": record.get("modelProcessCode"),
            "device_num": record.get("deviceNum"),
            "qr_code": record.get("qrCode"),
            "shelf_number": record.get("shelfNumber"),
            "status": record.get("status"),
            "updated_at": datetime.now().isoformat(),
        }
        await extract_task_by_group_id(task_data)
        task_list.append(task_data)
        group_id = task_data["group_id"]
        if group_id not in grouped:
            grouped[group_id] = []
        grouped[group_id].append(task_data.copy())
    
    if len(task_list) > 0:
        await tasks_collection.insert_many(task_list)
    # 👇 Chuyển dict thành list để frontend dễ dùng
    grouped_list = [{"group_id": gid, "tasks": tasks} for gid, tasks in grouped.items()]

    return {"status": "success", "data": grouped_list}


async def get_tasks_from_db(page: int = 1, limit: int = 20):
    tasks_collection = get_collection("tasks")

    offset = (page - 1) * limit
    tasks = tasks_collection.find({}, {"_id": 0}).skip(offset).limit(limit)
    task_list = await tasks.to_list(length=limit)
    total_items = await tasks_collection.count_documents({})
    total_pages = (total_items + limit - 1) // limit
    return {
        "page": page,
        "limit": limit,
        "total_items": total_items,
        "total_pages": total_pages,
        "data": task_list
    }
