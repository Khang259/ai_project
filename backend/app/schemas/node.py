from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NodeCreate(BaseModel):
    node_name: str
    node_type: str
    area: str
    start: int
    end: int
    next_start : Optional[int] = None
    next_end : Optional[int] = None

class NodeOut(BaseModel):
    id: str
    node_name: str
    node_type: str
    area: str
    start: int
    end: int
    next_start: Optional[int] = None
    next_end: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class ProcessCaller(BaseModel):
    node_name: str
    node_type: str
    area: str
    start: int
    end: int
    next_start: Optional[int] = None
    next_end: Optional[int] = None

class NodeUpdate(BaseModel):
    node_name: Optional[str] = None
    node_type: Optional[str] = None
    area: Optional[str] = None
    start: Optional[int] = None
    end: Optional[int] = None
    next_start: Optional[int] = None
    next_end: Optional[int] = None