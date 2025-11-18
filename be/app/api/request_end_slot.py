import sys
import os
from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone

# Add parent directory to path để import queue_store
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)

from ai.queue_store import SQLiteQueue
from app.schemas.end_slot import EndSlotRequest, EndSlotResponse
from shared.logging import get_logger

router = APIRouter()
logger = get_logger("camera_ai_app")

# Sử dụng queues.db từ thư mục ai (cùng cấp với be)
ai_dir = os.path.join(project_root, "ai")
queue = SQLiteQueue(os.path.join(ai_dir, "queues.db"))

@router.post("/request-end-slot", response_model=EndSlotResponse)
async def request_end_slot(request: EndSlotRequest):
    """
    API để người dùng đánh dấu end slot là empty (sẵn sàng nhận hàng)
    
    Args:
        request: EndSlotRequest chứa end_qr và lý do
        
    Returns:
        Response với status và thông tin payload
    """
    try:
        payload = {
            "end_qr": request.end_qr,
            "status": "empty",
            "reason": request.reason,
            "timestamp": datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "user_api"
        }
        
        # Publish vào queue
        queue.publish("end_slot_request", str(request.end_qr), payload)
        
        logger.info(f"End slot {request.end_qr} marked as empty by user API")
        
        return EndSlotResponse(
            success=True,
            message=f"Đã đánh dấu end slot {request.end_qr} là empty",
            data=payload
        )
    
    except Exception as e:
        logger.error(f"Error marking end slot {request.end_qr}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi đánh dấu end slot: {str(e)}"
        )

