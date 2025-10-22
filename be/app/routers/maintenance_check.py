from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from app.core.database import maintenanceCheck, maintenanceLogs, checkLogs
from app.models.part_schema import MaintenanceCheckItem, UpdateMaintenanceRequest, UpdateMaintenanceResponse, CheckMaintenanceRequest, CheckMaintenanceResponse

router = APIRouter()

@router.get("/maintenance-check", response_model=List[MaintenanceCheckItem])
def get_all_maintenance_checks():
    """
    Lấy tất cả các thông tin kiểm tra bảo trì từ collection maintenanceCheck
    """
    try:
        # Lấy tất cả documents từ collection maintenanceCheck
        maintenance_docs = list(maintenanceCheck.find({}, {"_id": 0}))
        
        if not maintenance_docs:
            return []  # Trả về list rỗng nếu không có dữ liệu
        
        return maintenance_docs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/maintenance-check/{id_thietBi}")
def get_maintenance_check_by_device(id_thietBi: str):
    """
    Lấy tất cả thông tin kiểm tra bảo trì của một thiết bị cụ thể
    """
    try:
        # Tìm tất cả records của thiết bị này
        device_checks = list(maintenanceCheck.find({"id_thietBi": id_thietBi}, {"_id": 0}))
        
        if not device_checks:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy thông tin bảo trì cho thiết bị ID: {id_thietBi}"
            )
        
        return {
            "id_thietBi": id_thietBi,
            "ten_thietBi": device_checks[0].get("ten_thietBi", ""),
            "total_checks": len(device_checks),
            "maintenance_history": device_checks
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.put("/maintenance-check/update-status")
def update_maintenance_status(request: UpdateMaintenanceRequest):
    """
    Cập nhật trạng thái và ngày kiểm tra của thiết bị trong collection maintenanceCheck
    """
    try:
        # Validate format ngày (chỉ khi có ngay_check)
        if request.ngay_check:
            try:
                datetime.strptime(request.ngay_check, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail="Format ngày không đúng. Vui lòng sử dụng format YYYY-MM-DD"
                )
        
        # Validate trang_thai
        if request.trang_thai not in ["done", "pending"]:
            raise HTTPException(
                status_code=400,
                detail="Trạng thái phải là 'done' hoặc 'pending'"
            )
        
        # Tìm và cập nhật document
        filter_query = {
            "id_thietBi": request.id_thietBi
        }
        
        # Chuẩn bị update data
        update_fields = {"trang_thai": request.trang_thai}
        
        # Chỉ cập nhật ngay_check khi có giá trị
        if request.ngay_check:
            update_fields["ngay_check"] = request.ngay_check
        
        update_data = {"$set": update_fields}
        
        # Thực hiện cập nhật
        result = maintenanceCheck.update_many(filter_query, update_data)
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy thiết bị với ID: {request.id_thietBi}"
            )
        
        # Lưu log vào collection checkLogs
        log_entry = {
            "id_thietBi": request.id_thietBi,
            "action": "cập nhật trạng thái",
            "trang_thai": request.trang_thai,
            "ngay_check": request.ngay_check,
            "updated_count": result.modified_count,
            "created_at": datetime.now().isoformat(),
            "created_by": "system"
        }
        
        log_result = checkLogs.insert_one(log_entry)
        log_id = str(log_result.inserted_id)
        
        return UpdateMaintenanceResponse(
            success=True,
            message=f"Đã cập nhật thành công {result.modified_count} thiết bị",
            updated_count=result.modified_count
        )
        
    except HTTPException:
        # Re-raise HTTPException để giữ nguyên status code và message
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/maintenance-check/check-with-notes", response_model=CheckMaintenanceResponse)
def check_maintenance_with_notes(request: CheckMaintenanceRequest):
    """
    Kiểm tra thiết bị với ghi chú - tạo log và cập nhật trạng thái
    """
    try:
        # Bước 1: Truy xuất bản ghi đầy đủ hiện tại (old_data)
        old_data = maintenanceCheck.find_one({"id_thietBi": request.id_thietBi})
        
        if not old_data:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy thiết bị với ID: {request.id_thietBi}"
            )
        
        # Convert ObjectId to string for JSON serialization
        old_data["_id"] = str(old_data["_id"])
        
        # Bước 2: Merge (gộp) dữ liệu cũ với dữ liệu mới
        new_data = {
            **old_data,
            "trang_thai": "done",
            "ngay_check": request.ngay_check,
            "ghi_chu": request.ghi_chu,
            "last_updated": datetime.now().isoformat()
        }
        
        # Remove _id from new_data to avoid conflicts
        if "_id" in new_data:
            del new_data["_id"]
        
        # Bước 3: Cập nhật database
        filter_query = {"id_thietBi": request.id_thietBi}
        update_data = {"$set": new_data}
        
        result = maintenanceCheck.update_one(filter_query, update_data)
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Không thể cập nhật thiết bị với ID: {request.id_thietBi}"
            )
        
        # Bước 4: Lưu vào collection checkLogs
        log_entry = {
            "id_thietBi": request.id_thietBi,
            "ten_thietBi": old_data.get("ten_thietBi", ""),
            "action": "kiểm tra định kỳ",
            "chu_ky": old_data.get("chu_ky", ""),
            "old_data": old_data,
            "new_data": new_data,
            "ghi_chu": request.ghi_chu,
            "ngay_check": request.ngay_check,
            "created_at": datetime.now().isoformat(),
            "created_by": "system"  # Có thể thay bằng user_id thực tế
        }
        
        log_result = checkLogs.insert_one(log_entry)
        log_id = str(log_result.inserted_id)
        
        return CheckMaintenanceResponse(
            success=True,
            message=f"Đã kiểm tra thành công thiết bị {request.id_thietBi}",
            old_data=old_data,
            new_data=new_data,
            log_id=log_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/check-logs")
def get_check_logs():
    """
    Lấy tất cả logs từ collection checkLogs với các trường được chỉ định
    """
    try:
        # Lấy logs từ collection checkLogs với các trường cần thiết
        logs = list(checkLogs.find(
            {}, 
            {
                "_id": 0,
                "ten_thietBi": 1,
                "action": 1,
                "chu_ky": 1,
                "new_data": 1,
                "created_at": 1
            }
        ).sort("created_at", -1))
        
        return {
            "success": True,
            "total_logs": len(logs),
            "logs": logs
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/maintenance-logs/changes")
def get_maintenance_logs_changes():
    """
    Lấy các trường dữ liệu chỉ định từ collection maintenanceLogs:
    - timestamp, action, amr_id, new_data, changes
    """
    try:
        logs = list(
            maintenanceLogs.find(
                {},
                {
                    "_id": 0,
                    "timestamp": 1,
                    "action": 1,
                    "amr_id": 1,
                    "new_data": 1,
                    "changes": 1,
                },
            ).sort("timestamp", -1)
        )

        return {
            "success": True,
            "total_logs": len(logs),
            "logs": logs,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

