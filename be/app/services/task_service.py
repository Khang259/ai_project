from datetime import datetime
from app.core.database import get_collection
from shared.logging import get_logger
import asyncio
from typing import Dict, Any, Optional, List
import contextlib
import json
from .websocket_service import manager

logger = get_logger("camera_ai_app")

class TaskService:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        self._consumer_task: Optional[asyncio.Task] = None
        self._tracking_task: Dict[str, Dict[str, Any]] = {}

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

async def put_to_service(payload: dict):
    #logic clear monitor
    payload["group_id"] = str(payload.get("group_id"))
    payload["type"] = "Initial"

    crafted_payload = payload.copy()
    #Send initial monitor
    await task_service.publish_to_service(crafted_payload["group_id"], crafted_payload)

    return {"status": "success", "data": "Task added to service successfully"}

async def track_task(payload: dict):
    # Tracking task - Nested structure: {group_id: {order_id: {...}}}
    # group_id = str(payload["group_id"])
    order_id = payload.get("order_id") or payload.get("orderId")
    
    if not order_id:
        logger.error("order_id is required for tracking")
        return {"status": "error", "data": "order_id is required"}
    
    # Initialize group if not exists
    # if group_id not in task_service._tracking_task:
    #     task_service._tracking_task[group_id] = {}
    
    # Tracking by order_id
    # task_service._tracking_task[group_id][order_id] = {
    #     **payload
    # }

    task_service._tracking_task[order_id] = {
        **payload
    }
    
    logger.info(f"Tracking task: order_id={order_id}, task_service._tracking_task={task_service._tracking_task}")
    return {"status": "success", "data": "Task tracked successfully"}

async def extract_task_by_group_id(data: dict):
    routes = get_collection("routes")

    route = await routes.find_one({"robot_list": {"$in": [data["device_code"]]}})
    if route:
        data["area_id"] = route["area_id"]
        data["group_id"] = str(route["group_id"])
        data["route_id"] = route["route_id"]
        return {"status": "success", "data": "Extracted task by group id successfully"}
    else:
        data["area_id"] = "No Area"
        data["group_id"] = "No Group"
        data["route_id"] = "No Route"
        return {"status": "error", "data": "Route not found"}

async def clear_monitor(group_id: str, order_id: str):
    # if group_id in task_service._tracking_task:
    #     tracked_group = task_service._tracking_task[group_id]
    if order_id in task_service._tracking_task:
        logger.info(f"Clearing order_id: {order_id}")

        #Send clear monitor command
        clear_payload = {
            "type": "Clear",
            "group_id": group_id,
            "orderId": order_id,
            "end_qrs": task_service._tracking_task[order_id]["end_qrs"],
        }
        await task_service.publish_to_service(group_id, clear_payload)

        #Remove order_id from group
        del task_service._tracking_task[order_id]
        logger.info(f"Removed order_id: {order_id} from group {group_id}")

        # # If group is empty, remove the group
        # if not task_service._tracking_task:
        #     del task_service._tracking_task[group_id]
        #     logger.info(f"Removed empty group {group_id} from tracking")
    else:
        return
    # else:
    #     return

async def filter_raw_task(payload):
    tasks_collection = get_collection("tasks")
    
    task_data = {
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
    await extract_task_by_group_id(task_data)
    group_id = task_data["group_id"]

    if task_data["status"] == 20 or task_data["status"] == 3:
        await clear_monitor(group_id, task_data["order_id"])
    
    if task_data["status"] == 40:
        await tasks_collection.insert_one(task_data)

    return {"status": "success", "tasks": task_data}


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
