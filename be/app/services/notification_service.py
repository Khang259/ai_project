import asyncio
import contextlib
import json
from typing import Any, Dict, Optional

from .websocket_service import manager

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
                    await manager.broadcast_to_device(device, message)
                else:
                    await manager.broadcast(message)
            finally:
                self._queue.task_done()

notification_service = NotificationService()

async def filter_notification(payload):
    if isinstance(payload, dict):
        payload = [payload]

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
        group_id = task_data["group_id"]
        if group_id not in grouped:
            grouped[group_id] = []
        grouped[group_id].append(task_data)
    
    # 👇 Chuyển dict thành list để frontend dễ dùng
    grouped_list = [{"group_id": gid, "tasks": tasks} for gid, tasks in grouped.items()]

    return {"status": "success", "data": grouped_list}
