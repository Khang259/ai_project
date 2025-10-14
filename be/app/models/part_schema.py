from pydantic import BaseModel

class PartSummary(BaseModel):
    Loại_linh_kiện: str
    Mã_linh_kiện: str
    Tổng_số: int
    Số_lượng_sắp_đến_hạn: int
