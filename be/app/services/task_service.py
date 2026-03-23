from datetime import datetime, timezone, date, time, timedelta
from app.core.database import get_collection
from shared.logging import get_logger
import asyncio
from typing import Dict, Any, Optional, List, Tuple
import contextlib
import json
import asyncio
from .websocket_service import manager

logger = get_logger("camera_ai_app")

class TaskService:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        self._consumer_task: Optional[asyncio.Task] = None
        self._tracking_task: Dict[str, Dict[str, Any]] = {}
        self._log_spam: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._reverse_index: Dict[str, Tuple] = {}
        self._continous_caller: Dict[str, Dict[str, Any]] = {}

    async def start(self) -> None:
        if self._consumer_task is None:
            self._consumer_task = asyncio.create_task(self._consumer_loop())

    async def stop(self) -> None:
        if self._consumer_task:
            self._consumer_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._consumer_task
            self._consumer_task = None

    async def publish(self, payload: Dict[str, Any]) -> None:
        await self._queue.put(payload)

    async def publish_to_service(self, group_id: str, payload: Dict[str, Any]) -> None:
        await self._queue.put({"group_id": group_id, **payload})

    async def _consumer_loop(self) -> None:
        while True:
            event = await self._queue.get()
            group_id = event.pop("group_id", None)
            try:
                message = json.dumps(event)
                if group_id:
                    await manager.broadcast_to_group(group_id, message)
                else:
                    await manager.broadcast(message)
            finally:
                self._queue.task_done()

task_service = TaskService()    

async def extract_task_by_group_id(data: dict):
    routes = get_collection("routes")

    route = await routes.find_one({"robot_list": {"$in": [data["device_num"]]}})
    if route:
        data["area_id"] = str(route["area_id"])
        data["group_id"] = str(route["group_id"])
        data["route_id"] = str(route["route_id"])
        return {"status": "success", "data": "Extracted task by group id successfully"}
    else:
        data["area_id"] = "No Area"
        data["group_id"] = "No Group"
        data["route_id"] = "No Route"
        return {"status": "error", "data": "Route not found"}
    
async def filter_raw_task(payload):
    tasks_collection = get_collection("tasks")
    
    task_data = {
        "sub_task_status": payload.get("subTaskStatus"),
        "order_id": payload.get("orderId"),
        "device_code": payload.get("deviceCode"),
        "model_process_code": payload.get("modelProcessCode"),
        "device_num": payload.get("deviceNum"),
        "qr_code": payload.get("qrCode"),
        "shelf_number": payload.get("shelfNumber"),
        "status": payload.get("status"),
        "type": "task-status",
        "updated_at": datetime.now().isoformat(),
    }
    status = task_data.get("status")
    await extract_task_by_group_id(task_data)
    await tasks_collection.insert_one(task_data)

    if status == 8 or status == 3 or status == 9 or status == 7:
        await handle_calculation(task_data.get("order_id"), task_data.get("device_num"))
        
    if "_id" in task_data:
        task_data["_id"] = str(task_data["_id"])
    return {"status": "success", "tasks": task_data}

async def handle_calculation(order_id: str, device_num: str):
    task_collection = get_collection("tasks")
    task_detail_collection = get_collection("task_details")

    LABELS_PHASE = ["Get_shelf", "Transition", "Shelf_lifting", "Transition", "Shelf_transport", "Transition", "Shelf_release"]

    cursor = task_collection.find(
        {"order_id": order_id}
    ).sort("updated_at", 1)

    target_task = await cursor.to_list(length=None)

    durations = {}

    for i in range(1, len(target_task)):
        prev_time = datetime.fromisoformat(target_task[i-1]["updated_at"])
        curr_time = datetime.fromisoformat(target_task[i]["updated_at"])

        duration = (curr_time - prev_time).total_seconds()
        label = (
            "Cancel"
            if target_task[i]["status"] == 3
            else (LABELS_PHASE[i - 1] if i <= len(LABELS_PHASE) else "unknown")
        )

        durations[label] = durations.get(label, 0) + duration

    total_duration = (
        datetime.fromisoformat(target_task[-1]["updated_at"]) -
        datetime.fromisoformat(target_task[0]["updated_at"])
    ).total_seconds()

    start_time = datetime.fromisoformat(target_task[0]["updated_at"])
    end_time   = datetime.fromisoformat(target_task[-1]["updated_at"])
    from_to    = f"{start_time.strftime('%H:%M:%S %d/%m/%Y')} - {end_time.strftime('%H:%M:%S %d/%m/%Y')}"

    detail_doc = {
        "order_id": order_id,
        "device_num": device_num,
        **durations,
        "total_duration": total_duration,
        "from_to": from_to,
        "updated_at": datetime.now().isoformat()
    }

    await extract_task_by_group_id(detail_doc)

    await task_detail_collection.insert_one(detail_doc)

    return {
        "status": "success",
        "data": "Successfully calculated task duration"
    }
    

