from datetime import datetime, timezone
from app.core.database import get_collection
from shared.logging import get_logger
import asyncio
from typing import Dict, Any, Optional, List, Tuple
import contextlib
import json
import asyncio
import os
import re
import sys
import time
from .websocket_service import manager
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)
from ai.queue_store import SQLiteQueue
from app.schemas.end_slot import EndSlotRequest, EndSlotResponse
import requests

ai_dir = os.path.join(project_root, "ai")
queue = SQLiteQueue(os.path.join(ai_dir, "queues.db"))

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

async def put_to_service(payload: dict):
    group_id = str(payload.get("group_id"))
    payload["group_id"] = group_id
    payload["timestamp"] = time.time()

    node_name = payload["node_name"]

    match = re.search(r"^([^_]+).*?-(\d+)", node_name)
    if match:
        prefix = match.group(1)  # "L2"
        number = match.group(2)  # "1" (string)

    #Create structure spam_log
    if group_id not in task_service._log_spam:
        logger.info(f"Create spam log for group {group_id}")
        task_service._log_spam[group_id] = {}

    if prefix not in task_service._log_spam[group_id]:
        task_service._log_spam[group_id][prefix] = {}

    if number not in task_service._log_spam[group_id][prefix]:
        task_service._log_spam[group_id][prefix][number] = {}

    should_process = (task_service._log_spam[group_id][prefix][number] == {})

    # Tạo key nhận dạng payload
    key = str(payload.get("end"))

    # Nếu key đã tồn tại, không xử lý nữa (chống spam)
    if key in task_service._log_spam[group_id][prefix][number]:
        logger.info(f"Spam detected, skip: group_id={group_id}, key={key}")
        return {"status": "skip", "msg": "Payload already processed"}

    # Nếu chưa có thì lưu lại
    task_service._log_spam[group_id][prefix][number][key] = payload.copy()
    task_service._reverse_index[key] = (prefix, number)

    if should_process:
        try:
            logger.info(f"{payload['end']}, type: {type(payload['end'])}")
            saver = {
                "end_qr": payload['end'],
                "status": "empty",
            }
            # Gửi payload ra websocket
            clean_payload = {
                "type": "Monitor",
                "node_name": payload['node_name'],
                "prefix": prefix,
                "number": number
            }
            await task_service.publish_to_service(group_id, clean_payload)
            queue.publish("end_slot_request", payload['end'], saver)
            logger.info(f"End slot {key} marked as empty by user API")

        except Exception as e:
            logger.error(f"Error: {e}")

    return {"status": "success", "data": "Task added to service successfully"}      


async def track_task(payload: dict):
    order_id = payload.get("order_id") or payload.get("orderId")
    
    if not order_id:
        logger.error("order_id is required for tracking")
        return {"status": "error", "data": "order_id is required"}

    task_service._tracking_task[order_id] = {
        **payload
    }
    
    logger.info(f"Tracking task: order_id={order_id}, task_service._tracking_task={task_service._tracking_task}")
    return {"status": "success", "data": "Task tracked successfully"}

async def extract_task_by_group_id(data: dict):
    routes = get_collection("routes")

    route = await routes.find_one({"robot_list": {"$in": [data["device_code"]]}})
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

