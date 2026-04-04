from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class MonitorRequest(BaseModel):
    date: datetime
    category_name: str = Field(..., description="VD: frame, tank")
    product_name: str = Field(..., description="VD: K0R, K2P")
    production_order: int = Field(..., ge=1)
    target_quantity: int = Field(..., ge=0)

class MonitorResponse(BaseModel):
    total: int
    matched: int | None = None
    inserted: int
    message: str


class MonitorOut(BaseModel):
    id: str
    date: datetime
    category_name: str
    product_name: str
    production_order: int
    target_quantity: int
    produced_quantity: int
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


