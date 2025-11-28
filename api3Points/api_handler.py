import sys
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

# Add parent directory to path để import queue_store
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from queue_store import SQLiteQueue

app = FastAPI()
# Sử dụng queues.db từ thư mục cha (cùng với stable_pair_processor)
queue = SQLiteQueue("../queues.db")

class EndSlotRequest(BaseModel):
    end_qr: int
    reason: Optional[str] = "manual_request"

@app.post("/api/request-end-slot")
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
        
        return {
            "success": True,
            "message": f"Đã đánh dấu end slot {request.end_qr} là empty",
            "data": payload
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("Starting API Handler on port 8001...")
    print("Endpoints:")
    print("  POST /api/request-end-slot - Đánh dấu end slot là empty")
    print("  POST /api/cancel-end-slot - Hủy yêu cầu end slot")
    print("  GET /api/end-slots-status - Xem trạng thái end slots")
    uvicorn.run(app, host="0.0.0.0", port=8002)

