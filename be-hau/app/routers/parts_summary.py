from fastapi import APIRouter
from datetime import datetime
from dateutil.relativedelta import relativedelta
from app.core.database import get_collection

router = APIRouter()

@router.get("/parts-summary")
async def get_parts_summary():
    # Lấy danh sách parts từ catalog
    parts_catalog = get_collection("parts_catalog")
    parts = await parts_catalog.find({}, {"_id": 0}).to_list(length=None)
    
    # Đếm số lượng AMR đang active
    listAmr = get_collection("listAmr")
    total_amr = await listAmr.count_documents({"status": "active"})
    
    summary = []

    for part in parts:
        ma_linh_kien = part.get("Mã linh kiện")
        loai = part.get("Loại linh kiện")
        so_luong_amr = part.get("Số lượng/ AMR", 0)
        tuoi_tho_catalog = part.get("Tuổi thọ")  # Lấy tuổi thọ từ catalog

        # Format tuổi thọ với "năm" 
        if tuoi_tho_catalog and str(tuoi_tho_catalog).strip() and str(tuoi_tho_catalog).strip().lower() not in ["none", "null", ""]:
            try:
                tuoi_tho_years = int(str(tuoi_tho_catalog).strip())
                if tuoi_tho_years > 0:
                    tuoi_tho_formatted = f"{tuoi_tho_years} năm"
                else:
                    tuoi_tho_formatted = "Không xác định"
            except (ValueError, TypeError):
                tuoi_tho_formatted = "Không xác định"
        else:
            tuoi_tho_formatted = "Không xác định"

        # Tổng số = số lượng/AMR * số lượng AMR active
        tong_so = so_luong_amr * total_amr

        # Tính số linh kiện sắp đến hạn (< 700 ngày) cho toàn bộ amr_id
        amrParts = get_collection("amrParts")
        soon_expiring_docs = await amrParts.find({"Mã linh kiện": ma_linh_kien}).to_list(length=None)
        count_expiring = 0
        count_replace_when_broken = 0  # Đếm số lượng "Thay thế khi hỏng"
        total_valid_items = 0  # Tổng số items có dữ liệu hợp lệ
        
        for item in soon_expiring_docs:
            ngay_update_str = item.get("Ngày update")
            tuoi_tho_str = item.get("Tuổi thọ", "0")

            try:
                # Validate và parse ngày update
                if not ngay_update_str or ngay_update_str in [None, "None", "", "null"]:
                    continue
                ngay_update = datetime.strptime(ngay_update_str, "%Y-%m-%d")
                total_valid_items += 1
                
                # Kiểm tra tuổi thọ - nếu null thì "Thay thế khi hỏng"
                if not tuoi_tho_str or tuoi_tho_str in [None, "None", "", "null"]:
                    # Tuổi thọ == null => "Thay thế khi hỏng" (KHÔNG đếm vào count_expiring)
                    count_replace_when_broken += 1
                    continue
                
                tuoi_tho_clean = str(tuoi_tho_str).strip()
                if tuoi_tho_clean.lower() in ["none", "null", ""]:
                    # Tuổi thọ == null => "Thay thế khi hỏng" (KHÔNG đếm vào count_expiring)
                    count_replace_when_broken += 1
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

        # Xác định "Số lượng sắp đến hạn"
        if count_expiring == 0 and count_replace_when_broken > 0:
            # Tất cả đều "Thay thế khi hỏng", không có gì sắp đến hạn theo thời gian
            so_luong_sap_den_han = "Thay thế khi hỏng"
        else:
            # Có linh kiện sắp đến hạn theo thời gian
            so_luong_sap_den_han = count_expiring

        summary.append({
            "Loại linh kiện": loai,
            "Mã linh kiện": ma_linh_kien,
            "Tuổi thọ": tuoi_tho_formatted,  # Thêm trường tuổi thọ với định dạng "X năm"
            "Tổng số": tong_so,
            "Số lượng sắp đến hạn": so_luong_sap_den_han,
            "Số lượng thay thế khi hỏng": count_replace_when_broken
        })

    return summary
