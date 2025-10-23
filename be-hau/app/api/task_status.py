from fastapi import APIRouter, Request, HTTPException, Query
from app.api.agv_websocket import manager
from datetime import datetime
import json

router = APIRouter()

@router.post("/task-status")
async def receive_task_status(request: Request):
    payload = await request.json()
    print(payload)
    return {"status": "success"}


