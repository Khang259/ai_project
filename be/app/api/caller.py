from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
from app.services.node_service import process_caller
from app.schemas.node import ProcessCaller
import httpx
from shared.logging import get_logger
from app.core.config import settings

logger = get_logger("camera_ai_app")
ics_url = f"http://{settings.ics_host}:7000"

router = APIRouter()

@router.post("/process-caller")
async def manual_caller(node: ProcessCaller, priority: Optional[int] = Query(None, description="Priority of the process caller")):
    payload = await process_caller(node, priority)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f'{ics_url}/ics/taskOrder/addTask', json=payload)
        return {"status": response.status_code, "payload": payload}
    except Exception as e:
        logger.error(f"Error calling process caller: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/cancel-task")
async def manual_cancel(order_id: str, dest_position: Optional[int] = Query(None, description="Destination of the current task")):
    payload = [{"orderId": order_id}]
    if dest_position:
        payload[0]["destPosition"] = dest_position
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f'{ics_url}/ics/out/task/cancelTask', json=payload)
        return {"status": response.status_code, "payload": payload}
    except Exception as e:  
        logger.error(f"Error calling process caller: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")




