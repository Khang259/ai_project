from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class NodeCreate(BaseModel):
    node_name: str
    node_type: str
    owner: str = Field(..., description="Username của người sở hữu node")
    line: str = Field(..., description="Line number (Line 1, Line 2, Line 3)")
    start: int
    end: int
    next_start : Optional[int] = None
    next_end : Optional[int] = None

class NodeOut(BaseModel):
    id: str
    node_name: str
    node_type: str
    owner: str  # Username của người sở hữu
    line: Optional[str] = None  # Optional để support nodes cũ chưa có line
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
    line: Optional[str] = None  # Optional để support tasks từ nodes cũ
    start: int
    end: int
    next_start: Optional[int] = None
    next_end: Optional[int] = None

class NodeUpdate(BaseModel):
    node_name: Optional[str] = None
    node_type: Optional[str] = None
    owner: Optional[str] = None  # Username của người sở hữu
    line: Optional[str] = None
    start: Optional[int] = None
    end: Optional[int] = None
    next_start: Optional[int] = None
    next_end: Optional[int] = None

class NodeBatchUpdateItem(BaseModel):
    """Một item trong batch update - bao gồm ID và thông tin node"""
    id: str = Field(..., description="Node ID (MongoDB ObjectId)")
    node_name: str = Field(..., description="Tên node")
    node_type: str
    owner: str
    line: str
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