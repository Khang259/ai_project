import sys
import os
from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone

# Add parent directory to path để import queue_store
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)

from ai.queue_store import SQLiteQueue
from app.schemas.slot_block import BlockSlotRequest, UnblockSlotRequest, SlotBlockResponse
from shared.logging import get_logger

router = APIRouter()
logger = get_logger("camera_ai_app")

# Sử dụng queues.db từ thư mục ai (cùng cấp với be)
ai_dir = os.path.join(project_root, "ai")
queue = SQLiteQueue(os.path.join(ai_dir, "queues.db"))

@router.post("/slot/block", response_model=SlotBlockResponse)
async def manual_block_slot(request: BlockSlotRequest):
    """
    API để block một slot thủ công theo QR code
    
    Publish message vào topic "block_slot" để roi_processor xử lý
    
    Args:
        request: BlockSlotRequest chứa qr_code và lý do
        
    Returns:
        SlotBlockResponse với code=1000 nếu thành công
    """
    try:
        qr_code = request.qr_code
        
        # Tạo block payload
        block_payload = {"qr_code": qr_code}
        
        # Publish vào queue (key là QR code dạng string)
        queue.publish("block_slot", str(qr_code), block_payload)
        
        logger.info(f"MANUAL_BLOCK_SLOT: qr_code={qr_code}, reason={request.reason}")
        
        return SlotBlockResponse(
            code=1000,
            message=f"Đã gửi block request cho slot QR {qr_code}",
            data={
                "qr_code": qr_code,
                "timestamp": datetime.now().isoformat()
            }
        )
    
    except Exception as e:
        logger.error(f"MANUAL_BLOCK_SLOT_ERROR: qr_code={request.qr_code}, error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi block slot: {str(e)}"
        )


@router.post("/slot/unblock", response_model=SlotBlockResponse)
async def manual_unblock_slot(request: UnblockSlotRequest):
    """
    API để unblock một slot thủ công theo QR code
    
    Publish message vào topic "unblock_slot" để roi_processor xử lý
    
    Args:
        request: UnblockSlotRequest chứa qr_code và lý do
        
    Returns:
        SlotBlockResponse với code=1000 nếu thành công
    """
    try:
        qr_code = request.qr_code
        
        # Tạo unblock payload
        unblock_payload = {"qr_code": qr_code}
        
        # Publish vào queue (key là QR code dạng string)
        queue.publish("unblock_slot", str(qr_code), unblock_payload)
        
        logger.info(f"MANUAL_UNBLOCK_SLOT: qr_code={qr_code}, reason={request.reason}")
        
        return SlotBlockResponse(
            code=1000,
            message=f"Đã gửi unblock request cho slot QR {qr_code}",
            data={
                "qr_code": qr_code,
                "timestamp": datetime.now().isoformat()
            }
        )
    
    except Exception as e:
        logger.error(f"MANUAL_UNBLOCK_SLOT_ERROR: qr_code={request.qr_code}, error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi unblock slot: {str(e)}"
        )

