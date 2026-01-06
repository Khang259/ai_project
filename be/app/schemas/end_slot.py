from pydantic import BaseModel, Field
from typing import Optional

class EndSlotRequest(BaseModel):
    """Schema cho yêu cầu đánh dấu end slot là empty"""
    end_qr: int = Field(..., description="End QR code của slot")
    reason: Optional[str] = Field(default="manual_request", description="Lý do đánh dấu slot")

class EndSlotResponse(BaseModel):
    """Schema cho response của end slot request"""
    success: bool
    message: str
    data: dict
