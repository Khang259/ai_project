from fastapi import APIRouter, Request, HTTPException, Query
from app.services.task_service import filter_raw_task
from app.services.websocket_service import manager
from datetime import datetime
import json

router = APIRouter()

@router.post("/task-status")
async def receive_task_status(request: Request):
    payload = await request.json()
    print(payload)

    data = await filter_raw_task(payload)

    if data["status"] == "success":
        for group in data["data"]:
            message = json.dumps(group["tasks"])
            await manager.broadcast_to_device(group["group_id"], message)
        return {"status": "success", "message": f"Task successfully updated to {len(data["data"])} groups"}
    else:
        return {"status": "error", "message": "Failed to extract data by group id"}



