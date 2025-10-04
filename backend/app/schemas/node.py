from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NodeCreate(BaseModel):
    node_name: str
    node_type: str
    row: int
    column: int
    area: str
    start: int
    end: int

class NodeOut(BaseModel):
    id: str
    node_name: str
    node_type: str
    row: int
    column: int
    area: str
    start: int
    end: int
    created_at: datetime
    updated_at: datetime

class ProcessCaller(BaseModel):
    node_name: str
    node_type: str
    area: str
    start: int
    end: int

class NodeUpdate(BaseModel):
    node_name: Optional[str] = None
    node_type: Optional[str] = None
    row: Optional[int] = None
    column: Optional[int] = None
    area: Optional[str] = None
    start: Optional[int] = None
    end: Optional[int] = None