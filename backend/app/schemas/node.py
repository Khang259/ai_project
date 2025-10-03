from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NodeCreate(BaseModel):
    node_name: str
    node_type: str
    row: int
    column: int
    area: str
    start: Optional[datetime] = None
    end: Optional[datetime] = None

class NodeOut(BaseModel):
    id: str
    node_name: str
    node_type: str
    row: int
    column: int
    area: str
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class NodeUpdate(BaseModel):
    node_name: Optional[str] = None
    node_type: Optional[str] = None
    row: Optional[int] = None
    column: Optional[int] = None
    area: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None