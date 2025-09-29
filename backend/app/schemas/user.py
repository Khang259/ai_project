from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    roles: Optional[List[str]] = []  # Thêm field permissions

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(UserBase):
    id: str
    is_active: bool
    is_superuser: bool
    permissions: List[str] = []  # Thêm field permissions
    roles: List[str] = []
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    is_active: Optional[bool] = None
    roles: Optional[List[str]] = None

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

class RoleOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    permissions: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None

class PermissionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    resource: str
    action: str

class PermissionOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    resource: str
    action: str
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserOut] = None  # Thêm thông tin user vào token

class TokenData(BaseModel):
    username: str | None = None
    permissions: List[str] = []  # Thêm permissions vào token data
