from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CameraCreate(BaseModel):
    camera_name: str = Field(..., description="Tên camera")
    camera_path: str = Field(..., description="Đường dẫn camera (URL hoặc path)")
    area: int = Field(..., description="Area ID (area_id) mà camera thuộc về")

class CameraOut(BaseModel):
    id: str  # MongoDB ObjectId
    camera_name: str
    camera_path: str
    area: int  # Area ID
    created_at: datetime
    updated_at: datetime

class CameraUpdate(BaseModel):
    camera_name: Optional[str] = None
    camera_path: Optional[str] = None
    area: Optional[int] = None
