import asyncio
import contextlib
import json
from typing import Any, Dict, Optional
from datetime import datetime
from .websocket_service import manager
from app.core.database import get_collection
from shared.logging import get_logger
from app.services.modbusTCP_service import modbus_device_manager

logger = get_logger("camera_ai_app")
class NotificationService:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        self._consumer_task: Optional[asyncio.Task] = None
        self.modbus = modbus_device_manager

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

    async def publish_to_device(self, area_id: str, route_id: str, payload: Dict[str, Any]) -> None:
        await self._queue.put({**payload, "area_id": area_id, "route_id": route_id})

    async def _consumer_loop(self) -> None:
        while True:
            event = await self._queue.get()
            area_id = event.pop("area_id", None)
            route_id = event.pop("route_id", None)
            try:
                message = json.dumps(event)
                await manager.broadcast_to_group(area_id, message)
                await manager.broadcast_to_route(route_id, message)
                await self.modbus.send_alert_to_group(area_id)
                logger.info(f"Notification successfully sent to area {area_id} and route {route_id}")
            except Exception as e:
                self._queue.task_done()

notification_service = NotificationService()

async def extract_notification_by_group_id(data: dict):
    """Chỉ bổ sung group_id, route_id từ bảng routes (theo device_name). Giữ nguyên area_id từ payload."""
    routes = get_collection("routes")
    route = await routes.find_one({"robot_list": {"$in": [data["device_number"]]}})
    if route:
        data["group_id"] = str(route["group_id"])
        data["route_id"] = str(route["route_id"])
        if data.get("area_id") is None or data.get("area_id") == "":
            data["area_id"] = str(route["area_id"])
        return {"status": "success", "data": "Extracted task by group id successfully"}
    else:
        data["group_id"] = data.get("group_id") or "No Group"
        data["route_id"] = data.get("route_id") or "No Route"
        if data.get("area_id") is None or data.get("area_id") == "":
            data["area_id"] = "No Area"
        return {"status": "error", "data": "Route not found"}

async def get_notification_by_device(
    device_num: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """
    Lấy thông báo theo device_number, có thể lọc theo khoảng thời gian.
    start_date / end_date: ISO string hoặc YYYY-MM-DD (so sánh với alarm_date).
    """
    notifications_collection = get_collection("notifications")

    # Tìm theo cả device_number lẫn device_name để khớp với dữ liệu từ robot
    query: dict = {"$or": [{"device_number": device_num}]}

    if start_date or end_date:
        date_filter: dict = {}
        if start_date:
            date_filter["$gte"] = start_date.strip()
        if end_date:
            # Nếu chỉ có ngày (YYYY-MM-DD) thì mở rộng đến cuối ngày
            end_str = end_date.strip()
            if len(end_str) == 10:
                end_str = end_str + "T23:59:59.999999"
            date_filter["$lte"] = end_str
        query["alarm_date"] = date_filter

    cursor = (
        notifications_collection
        .find(query, {"_id": 0})
        .sort("alarm_date", -1)
    )
    notifications = await cursor.to_list(length=None)

    return {
        "device_num": device_num,
        "start_date": start_date,
        "end_date": end_date,
        "total_items": len(notifications),
        "data": notifications,
    }

async def filter_notification(payload): 
    notifications_collection = get_collection("notifications")

    # area_id ưu tiên từ payload (areaId); extract chỉ bổ sung group_id/route_id
    area_id_from_payload = payload.get("areaId")
    notification_data = {
        "alarm_code": payload.get("alarmCode"),
        "device_name": payload.get("deviceName"),
        "device_number": payload.get("deviceNum"),
        "alarm_grade": payload.get("alarmGrade"),
        "alarm_status": payload.get("alarmStatus"),
        "area_id": str(area_id_from_payload) if area_id_from_payload is not None else None,
        "alarm_source": payload.get("alarmSource"),
        "status": payload.get("alarmStatus"),
        "type": "notification",
        "alarm_date": datetime.now().isoformat(),
    }

    await extract_notification_by_group_id(notification_data)

    if notification_data["alarm_status"] > 3:
        area_id = notification_data.get("area_id") 
        route_id = notification_data.get("route_id")
        await notification_service.publish_to_device(area_id, route_id, notification_data)
    elif notification_data["alarm_grade"] > 5:
        area_id = notification_data.get("area_id") 
        route_id = notification_data.get("route_id") 
        await notification_service.publish_to_device(area_id, route_id, notification_data)
    else:
        logger.info(f"No needed data!")

    if notification_data.get("area_id") is None:
        notification_data["area_id"] = "No Area"
    await notifications_collection.insert_one(notification_data)
    return {"status": "success", "data": "Notification sent successfully"}

async def get_notifications_from_db(page: int = 1, limit: int = 20, area_id: Optional[str] = None):
    notifications_collection = get_collection("notifications")

    query = {
        "alarm_status": {"$gt": 3},
        "alarm_grade":  {"$gt": 5},
    }
    if area_id is not None and str(area_id).strip() != "":
        query["area_id"] = str(area_id).strip()

    # Tính offset
    offset = (page - 1) * limit

    # Lấy dữ liệu có phân trang (và lọc theo area_id nếu có)
    notifications = (
        notifications_collection
        .find(query, {"_id": 0})
        .sort("alarm_date", -1)
        .skip(offset)
        .limit(limit)
    )

    # Convert cursor sang list
    notification_list = await notifications.to_list(length=limit)

    total_items = await notifications_collection.count_documents(query)

    total_pages = (total_items + limit - 1) // limit  # làm tròn lên

    return {
        "page": page,
        "limit": limit,
        "total_items": total_items,
        "total_pages": total_pages,
        "data": notification_list
    }

