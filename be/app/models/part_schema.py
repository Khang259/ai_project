from pydantic import BaseModel, Field
from datetime import date

class PartSummary(BaseModel):
    Loại_linh_kiện: str
    Mã_linh_kiện: str
    Tổng_số: int
    Số_lượng_sắp_đến_hạn: int

class UpdateDateRequest(BaseModel):
    amr_id: str = Field(..., description="ID của AMR")
    ma_linh_kien: str = Field(..., description="Mã linh kiện cần cập nhật", alias="Mã linh kiện")
    ngay_update: str = Field(..., description="Ngày cập nhật mới (format: YYYY-MM-DD)", alias="Ngày update")

    class Config:
        allow_population_by_field_name = True

class UpdateDateResponse(BaseModel):
    success: bool
    message: str
    updated_count: int = 0
