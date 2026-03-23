from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.core.database import get_collection

router = APIRouter()

@router.get("/sum-parts-replace/{amr_id}")
async def get_sum_parts_replace_amr(amr_id: str):
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
        amrParts = get_collection("amrParts")
        docs = await amrParts.find({"amr_id": amr_id}, {"_id": 0}).to_list(length=None)
        
        if not docs:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy AMR với ID: {amr_id}"
            )
        
        sum_parts_one = 0
        sum_parts_two = 0
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
                sum_one = 0
                if 30 <= days_left < 700:
                    sum_one = so_luong_amr
                
                # Cộng vào tổng
                sum_parts_one += sum_one
                

                sum_two = 0
                if 0 <= days_left < 30:
                    sum_two = so_luong_amr
                
                # Cộng vào tổng
                sum_parts_two += sum_two
                

                # Lưu thông tin chi tiết để trả về
                parts_details.append({
                    "Mã linh kiện": ma_linh_kien,
                    "Loại linh kiện": loai_linh_kien,
                    "Số lượng/AMR": so_luong_amr,
                    "Tuổi thọ": tuoi_tho_years,
                    "Ngày update": ngay_update_str,
                    "Days left": days_left,
                    "Cần kiểm tra": sum_one > 0,
                    "Số lượng cần kiểm tra": sum_one,
                    "Cần thay thế": sum_two > 0,
                    "Số lượng cần thay": sum_two,
                })
                
            except Exception as e:
                # Bỏ qua document có lỗi và tiếp tục với document khác
                print(f"Lỗi xử lý document {doc.get('amr_id', 'unknown')}: {e}")
                continue
        
        return {
            "amr_id": amr_id,
            "sumPartsOne": sum_parts_one,
            "tổng_số_linh_kiện_cần_kiểm_tra": sum_parts_one,
            "sumPartsTwo": sum_parts_two,
            "tổng_số_linh_kiện_cần_thay_thế": sum_parts_two,
            "chi_tiet_linh_kien": parts_details,
            "ghi_chu": "Chỉ tính các linh kiện có daysLeft < 300 ngày"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/sum-parts-replace-all")
async def get_sum_parts_replace_all():
    """
    Tính toán tổng số linh kiện cần thay thế cho tất cả AMR
    """
    try:
        # Lấy tất cả AMR unique
        amrParts = get_collection("amrParts")
        amr_ids = await amrParts.distinct("amr_id")
        
        result = []
        total_sum_all_amr_one = 0
        total_sum_all_amr_two = 0
        for amr_id in amr_ids:
            # Sử dụng lại logic từ API trên
            docs = await amrParts.find({"amr_id": amr_id}, {"_id": 0}).to_list(length=None)
            
            sum_parts_one = 0
            sum_parts_two = 0
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
                    
                    if 30 <= days_left < 700:
                        sum_parts_one += so_luong_amr
                    if 0 <= days_left < 30:
                        sum_parts_two += so_luong_amr
                        
                except Exception:
                    continue
            
            result.append({
                "amr_id": amr_id,
                "sumPartsOne": sum_parts_one,
                "sumPartsTwo": sum_parts_two,
            })
            
            total_sum_all_amr_one += sum_parts_one
            total_sum_all_amr_two += sum_parts_two
        
        return {
            "sum_amr": len(amr_ids),
            "sum_parts_one": total_sum_all_amr_one,
            "sum_parts_two": total_sum_all_amr_two,
            "chi_tiet_theo_amr": result,
            "ghi_chu": "Chỉ tính các linh kiện có daysLeft < 300 ngày"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")