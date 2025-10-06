from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
from app.services.node_service import process_caller
from app.schemas.node import ProcessCaller
import httpx
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

router = APIRouter()

@router.post("/process-caller")
async def manual_caller(node: ProcessCaller, priority: Optional[int] = Query(None, description="Priority of the process caller")):
    payload = process_caller(node, priority)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post('http://192.168.1.169:8888/ics/taskOrder/addTask', json=payload)
        return {"status": response.code, "payload": payload}
    except Exception as e:
        logger.error(f"Error calling process caller: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
