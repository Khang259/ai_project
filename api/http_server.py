"""
HTTP Server - FastAPI REST API cho Point Status Management
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging

from .point_status import PointStatusAPI

logger = logging.getLogger("HTTPServer")

app = FastAPI(title="Point Status API", version="1.0.0")

# Global variable để lưu PointStatusAPI instance
_api_instance: Optional[PointStatusAPI] = None


class BlockRequest(BaseModel):
    qr_code: str
    blocked_by: str = "api"


class UnblockRequest(BaseModel):
    qr_code: str


class TaskCompleteRequest(BaseModel):
    """Request khi robot hoàn thành task, dựa trên logic output"""
    blocked_point: str  # Có thể lấy từ output["blocked_point"]
    rule_type: Optional[str] = None  # Optional: loại rule đã trigger


def init_api(hash_tables, visualizer_queue=None):
    """
    Khởi tạo API instance
    Gọi hàm này trước khi start server
    
    Args:
        hash_tables: HashTables object
        visualizer_queue: Queue cho visualizer (optional)
    """
    global _api_instance
    _api_instance = PointStatusAPI(hash_tables, visualizer_queue)
    logger.info("✅ HTTP API đã được khởi tạo")


@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "Point Status API is online"
    }


@app.post("/api/block")
def block_point(request: BlockRequest):
    """
    Block một điểm
    
    Body:
    {
        "qr_code": "911",
        "blocked_by": "manual"
    }
    """
    if not _api_instance:
        raise HTTPException(status_code=500, detail="API chưa được khởi tạo")
    
    result = _api_instance.block_point(
        qr_code=request.qr_code,
        blocked_by=request.blocked_by
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@app.post("/api/unblock")
def unblock_point(request: UnblockRequest):
    """
    Unblock một điểm
    
    Body:
    {
        "qr_code": "911"
    }
    """
    if not _api_instance:
        raise HTTPException(status_code=500, detail="API chưa được khởi tạo")
    
    result = _api_instance.unblock_point(qr_code=request.qr_code)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@app.get("/api/status/{qr_code}")
def get_status(qr_code: str):
    """
    Lấy trạng thái của 1 điểm
    
    GET /api/status/911
    """
    if not _api_instance:
        raise HTTPException(status_code=500, detail="API chưa được khởi tạo")
    
    result = _api_instance.get_point_status(qr_code=qr_code)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    
    return result


@app.get("/api/blocked")
def get_blocked_points():
    """
    Lấy danh sách tất cả điểm đang bị block
    
    GET /api/blocked
    """
    if not _api_instance:
        raise HTTPException(status_code=500, detail="API chưa được khởi tạo")
    
    return _api_instance.get_all_blocked_points()


@app.post("/api/task-complete")
def task_complete(request: TaskCompleteRequest):
    """
    Unblock điểm sau khi robot hoàn thành task
    Endpoint này nhận blocked_point từ logic output
    
    Body:
    {
        "blocked_point": "911",
        "rule_type": "2point"  // optional
    }
    """
    if not _api_instance:
        raise HTTPException(status_code=500, detail="API chưa được khởi tạo")
    
    result = _api_instance.unblock_point(qr_code=request.blocked_point)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


def start_server(host: str = "0.0.0.0", port: int = 8000):
    """
    Start HTTP server
    
    Args:
        host: IP address (default: 0.0.0.0 - accept all)
        port: Port number (default: 8000)
    """
    logger.info(f"🚀 Starting HTTP Server tại http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)