async def get_tasks_from_db(
    page: int = 1,
    limit: int = 20,
    area_id: Optional[str] = None,
    today_only: bool = False,
):
    tasks_collection = get_collection("tasks")

    query = {}
    # Chỉ lấy task có status 3, 7, 8, 9
    query["status"] = {"$in": [3, 7, 8, 9]}
    if area_id is not None and area_id.strip() != "":
        query["area_id"] = area_id.strip()

    if today_only:
        # updated_at trong DB lưu dạng ISO string (datetime.now().isoformat()), phải so sánh bằng chuỗi
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_end = datetime.combine(date.today(), time.max).isoformat()
        query["updated_at"] = {"$gte": today_start, "$lte": today_end}
        limit = 100_000
        offset = 0
    else:
        offset = (page - 1) * limit

    # Sắp xếp: updated_at gần nhất trước (giảm dần)
    tasks = (
        tasks_collection.find(query, {"_id": 0})
        .sort("updated_at", -1)
        .skip(offset)
        .limit(limit)
    )
    task_list = await tasks.to_list(length=limit)
    total_items = await tasks_collection.count_documents(query)
    total_pages = (total_items + limit - 1) // limit if limit > 0 else 0
    return {
        "page": page,
        "limit": limit,
        "total_items": total_items,
        "total_pages": total_pages,
        "data": task_list,
    }


async def get_task_details_by_total_duration_gt(
    page: int = 1,
    limit: int = 50,
    area_id: Optional[str] = None,
):
    task_details_collection = get_collection("task_details")

    query: dict = {}
    if area_id and area_id.strip():
        query["area_id"] = area_id.strip()

    offset = (page - 1) * limit
    cursor = (
        task_details_collection.find(query)
        .sort("updated_at", -1)
        .skip(offset)
        .limit(limit)
    )
    data_list = await cursor.to_list(length=limit)
    total_items = await task_details_collection.count_documents(query)
    total_pages = (total_items + limit - 1) // limit if limit > 0 else 0

    for item in data_list:
        if "_id" in item:
            item["_id"] = str(item["_id"])

    return {
        "page": page,
        "limit": limit,
        "total_items": total_items,
        "total_pages": total_pages,
        "data": data_list,
    }


async def get_task_details_by_order_id(order_id: str):
    """
    Lấy 1 document duy nhất trong collection task_details khớp với order_id.
    Mỗi order_id là duy nhất nên chỉ cần findOne.
    """
    task_details_collection = get_collection("task_details")

    doc = await task_details_collection.find_one({"order_id": order_id.strip()})
    if doc is None:
        return None

    if "_id" in doc:
        doc["_id"] = str(doc["_id"])

    return doc


async def delete_old_tasks_with_status_6(days_old: int = 30) -> Dict[str, Any]:
    tasks_collection = get_collection("tasks")
    threshold = datetime.now() - timedelta(days=days_old)
    threshold_iso = threshold.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    query = {"status": 6, "updated_at": {"$lt": threshold_iso}}
    result = await tasks_collection.delete_many(query)
    deleted = result.deleted_count
    logger.info(f"Deleted {deleted} old tasks with status 6 (older than {days_old} days)")
    return {"deleted_count": deleted, "status": "success"}


