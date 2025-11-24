from fastapi import APIRouter, Request, HTTPException, Query
from app.services.task_service import filter_raw_task, get_tasks_from_db
from app.services.websocket_service import manager
from datetime import datetime
import json

router = APIRouter()

@router.post("/task-status")
async def receive_task_status(request: Request):
    payload = await request.json()

    data = await filter_raw_task(payload)

    if data["status"] == "success":
        for group in data["data"]:
            message = json.dumps(group["tasks"])
            await manager.broadcast_to_device(group["group_id"], message)
        groups_count = len(data["data"])
        return {"status": "success", "message": f"Task successfully updated to {groups_count} groups"}
    else:
        return {"status": "error", "message": "Failed to extract data by group id"}


@router.get("/tasks")
async def get_tasks(page: int = 1, limit: int = 20):
    try:
        return await get_tasks_from_db(page, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

