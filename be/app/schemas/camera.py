from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class MappingItem(BaseModel):
    roi: List[int] = Field(..., description="Danh sách tọa độ [x1, y1, x2, y2]")
    position: int = Field(..., description="Vị trí hoặc ID gắn với ROI")

class CameraCreate(BaseModel):
    camera_id: int
    camera_name: str
    camera_path: str
    area: int
    mapping: List[MappingItem] = Field(default_factory=list)

class CameraOut(BaseModel):
    id: str  # MongoDB ObjectId
    camera_id: int  # Camera ID duy nhất để quản lý
    camera_name: str
    camera_path: str
    area: int  # Area ID
    mapping: List[MappingItem] = Field(default_factory=list) # Danh sách các vùng ROI (array chứa các object)
    created_at: datetime
    updated_at: datetime

class CameraUpdate(BaseModel):
    camera_id: Optional[int] = None
    camera_name: Optional[str] = None
    camera_path: Optional[str] = None
    area: Optional[int] = None
    mapping: List[MappingItem] = Field(default_factory=list)

