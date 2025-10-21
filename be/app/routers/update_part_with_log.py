from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.core.database import amrParts, maintenanceLogs
from app.models.part_schema import UpdatePartRequest, UpdatePartResponse

router = APIRouter()

@router.put("/part/update-with-log")
def update_part_with_log(request: UpdatePartRequest):
    """
    Cập nhật thông tin linh kiện và lưu log vào maintenanceLogs
    
    Bước 1: Truy xuất bản ghi đầy đủ hiện tại (old_data)
    Bước 2: Merge (gộp) dữ liệu cũ và dữ liệu mới
    Bước 3: Cập nhật database
    Bước 4: Lưu vào collection maintenanceLogs
    """
    try:
        # Validate format ngày
        try:
            datetime.strptime(request.ngay_thay_the, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Format ngày không đúng. Vui lòng sử dụng format YYYY-MM-DD"
            )
        
        # Bước 1: Truy xuất bản ghi đầy đủ hiện tại (old_data)
        filter_query = {
            "amr_id": request.amr_id,
            "Mã linh kiện": request.ma_linh_kien
        }
        
        old_document = amrParts.find_one(filter_query)
        
        if not old_document:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy linh kiện với amr_id='{request.amr_id}' và Mã linh kiện='{request.ma_linh_kien}'"
            )
        
        # Bước 2: Merge (gộp) dữ liệu cũ và dữ liệu mới
        new_data = old_document.copy()
        new_data["Ngày update"] = request.ngay_thay_the
        new_data["Ghi chú"] = request.ghi_chu
        
        # Chuẩn bị dữ liệu để cập nhật (loại bỏ _id)
        update_data = {k: v for k, v in new_data.items() if k != "_id"}
        
        # Bước 3: Cập nhật database - Cập nhật vào collection "amrParts"
        update_query = {
            "$set": {
                "Ngày update": request.ngay_thay_the,
                "Ghi chú": request.ghi_chu
            }
        }
        
        # Cập nhật document trong collection amrParts
        result = amrParts.update_many(filter_query, update_query)
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Không thể cập nhật linh kiện với amr_id='{request.amr_id}' và Mã linh kiện='{request.ma_linh_kien}'"
            )
        
       
        
        # Verify: Kiểm tra dữ liệu đã được cập nhật đúng trong amrParts
        updated_document = amrParts.find_one(filter_query)
        if not updated_document:
            raise HTTPException(
                status_code=500,
                detail="Lỗi: Không thể xác nhận dữ liệu đã được cập nhật trong amrParts"
            )
       
        # Bước 4: Lưu vào collection maintenanceLogs
        log_entry = {
            "timestamp": datetime.now(),
            "action": "update_part",
            "amr_id": request.amr_id,
            "ma_linh_kien": request.ma_linh_kien,
            "collections_updated": ["amrParts", "maintenanceLogs"],
            "old_data": {
                "Mã linh kiện": old_document.get("Mã linh kiện"),
                "Loại linh kiện": old_document.get("Loại linh kiện"),
                "Ngày update": old_document.get("Ngày update"),
                "Ghi chú": old_document.get("Ghi chú", ""),
                "Tuổi thọ": old_document.get("Tuổi thọ"),
                "Số lượng/ AMR": old_document.get("Số lượng/ AMR")
            },
            "new_data": {
                "Mã linh kiện": request.ma_linh_kien,
                "Loại linh kiện": old_document.get("Loại linh kiện"),
                "Ngày update": request.ngay_thay_the,
                "Ghi chú": request.ghi_chu,
                "Tuổi thọ": old_document.get("Tuổi thọ"),
                "Số lượng/ AMR": old_document.get("Số lượng/ AMR")
            },
            "verified_data": {
                "amrParts_updated": True,
                "amrParts_verification": {
                    "Ngày update": updated_document.get("Ngày update"),
                    "Ghi chú": updated_document.get("Ghi chú")
                }
            },
            "changes": {
                "Ngày update": {
                    "old": old_document.get("Ngày update"),
                    "new": request.ngay_thay_the
                },
                "Ghi chú": {
                    "old": old_document.get("Ghi chú", ""),
                    "new": request.ghi_chu
                }
            },
            "user": "system",  # Có thể thay bằng user thực tế
            "ip_address": "127.0.0.1"  # Có thể lấy từ request
        }
        
        # Lưu log vào database
        maintenanceLogs.insert_one(log_entry)
        
        return UpdatePartResponse(
            success=True,
            message=f"✅ Đã cập nhật thành công {result.modified_count} document(s) trong collection 'amrParts' và lưu log vào 'maintenanceLogs'",
            updated_count=result.modified_count,
            old_data={
                "Mã linh kiện": old_document.get("Mã linh kiện"),
                "Loại linh kiện": old_document.get("Loại linh kiện"),
                "Ngày update": old_document.get("Ngày update"),
                "Ghi chú": old_document.get("Ghi chú", ""),
                "Tuổi thọ": old_document.get("Tuổi thọ"),
                "Số lượng/ AMR": old_document.get("Số lượng/ AMR")
            },
            new_data={
                "Mã linh kiện": request.ma_linh_kien,
                "Loại linh kiện": old_document.get("Loại linh kiện"),
                "Ngày update": request.ngay_thay_the,
                "Ghi chú": request.ghi_chu,
                "Tuổi thọ": old_document.get("Tuổi thọ"),
                "Số lượng/ AMR": old_document.get("Số lượng/ AMR"),
                "verified_in_amrParts": True
            }
        )
        
    except HTTPException:
        # Re-raise HTTPException để giữ nguyên status code và message
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/part/logs/{amr_id}")
def get_part_logs(amr_id: str):
    """
    Lấy lịch sử thay đổi của một AMR
    """
    try:
        logs = list(maintenanceLogs.find(
            {"amr_id": amr_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(50))
        
        return {
            "amr_id": amr_id,
            "logs": logs,
            "total": len(logs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/part/logs/{amr_id}/{ma_linh_kien}")
def get_part_specific_logs(amr_id: str, ma_linh_kien: str):
    """
    Lấy lịch sử thay đổi của một linh kiện cụ thể
    """
    try:
        logs = list(maintenanceLogs.find(
            {
                "amr_id": amr_id,
                "ma_linh_kien": ma_linh_kien
            },
            {"_id": 0}
        ).sort("timestamp", -1).limit(20))
        
        return {
            "amr_id": amr_id,
            "ma_linh_kien": ma_linh_kien,
            "logs": logs,
            "total": len(logs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
