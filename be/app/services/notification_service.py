import asyncio
import contextlib
import json
from typing import Any, Dict, Optional
from datetime import datetime
from .websocket_service import manager
from app.core.database import get_collection
class NotificationService:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        self._consumer_task: Optional[asyncio.Task] = None

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

    async def publish_to_device(self, device_code: str, payload: Dict[str, Any]) -> None:
        await self._queue.put({"device_code": device_code, **payload})

    async def _consumer_loop(self) -> None:
        while True:
            event = await self._queue.get()
            device = event.pop("device_code", None)
            try:
                message = json.dumps(event)
                if device:
                    await manager.broadcast_to_group(device, message)
                else:
                    await manager.broadcast(message)
            finally:
                self._queue.task_done()

notification_service = NotificationService()

async def extract_notification_by_group_id(data: dict):
    routes = get_collection("routes")

    route = await routes.find_one({"robot_list": {"$in": [data["device_name"]]}})
    if route:
        data["group_id"] = str(route["group_id"])
        data["route_name"] = route["route_name"]
        return {"status": "success", "data": "Extracted task by group id successfully"}
    else:
        data["group_id"] = "No Group"
        data["route_name"] = "No Route"
        return {"status": "error", "data": "Route not found"}

async def filter_notification(payload):
    if isinstance(payload, dict):
        payload = [payload]

    for record in payload:
        notification_data = {
            "alarm_code": record.get("alarmCode"),
            "device_name": record.get("deviceName"),
            "alarm_grade": record.get("alarmGrade"),
            "alarm_status": record.get("alarmStatus"),
            "area_id": record.get("areaId"),
            "alarm_source": record.get("alarmSource"),
            "status": record.get("status"),
            "alarm_date": datetime.now().isoformat(),
        }

        if notification_data["alarm_status"] > 3:
            await extract_notification_by_group_id(notification_data)
            await notification_service.publish_to_device(notification_data["group_id"], notification_data)
        elif notification_data["alarm_grade"] > 5:
            await extract_notification_by_group_id(notification_data)
            await notification_service.publish_to_device(notification_data["group_id"], notification_data)
        else:
            return {"status": "error", "data": "Notification not found"}

    return {"status": "success", "data": "Notification sent successfully"}
