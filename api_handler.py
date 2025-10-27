from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from queue_store import SQLiteQueue

app = FastAPI()
queue = SQLiteQueue("queues.db")

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

@app.post("/api/cancel-end-slot")
async def cancel_end_slot(request: EndSlotRequest):
    """
    API để người dùng hủy yêu cầu end slot (đánh dấu lại là shelf)
    
    Args:
        request: EndSlotRequest chứa end_qr và lý do
        
    Returns:
        Response với status và thông tin payload
    """
    try:
        payload = {
            "end_qr": request.end_qr,
            "status": "shelf",
            "reason": request.reason,
            "timestamp": datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "user_api"
        }
        
        # Publish vào queue
        queue.publish("end_slot_cancel", str(request.end_qr), payload)
        
        return {
            "success": True,
            "message": f"Đã hủy yêu cầu cho end slot {request.end_qr}",
            "data": payload
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/end-slots-status")
async def get_end_slots_status():
    """
    API để lấy danh sách trạng thái tất cả end slots
    
    Returns:
        Danh sách end slots với trạng thái hiện tại (nếu có)
    """
    try:
        # Lấy các messages mới nhất từ end_slot_request
        with queue._connect() as conn:
            cur = conn.execute(
                """
                SELECT DISTINCT key, payload FROM messages
                WHERE topic IN ('end_slot_request', 'end_slot_cancel')
                ORDER BY id DESC
                LIMIT 100
                """
            )
            rows = cur.fetchall()
        
        # Parse và trả về
        statuses = {}
        for row in rows:
            import json
            payload = json.loads(row[1]) if isinstance(row[1], str) else row[1]
            end_qr = payload.get("end_qr")
            if end_qr and end_qr not in statuses:
                statuses[end_qr] = {
                    "end_qr": end_qr,
                    "status": payload.get("status"),
                    "reason": payload.get("reason"),
                    "timestamp": payload.get("timestamp")
                }
        
        return {
            "success": True,
            "count": len(statuses),
            "data": list(statuses.values())
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
    uvicorn.run(app, host="0.0.0.0", port=8001)

