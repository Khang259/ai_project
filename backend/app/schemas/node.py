from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class NodeCreate(BaseModel):
    node_name: str
    node_type: str
    owner: str = Field(..., description="Username của người sở hữu node")
    start: int
    end: int
    next_start : Optional[int] = None
    next_end : Optional[int] = None

class NodeOut(BaseModel):
    id: str
    node_name: str
    node_type: str
    owner: str  # Username của người sở hữu
    start: int
    end: int
    next_start: Optional[int] = None
    next_end: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class ProcessCaller(BaseModel):
    node_name: str
    node_type: str
    owner: str  # Username của người sở hữu
    start: int
    end: int
    next_start: Optional[int] = None
    next_end: Optional[int] = None

class NodeUpdate(BaseModel):
    node_name: Optional[str] = None
    node_type: Optional[str] = None
    owner: Optional[str] = None  # Username của người sở hữu
    start: Optional[int] = None
    end: Optional[int] = None
    next_start: Optional[int] = None
    next_end: Optional[int] = None

class NodeBatchUpdateItem(BaseModel):
    """Một item trong batch update - bao gồm toàn bộ thông tin node"""
    node_name: str = Field(..., description="Tên node (unique key)")
    node_type: str
    owner: str
    start: int
    end: int
    next_start: Optional[int] = None
    next_end: Optional[int] = None

class NodeBatchUpdate(BaseModel):
    """Schema để cập nhật nhiều nodes với dữ liệu khác nhau"""
    nodes: List[NodeBatchUpdateItem] = Field(..., description="Danh sách nodes cần cập nhật")

class NodeBatchUpdateResponse(BaseModel):
    """Response sau khi batch update"""
    total: int
    updated: int
    created: int
    errors: List[dict] = []
    message: str