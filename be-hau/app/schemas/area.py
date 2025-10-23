from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AreaCreate(BaseModel):
    area_id: int = Field(..., description="Custom area ID (e.g., AREA001, AREA002)")
    area_name: str

class AreaOut(BaseModel):
    id: str  # MongoDB ObjectId
    area_id: int  # Custom area ID
    area_name: str
    created_by: str
    created_at: datetime
    updated_at: datetime

class AreaUpdate(BaseModel):
    area_id: Optional[int] = None
    area_name: Optional[str] = None
    created_by: Optional[str] = None
