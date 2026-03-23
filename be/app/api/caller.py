from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
from app.services.node_service import process_caller, process_caller_WE
from app.services.monitor_service import increment_produced_quantity_by_node_end
from app.api.agv_websocket import broadcast_monitor_data
from app.schemas.node import ProcessCaller
import httpx,requests
from shared.logging import get_logger
from app.core.config import settings

logger = get_logger("camera_ai_app")
ics_url = f"http://{settings.ics_host}:7000"

router = APIRouter()

@router.post("/process-caller")
async def manual_caller(node: ProcessCaller, priority: Optional[int] = Query(None, description="Priority of the process caller")):
    payload = await process_caller(node, priority)
    try:
        response = requests.post(
            f"{ics_url}/ics/taskOrder/addTask",
            json=payload,
            timeout=5
        )
        logger.info(f"{response}")
        return {"status": "success", "payload": payload}
    except Exception as e:
        logger.error(f"Error calling process caller: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/process-caller-we")
async def manual_caller_we(node: ProcessCaller):
    """Process caller cho xưởng hàn - gọi ICS API và trả về kết quả"""
    try:
        payload = await process_caller_WE(node)
        async with httpx.AsyncClient() as client:
            print("Day la noi gui den:",f'{ics_url}/ics/taskOrder/addTask')
            response = await client.post(f'{ics_url}/ics/taskOrder/addTask', json=payload)
            response_data = response.json()
            
            logger.info(f"ICS API response: {response_data}")
            
            # Lấy code và đảm bảo so sánh đúng (có thể là int hoặc string)
            code = response_data.get("code")
            
            # Chỉ check code == 1000 hoặc 2014 trong response body (ICS đã xử lý thành công)
            if code == 1000 or code == 2014 or str(code) == "2014" or str(code) == "1000":
                try:
                    await increment_produced_quantity_by_node_end(node.end)
                    await broadcast_monitor_data()
                    logger.info(f"Incremented monitor quantity for node_end: {node.end}")
                except Exception as monitor_error:
                    # Log lỗi nhưng không fail request vì task đã được tạo thành công
                    logger.error(f"Error incrementing monitor quantity for node_end {node.end}: {str(monitor_error)}")
        
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
        logger.error(f"Error calling process caller WE: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/cancel-task")
async def manual_cancel(order_id: str, dest_position: Optional[int] = Query(None, description="Destination of the current task")):
    payload = [{"orderId": order_id}]
    if dest_position:
        payload[0]["destPosition"] = dest_position
    try:
        response = requests.post(
            f"{ics_url}/ics/out/task/cancelTask",
            json=payload,
            timeout=5
        )
        return {"status": "success", "payload": payload}
    except Exception as e:  
        logger.error(f"Error calling process caller: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")




