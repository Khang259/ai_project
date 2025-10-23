from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PermissionBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Permission name (e.g., 'users:read')")
    description: Optional[str] = Field(None, max_length=500, description="Permission description")
    resource: str = Field(..., min_length=2, max_length=50, description="Resource name (e.g., 'users', 'cameras')")
    action: str = Field(..., min_length=2, max_length=50, description="Action name (e.g., 'read', 'write', 'delete')")

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    resource: Optional[str] = Field(None, min_length=2, max_length=50)
    action: Optional[str] = Field(None, min_length=2, max_length=50)
    is_active: Optional[bool] = None

class PermissionOut(PermissionBase):
    id: str
    is_active: bool
    created_at: datetime
    created_by: str
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None

    class Config:
        from_attributes = True