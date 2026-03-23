from fastapi import APIRouter, HTTPException
from datetime import datetime
from dateutil.relativedelta import relativedelta
from app.core.database import get_collection

router = APIRouter()

@router.get("/part/{ma_linh_kien}/amr")
async def get_amr_by_part(ma_linh_kien: str):
    # Lọc theo Mã linh kiện trong MongoDB
    amrParts = get_collection("amrParts")
    docs = await amrParts.find({"Mã linh kiện": ma_linh_kien}, {"_id": 0}).to_list(length=None)

    if not docs:
        raise HTTPException(status_code=404, detail="Không tìm thấy linh kiện này trong hệ thống")

    # Dữ liệu đầu ra
    result = {
        "Mã linh kiện": ma_linh_kien,
        "Loại linh kiện": docs[0].get("Loại linh kiện", ""),
        "Danh sách": []
    }

    for doc in docs:
        try:
            ngay_update_str = doc.get("Ngày update")
            tuoi_tho_str = doc.get("Tuổi thọ", "0")
            
            # Validate dữ liệu trước khi xử lý
            if not ngay_update_str or ngay_update_str in [None, "None", "", "null"]:
                ngay_update = None
                so_ngay_con_lai = None
                ngay_bao_tri = None
            elif not tuoi_tho_str or tuoi_tho_str in [None, "None", "", "null"]:
                ngay_update = datetime.strptime(ngay_update_str, "%Y-%m-%d")
                so_ngay_con_lai = "Thay thế khi hỏng"  # Tuổi thọ == null
                ngay_bao_tri = None
            else:
                tuoi_tho_clean = str(tuoi_tho_str).strip()
                if tuoi_tho_clean.lower() in ["none", "null", ""]:
                    ngay_update = datetime.strptime(ngay_update_str, "%Y-%m-%d")
                    so_ngay_con_lai = "Thay thế khi hỏng"  # Tuổi thọ == null
                    ngay_bao_tri = None
                else:
                    ngay_update = datetime.strptime(ngay_update_str, "%Y-%m-%d")
                    tuoi_tho_years = int(tuoi_tho_clean)
                    if tuoi_tho_years <= 0:
                        so_ngay_con_lai = "Thay thế khi hỏng"  # Tuổi thọ <= 0
                        ngay_bao_tri = None
                    else:
                        # Tính số ngày còn lại
                        ngay_da_su_dung = (datetime.today() - ngay_update).days
                        so_ngay_con_lai = (tuoi_tho_years * 365) - ngay_da_su_dung
                        
                        # Tính ngày bảo trì = Ngày update + Tuổi thọ (năm)
                        ngay_bao_tri_date = ngay_update + relativedelta(years=tuoi_tho_years)
                        ngay_bao_tri = ngay_bao_tri_date.strftime("%Y-%m-%d")
        except Exception:
            ngay_update = None
            so_ngay_con_lai = "Thay thế khi hỏng"  # Fallback cho exception
            ngay_bao_tri = None

        result["Danh sách"].append({
            "amr_id": doc.get("amr_id"),
            "Ngày thay gần nhất": doc.get("Ngày update"),
            "Số ngày còn lại": so_ngay_con_lai,
            "ngay_bao_tri": ngay_bao_tri
        })

    return result
