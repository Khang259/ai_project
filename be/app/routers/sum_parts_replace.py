from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.core.database import amrParts

router = APIRouter()

@router.get("/sum-parts-replace/{amr_id}")
def get_sum_parts_replace_amr(amr_id: str):
    """
    Tính toán và trả về tổng số linh kiện cần thay thế của một AMR cụ thể
    
    Logic:
    1. Query tất cả documents có amr_id trùng khớp
    2. Tính daysLeft = (Tuổi thọ * 365) - (Ngày update - Ngày hôm nay)
    3. Nếu daysLeft < 300 days thì sumPartsReplaceDoc = Số lượng/AMR
    4. Tổng sumPartsReplaceAMR = tổng tất cả sumPartsReplaceDoc của AMR đó
    """
    try:
        # Query tất cả documents có amr_id trùng khớp
        docs = list(amrParts.find({"amr_id": amr_id}, {"_id": 0}))
        
        if not docs:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy AMR với ID: {amr_id}"
            )
        
        sum_parts_replace_amr = 0
        parts_details = []
        today = datetime.today()
        
        for doc in docs:
            try:
                # Lấy dữ liệu từ document
                ngay_update_str = doc.get("Ngày update")
                tuoi_tho_str = doc.get("Tuổi thọ")
                so_luong_amr = doc.get("Số lượng/ AMR", 0)
                ma_linh_kien = doc.get("Mã linh kiện", "")
                loai_linh_kien = doc.get("Loại linh kiện", "")
                
                # Validate dữ liệu
                if not ngay_update_str or ngay_update_str in [None, "None", "", "null"]:
                    # Không có ngày update, bỏ qua
                    continue
                
                if not tuoi_tho_str or tuoi_tho_str in [None, "None", "", "null"]:
                    # Không có tuổi thọ, bỏ qua
                    continue
                
                # Parse ngày update
                ngay_update = datetime.strptime(ngay_update_str, "%Y-%m-%d")
                
                # Parse tuổi thọ
                tuoi_tho_clean = str(tuoi_tho_str).strip()
                if tuoi_tho_clean.lower() in ["none", "null", ""]:
                    continue
                
                tuoi_tho_years = int(tuoi_tho_clean)
                if tuoi_tho_years <= 0:
                    continue
                
                # Tính daysLeft = (Tuổi thọ * 365) - (Ngày update - Ngày hôm nay)
                ngay_da_su_dung = (today - ngay_update).days
                days_left = (tuoi_tho_years * 365) - ngay_da_su_dung
                
                # Tính sumPartsReplaceDoc
                sum_parts_replace_doc = 0
                if days_left < 365:
                    sum_parts_replace_doc = so_luong_amr
                
                # Cộng vào tổng
                sum_parts_replace_amr += sum_parts_replace_doc
                
                # Lưu thông tin chi tiết để trả về
                parts_details.append({
                    "Mã linh kiện": ma_linh_kien,
                    "Loại linh kiện": loai_linh_kien,
                    "Số lượng/AMR": so_luong_amr,
                    "Tuổi thọ": tuoi_tho_years,
                    "Ngày update": ngay_update_str,
                    "Days left": days_left,
                    "Cần thay thế": sum_parts_replace_doc > 0,
                    "Số lượng cần thay": sum_parts_replace_doc
                })
                
            except Exception as e:
                # Bỏ qua document có lỗi và tiếp tục với document khác
                print(f"Lỗi xử lý document {doc.get('amr_id', 'unknown')}: {e}")
                continue
        
        return {
            "amr_id": amr_id,
            "sumPartsReplaceAMR": sum_parts_replace_amr,
            "tổng_số_linh_kiện_cần_thay_thế": sum_parts_replace_amr,
            "chi_tiet_linh_kien": parts_details,
            "ghi_chu": "Chỉ tính các linh kiện có daysLeft < 300 ngày"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/sum-parts-replace-all")
def get_sum_parts_replace_all():
    """
    Tính toán tổng số linh kiện cần thay thế cho tất cả AMR
    """
    try:
        # Lấy tất cả AMR unique
        amr_ids = amrParts.distinct("amr_id")
        
        result = []
        total_sum_all_amr = 0
        
        for amr_id in amr_ids:
            # Sử dụng lại logic từ API trên
            docs = list(amrParts.find({"amr_id": amr_id}, {"_id": 0}))
            
            sum_parts_replace_amr = 0
            today = datetime.today()
            
            for doc in docs:
                try:
                    ngay_update_str = doc.get("Ngày update")
                    tuoi_tho_str = doc.get("Tuổi thọ")
                    so_luong_amr = doc.get("Số lượng/ AMR", 0)
                    
                    if not ngay_update_str or ngay_update_str in [None, "None", "", "null"]:
                        continue
                    if not tuoi_tho_str or tuoi_tho_str in [None, "None", "", "null"]:
                        continue
                    
                    ngay_update = datetime.strptime(ngay_update_str, "%Y-%m-%d")
                    tuoi_tho_clean = str(tuoi_tho_str).strip()
                    if tuoi_tho_clean.lower() in ["none", "null", ""]:
                        continue
                    
                    tuoi_tho_years = int(tuoi_tho_clean)
                    if tuoi_tho_years <= 0:
                        continue
                    
                    ngay_da_su_dung = (today - ngay_update).days
                    days_left = (tuoi_tho_years * 365) - ngay_da_su_dung
                    
                    if days_left < 365:
                        sum_parts_replace_amr += so_luong_amr
                        
                except Exception:
                    continue
            
            result.append({
                "amr_id": amr_id,
                "sumPartsReplaceAMR": sum_parts_replace_amr
            })
            
            total_sum_all_amr += sum_parts_replace_amr
        
        return {
            "sum_amr": len(amr_ids),
            "sum_parts_replace": total_sum_all_amr,
            "chi_tiet_theo_amr": result,
            "ghi_chu": "Chỉ tính các linh kiện có daysLeft < 300 ngày"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
