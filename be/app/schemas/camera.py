from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class RoisList(BaseModel):
    node_id: str = Field(..., description="Vị trí gắn với ROI")
    roi: List[float] = Field(..., description="Danh sách tọa độ [x1, y1, w,h]")

class CameraItem(BaseModel):
    url: str = Field(..., description="URL RTSP của camera")
    cameraId: str = Field(..., description="ID của camera theo bản CAD")
    area_id: int = Field(..., description="ID của map")
    source_owner: int = Field(..., description="ID của nguồn chủ")
    type_model: int = Field(..., description="ID của loại model AI")
    rois: Optional[List[RoisList]] = Field(default_factory=list)

class CameraCreate(BaseModel):
    client_id: int = Field(..., description="ID của thiết bị phục vụ phần load-balancing")
    cameras: List[CameraItem] = Field(default_factory=list)


class CameraOut(BaseModel):
    id: str  # MongoDB ObjectId
    client_id: int = Field(..., description="ID của thiết bị phục vụ phần load-balancing")
    cameras: List[CameraItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

class CameraUpdate(BaseModel):
    client_id: Optional[int] = Field(..., description="ID của thiết bị phục vụ phần load-balancing")
    cameras: List[CameraItem] = Field(default_factory=list)


