from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class CameraCreate(BaseModel):
    camera_id: int = Field(..., description="Camera ID duy nhất để quản lý")
    camera_name: str = Field(..., description="Tên camera")
    camera_path: str = Field(..., description="Đường dẫn camera (URL hoặc path)")
    area: int = Field(..., description="Area ID (area_id) mà camera thuộc về")
    roi: Optional[List[Dict[str, Any]]] = Field(default=None, description="Danh sách các vùng ROI của camera (array chứa các object có x, y, width, height)")

class CameraOut(BaseModel):
    id: str  # MongoDB ObjectId
    camera_id: int  # Camera ID duy nhất để quản lý
    camera_name: str
    camera_path: str
    area: int  # Area ID
    roi: Optional[List[Dict[str, Any]]] = None  # Danh sách các vùng ROI (array chứa các object)
    created_at: datetime
    updated_at: datetime

class CameraUpdate(BaseModel):
    camera_id: Optional[int] = None
    camera_name: Optional[str] = None
    camera_path: Optional[str] = None
    area: Optional[int] = None
    roi: Optional[List[Dict[str, Any]]] = Field(default=None, description="Danh sách các vùng ROI của camera (array chứa các object có x, y, width, height)")

