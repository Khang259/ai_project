# models.py - Pydantic models cho API

from typing import Optional, Dict, Any
from pydantic import BaseModel

class SystemConfig(BaseModel):
    """Configuration cho hệ thống"""
    camera_urls: list
    num_processes: int = 5
    max_retry_attempts: int = 5
    use_ai: bool = True
    model_path: str = "detectObject/weights/model-hanam_0506.pt"
    target_fps: float = 1.0
    fps_preset: str = "low"
    show_video: bool = True
    db_path: str = "queues.db"

class AIControl(BaseModel):
    """Model cho điều khiển AI"""
    enable: bool

class SystemResponse(BaseModel):
    """Response model chuẩn cho tất cả API"""
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None

class CameraInfo(BaseModel):
    """Thông tin camera"""
    name: str
    status: str
    last_update: float
    frame_age: Optional[float] = None

class SystemStatus(BaseModel):
    """Trạng thái hệ thống"""
    camera_system: Dict[str, Any]
    roi_processor: Dict[str, Any]
    stable_pair_processor: Dict[str, Any]
    post_api: Dict[str, Any]
    timestamp: float

class HealthStatus(BaseModel):
    """Health check status"""
    camera_system: bool
    roi_processor: bool
    stable_pair_processor: bool
    post_api: bool
    timestamp: float
