from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AreaCreate(BaseModel):
    area_name: str

class AreaOut(BaseModel):
    id: str
    area_name: str
    created_by: str
    created_at: datetime
    updated_at: datetime

class AreaUpdate(BaseModel):
    area_name: Optional[str] = None
    created_by: Optional[str] = None
