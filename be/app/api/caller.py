from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
from app.services.node_service import process_caller, process_caller_WE
from app.services.monitor_service import increment_produced_quantity_by_node_end
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

@router.post("/process-caller-we")
async def manual_caller_we(node: ProcessCaller):
    """Process caller cho xưởng hàn - gọi ICS API và trả về kết quả"""
    try:
        payload = await process_caller_WE(node)
        async with httpx.AsyncClient() as client:
            response = await client.post(f'{ics_url}/ics/taskOrder/addTask', json=payload)
            response_data = response.json()
            
            # Chỉ check code == 1000 trong response body (ICS đã xử lý thành công)
            if response_data.get("code") == 2014:
                return {
                    "success": True,
                    "message": "Tạo task thành công cho xưởng hàn",
                    "orderId": payload.get("orderId")
                }
            else:
                # ICS trả về lỗi - raise với status_code = code từ ICS
                error_code = response_data.get("code") or 1
                error_message = response_data.get("desc") or "RCS không trả về"
                raise HTTPException(status_code=error_code, detail=error_message)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calling process caller WE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

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




