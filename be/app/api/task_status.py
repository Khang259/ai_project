from fastapi import APIRouter, Request, HTTPException, Query
from app.services.task_service import filter_raw_task, get_tasks_from_db, put_to_service, track_task
from app.services.websocket_service import manager
import json
from shared.logging import get_logger

router = APIRouter()
logger = get_logger("camera_ai_app")

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
    # return {"status": "success", "data": data}

    # if data["status"] == "success":
    #     message = json.dumps(data["tasks"])
    #     await manager.broadcast_to_group(data["tasks"]["group_id"], message)
    #     await manager.broadcast_to_route(data["tasks"]["route_id"], message)
    #     logger.info(f"Task successfully updated to group {data['tasks']['group_id']} and route {data['tasks']['route_id']}")
    #     return {"status": "success", "message": f"Task successfully updated to group {data['tasks']['group_id']}"}
    # else:
    #     return {"status": "error", "message": "Failed to extract data by group id"}


@router.get("/tasks")
async def get_tasks(page: int = 1, limit: int = 20):
    try:
        return await get_tasks_from_db(page, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-monitor")
async def clear_monitor(request: Request):
    payload = await request.json()
    try:
        logger.info(f"Clearing monitor: {payload}")
        return await put_to_service(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track-task")
async def tracking_task(request: Request):
    payload = await request.json()
    try:
        logger.info(f"Tracking task: {payload}")
        return await track_task(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))