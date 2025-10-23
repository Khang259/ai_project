from pydantic import BaseModel, Field
from datetime import date
from typing import List

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

class MaintenanceCheckItem(BaseModel):
    id_thietBi: str = Field(..., description="Mã thiết bị")
    ten_thietBi: str = Field(..., description="Tên thiết bị")
    chu_ky: str = Field(..., description="Chu kỳ kiểm tra")
    ngay_check: str = Field(..., description="Ngày kiểm tra")
    trang_thai: str = Field(..., description="Trạng thái kiểm tra")
    ghi_chu: str = Field(None, description="Ghi chú kiểm tra")

class UpdateMaintenanceRequest(BaseModel):
    id_thietBi: str = Field(..., description="Mã thiết bị cần cập nhật")
    trang_thai: str = Field(..., description="Trạng thái mới: 'done' hoặc 'pending'")
    ngay_check: str = Field(None, description="Ngày kiểm tra mới (format: YYYY-MM-DD)")
    ghi_chu: str = Field(None, description="Ghi chú kiểm tra")

class CheckMaintenanceRequest(BaseModel):
    id_thietBi: str = Field(..., description="Mã thiết bị cần kiểm tra")
    ghi_chu: str = Field(..., description="Ghi chú kiểm tra")
    ngay_check: str = Field(..., description="Ngày kiểm tra (format: YYYY-MM-DD)")

class CheckMaintenanceResponse(BaseModel):
    success: bool
    message: str
    old_data: dict = Field(default_factory=dict, description="Dữ liệu cũ")
    new_data: dict = Field(default_factory=dict, description="Dữ liệu mới")
    log_id: str = Field(default="", description="ID của log được tạo")

class UpdateMaintenanceResponse(BaseModel):
    success: bool
    message: str
    updated_count: int = 0

class AMRSummaryItem(BaseModel):
    ten_amr: str = Field(..., description="Tên AMR")
    tong_so_linh_kien_can_thay_the: int = Field(..., description="Tổng số linh kiện cần thay thế")

class AMROverviewResponse(BaseModel):
    tong_so_amr: int = Field(..., description="Tổng số AMR")
    tong_so_linh_kien_can_thay_the: int = Field(..., description="Tổng số linh kiện cần thay thế của tất cả AMR")
    chi_tiet_amr: List[AMRSummaryItem] = Field(..., description="Chi tiết từng AMR")

class UpdatePartRequest(BaseModel):
    amr_id: str = Field(..., description="ID của AMR")
    ma_linh_kien: str = Field(..., description="Mã linh kiện cần cập nhật")
    ngay_thay_the: str = Field(..., description="Ngày thay thế mới (format: YYYY-MM-DD)")
    ghi_chu: str = Field(default="", description="Ghi chú")

class UpdatePartResponse(BaseModel):
    success: bool
    message: str
    updated_count: int = 0
    old_data: dict = Field(default_factory=dict, description="Dữ liệu cũ")
    new_data: dict = Field(default_factory=dict, description="Dữ liệu mới")

class UpdateAMRNameRequest(BaseModel):
    old_amr_id: str = Field(..., description="ID AMR cũ cần thay đổi")
    new_amr_id: str = Field(..., description="ID AMR mới")

class UpdateAMRNameResponse(BaseModel):
    success: bool
    message: str
    updated_count: int = 0
