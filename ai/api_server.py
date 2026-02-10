# File: api_server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
from pydantic import BaseModel
from setup_log import setup_logger

logger = setup_logger("api_server", "logs/api_server/log")

app = FastAPI(title="Honda AI Monitoring API", version="1.0.0")

class WebhookPayload(BaseModel):
    """Webhook payload từ external server."""
    orderId: str
    status: int
    shelfCurrPosition: Optional[str] = None
    subTaskStatus: Optional[str] = None
    deviceCode: Optional[str] = None
    modelProcessCode: Optional[str] = None
    subTaskTypeId: Optional[str] = None
    subTaskId: Optional[str] = None
    deviceNum: Optional[str] = None
    qrContent: Optional[str] = None
    qrCode: Optional[str] = None
    subTaskSeq: Optional[str] = None
    shelfNumber: Optional[str] = None
    icsTaskOrderDetailId: Optional[str] = None
    processRate: Optional[str] = None

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state manager reference
state_manager = None

def set_state_manager(manager):
    """Set the state manager instance for API access."""
    global state_manager
    state_manager = manager
    logger.info("State manager attached to API server")

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "Honda AI Monitoring"}

@app.get("/status")
async def get_status() -> Dict[str, Any]:
    """Get overall system status."""
    if not state_manager:
        return {"error": "State manager not initialized"}
    
    return {
        "total_points": len(state_manager.points),
        "ready_start_count": len(state_manager.ready_start_list),
        "ready_end_count": len(state_manager.ready_end_list),
        "waiting_start_count": len(state_manager.waiting_start_list),
        "waiting_end_count": len(state_manager.waiting_end_list),
        "active_pairs": len(state_manager.pair_mapping)
    }

@app.get("/points")
async def get_points() -> Dict[str, Any]:
    """Get all points with their state, time, and flag."""
    if not state_manager:
        return {"error": "State manager not initialized"}
    
    # Convert defaultdict to regular dict for JSON serialization
    points_data = {}
    for node_id, data in state_manager.points.items():
        points_data[node_id] = {
            "state": data["state"],
            "time": data["time"],
            "flag": data["flag"]
        }
    
    return {"points": points_data}

@app.get("/ready_lists")
async def get_ready_lists() -> Dict[str, Any]:
    """Get ready start and end lists."""
    if not state_manager:
        return {"error": "State manager not initialized"}
    
    return {
        "ready_start_list": state_manager.ready_start_list,
        "ready_end_list": state_manager.ready_end_list
    }

@app.get("/waiting_lists")
async def get_waiting_lists() -> Dict[str, Any]:
    """Get waiting start and end lists."""
    if not state_manager:
        return {"error": "State manager not initialized"}
    
    return {
        "waiting_start_list": state_manager.waiting_start_list,
        "waiting_end_list": state_manager.waiting_end_list
    }

@app.get("/pair_mapping")
async def get_pair_mapping() -> Dict[str, Any]:
    """Get mapping between start and end points."""
    if not state_manager:
        return {"error": "State manager not initialized"}
    
    return {"pair_mapping": state_manager.pair_mapping}

@app.post("/delete-flag")
async def delete_flag(payload: WebhookPayload) -> Dict[str, Any]:
    """Receive webhook from external server to reset flags."""
    if not state_manager:
        return {"error": "State manager not initialized", "success": False}
    
    order_id = payload.orderId
    status = payload.status
    
    #logger.info(f"Received webhook - orderId: {order_id}, status: {status}")
    
    # Kiểm tra orderId có tồn tại không
    if order_id not in state_manager.order_mapping:
        logger.warning(f"orderId {order_id} not found in order_mapping")
        return {"error": f"orderId {order_id} not found", "success": False}
    
    # Kiểm tra status = 23
    if status != 23:
        logger.info(f"Status {status} != 23, no action taken")
        return {"message": f"Status {status} does not require flag reset", "success": True}
    
    # Lấy pair từ mapping
    start_point, end_point = state_manager.order_mapping[order_id]
    
    # Reset flag của cả 2 points
    state_manager.points[start_point]["flag"] = False
    state_manager.points[end_point]["flag"] = False
    
    # Xóa khỏi mapping sau khi xử lý
    del state_manager.order_mapping[order_id]
    
    # Xóa khỏi pair_mapping nếu tồn tại
    if end_point in state_manager.pair_mapping:
        del state_manager.pair_mapping[end_point]
    
    logger.info(f"Reset flags for pair ({start_point}, {end_point}) - orderId: {order_id}")
    
    return {
        "success": True,
        "message": f"Flags reset for {start_point} and {end_point}",
        "orderId": order_id,
        "pair": [start_point, end_point]
    }

@app.get("/order_mapping")
async def get_order_mapping() -> Dict[str, Any]:
    """Get order mapping for debugging."""
    if not state_manager:
        return {"error": "State manager not initialized"}
    
    return {"order_mapping": state_manager.order_mapping}