async def clear_monitor(group_id: str, order_id: str):
    order_id = str(order_id)

    if order_id not in task_service._tracking_task:
        return

    logger.info(f"Clearing order_id: {order_id}")
    task_data = task_service._tracking_task[order_id]
    end_qrs = str(task_data.get("end_qrs"))

    # Lấy prefix, number từ reverse_index
    if end_qrs not in task_service._reverse_index:
        logger.warning(f"Key {end_qrs} not found in reverse_index")
        del task_service._tracking_task[order_id]
        return

    prefix, number = task_service._reverse_index.pop(end_qrs)

    if group_id not in task_service._log_spam:
        logger.info(f"Group_id not found, remove tracking task {order_id}")
        del task_service._tracking_task[order_id]
        return

    group_dict = task_service._log_spam[group_id]

    if prefix not in group_dict or number not in group_dict[prefix]:
        logger.info(f"Prefix or number not found, remove tracking task {order_id}")
        del task_service._tracking_task[order_id]
        return

    number_dict = group_dict[prefix][number]

    # Xóa key hiện tại
    if end_qrs in number_dict:
        number_dict.pop(end_qrs, None)
        logger.info(f"Removed spam log: group={group_id}, prefix={prefix}, number={number}, key={end_qrs}")

    # Lấy key tiếp theo theo insert order (FIFO) trong cùng prefix+number
    next_payload = None
    if number_dict:
        next_key = next(iter(number_dict))
        next_payload = number_dict[next_key]

    if next_payload:
        try:
            clear_payload = {
                "type": "Monitor",
                "node_name": next_payload['node_name'],
                "prefix": prefix,
                "number": number,
            }
            await task_service.publish_to_service(group_id, clear_payload)
        except Exception as e:
            logger.error(f"Error publishing next qr: {e}")

        try:
            saver = {
                "end_qr": next_payload['end'],
                "status": "empty",
            }
            queue.publish("end_slot_request", next_payload['end'], saver)
            logger.info(f"Auto-processed next end_qr: {next_key}")
        except Exception as e:
            logger.error(f"Error publishing to queue: {e}")
    
    else:
        try:
            clear_payload = {
                "type": "Monitor",
                "prefix": prefix,
                "number": number,
            }
            logger.info(f"Clean {prefix}, {number}")
            await task_service.publish_to_service(group_id, clear_payload)
        except Exception as e:
            logger.error(f"Error publishing next qr: {e}")

    # Nếu hết key trong number → xóa number
    if not number_dict:
        group_dict[prefix].pop(number, None)
    # Nếu hết prefix → xóa prefix
    if not group_dict[prefix]:
        group_dict.pop(prefix, None)
    # Nếu hết group → xóa group
    if not group_dict:
        task_service._log_spam.pop(group_id, None)

    # Xóa order_id khỏi tracking
    del task_service._tracking_task[order_id]
    logger.info(f"Removed order_id: {order_id} from tracking")


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

    order_id_str = str(task_data["order_id"])
    first_str = order_id_str[0]

    if task_data["status"] in (21, 3) and first_str == "4":
        if order_id_str in task_service._continous_caller:
            unlock_payload = task_service._continous_caller[order_id_str]

            try:
                resp = await asyncio.to_thread(
                    requests.post,
                    "http://192.168.50.39:6868/api/slot/unblock",
                    json=unlock_payload,
                    timeout=10
                )
            except Exception as e:
                logger.error(f"Error sending unlock: {e}")

            finally:
                task_service._continous_caller.pop(order_id_str, None)
                logger.info(f"Removed unlock data for order_id={order_id_str} at 21")
    
    if task_data["status"] in (23, 3) and first_str == "2":
        if order_id_str in task_service._continous_caller:
            unlock_payload = task_service._continous_caller[order_id_str]

            try:
                resp = await asyncio.to_thread(
                    requests.post,
                    "http://192.168.50.39:6868/api/slot/unblock",
                    json=unlock_payload,
                    timeout=10
                )
            except Exception as e:
                logger.error(f"Error sending unlock: {e}")

            finally:
                task_service._continous_caller.pop(order_id_str, None)
                logger.info(f"Removed unlock data for order_id={order_id_str} at 23")

    if task_data["status"] == 22 or task_data["status"] == 3:
        await tasks_collection.insert_one(task_data)
        task_data["_id"] = str(task_data["_id"])

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

async def get_unlock_list(payload:dict):
    order_id = payload.get("order_id") or payload.get("orderId")
    unlock_point = payload.get("qr_unlock")
    
    if not order_id:
        logger.error("order_id is required for tracking")
        return {"status": "error", "data": "order_id is required"}

    task_service._continous_caller[order_id] = {'qr_code': unlock_point}
    
    logger.info(f"Tracking unlock task: order_id={order_id}, task_service._tracking_task={task_service._continous_caller}")
    return {"status": "success", "data": "Task tracked successfully"}


