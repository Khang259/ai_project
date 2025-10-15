from fastapi import APIRouter
from datetime import datetime
from dateutil.relativedelta import relativedelta
from app.core.database import parts_catalog, listAmr, amrParts

router = APIRouter()

@router.get("/parts-summary")
def get_parts_summary():
    # Lấy danh sách parts từ catalog
    parts = list(parts_catalog.find({}, {"_id": 0}))
    
    # Đếm số lượng AMR đang active
    total_amr = listAmr.count_documents({"status": "active"})
    
    summary = []

    for part in parts:
        ma_linh_kien = part.get("Mã linh kiện")
        loai = part.get("Loại linh kiện")
        so_luong_amr = part.get("Số lượng/ AMR", 0)

        # Tổng số = số lượng/AMR * số lượng AMR active
        tong_so = so_luong_amr * total_amr

        # Tính số linh kiện sắp đến hạn (< 30 ngày) cho toàn bộ amr_id
        soon_expiring_docs = list(amrParts.find({"Mã linh kiện": ma_linh_kien}))
        count_expiring = 0
        count_replace_when_broken = 0  # Đếm số lượng "Thay thế khi hỏng"
        for item in soon_expiring_docs:
            ngay_update_str = item.get("Ngày update")
            tuoi_tho_str = item.get("Tuổi thọ", "0")

            try:
                # Validate và parse ngày update
                if not ngay_update_str or ngay_update_str in [None, "None", "", "null"]:
                    continue
                ngay_update = datetime.strptime(ngay_update_str, "%Y-%m-%d")
                
                # Kiểm tra tuổi thọ - nếu null thì "Thay thế khi hỏng"
                if not tuoi_tho_str or tuoi_tho_str in [None, "None", "", "null"]:
                    # Tuổi thọ == null => "Thay thế khi hỏng"
                    count_replace_when_broken += 1
                    count_expiring += 1
                    continue
                
                tuoi_tho_clean = str(tuoi_tho_str).strip()
                if tuoi_tho_clean.lower() in ["none", "null", ""]:
                    # Tuổi thọ == null => "Thay thế khi hỏng"
                    count_replace_when_broken += 1
                    count_expiring += 1
                    continue
                
                tuoi_tho_years = int(tuoi_tho_clean)
                
                # Bỏ qua nếu tuổi thọ <= 0
                if tuoi_tho_years <= 0:
                    continue
                
                # Công thức: so_ngay_con_lai = (Tuổi thọ * 365) - (ngày hôm nay - Ngày update)
                ngay_da_su_dung = (datetime.today() - ngay_update).days
                so_ngay_con_lai = (tuoi_tho_years * 365) - ngay_da_su_dung

                if so_ngay_con_lai < 700:
                    count_expiring += 1
            except Exception as e:
                # Debug: in ra lỗi để kiểm tra (có thể bỏ comment này sau khi fix)
                print(f"Error processing item {item.get('amr_id', 'unknown')}: {e}")
                continue

        summary.append({
            "Loại linh kiện": loai,
            "Mã linh kiện": ma_linh_kien,
            "Tổng số": tong_so,
            "Số lượng sắp đến hạn": count_expiring,
            "Số lượng thay thế khi hỏng": count_replace_when_broken
        })

    return summary
