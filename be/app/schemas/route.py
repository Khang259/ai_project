from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class RouteCreate(BaseModel):
    route_id: int = Field(..., description="Custom route ID (e.g., ROUTE001, ROUTE002)")
    route_name: str
    area_id: int
    group_id: int
    robot_list: List[str]

class RouteOut(BaseModel):
    id: str  # MongoDB ObjectId
    route_id: int  # Custom route ID
    route_name: str
    area_id: int
    group_id: int
    robot_list: List[str]
    created_by: str
    created_at: datetime
    updated_at: datetime

class RouteUpdate(BaseModel):
    route_id: Optional[int] = None
    route_name: Optional[str] = None
    area_id: Optional[int] = None
    group_id: Optional[int] = None
    robot_list: Optional[List[str]] = None
    created_by: Optional[str] = None