from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class BlockSlotRequest(BaseModel):
    """Schema cho yêu cầu block slot"""
    qr_code: int = Field(..., description="QR code của slot cần block")
    reason: Optional[str] = Field(default="manual_api", description="Lý do block slot")

class UnblockSlotRequest(BaseModel):
    """Schema cho yêu cầu unblock slot"""
    qr_code: int = Field(..., description="QR code của slot cần unblock")
    reason: Optional[str] = Field(default="manual_api", description="Lý do unblock slot")

class SlotBlockResponse(BaseModel):
    """Schema cho response của slot block/unblock"""
    code: int = Field(default=1000, description="Mã trả về: 1000 = thành công")
    message: str = Field(default="Success", description="Thông báo trả về")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Dữ liệu trả về")






