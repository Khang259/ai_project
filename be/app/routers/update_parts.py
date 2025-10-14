from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.core.database import amrParts
from app.models.part_schema import UpdateDateRequest, UpdateDateResponse

router = APIRouter()

@router.put("/part/update-date")
def update_part_date(request: UpdateDateRequest):
    """
    Cập nhật "Ngày update" trong collection amrParts dựa trên amr_id và Mã linh kiện
    """
    try:
        # Validate format ngày
        try:
            datetime.strptime(request.ngay_update, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Format ngày không đúng. Vui lòng sử dụng format YYYY-MM-DD"
            )
        
        # Tìm và cập nhật document
        filter_query = {
            "amr_id": request.amr_id,
            "Mã linh kiện": request.ma_linh_kien
        }
        
        update_data = {
            "$set": {
                "Ngày update": request.ngay_update
            }
        }
        
        # Thực hiện cập nhật
        result = amrParts.update_many(filter_query, update_data)
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy linh kiện với amr_id='{request.amr_id}' và Mã linh kiện='{request.ma_linh_kien}'"
            )
        
        return UpdateDateResponse(
            success=True,
            message=f"Đã cập nhật thành công {result.modified_count} document(s)",
            updated_count=result.modified_count
        )
        
    except HTTPException:
        # Re-raise HTTPException để giữ nguyên status code và message
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/part/{amr_id}/{ma_linh_kien}/current-date")
def get_current_date(amr_id: str, ma_linh_kien: str):
    """
    Lấy ngày update hiện tại của một linh kiện cụ thể
    """
    try:
        doc = amrParts.find_one({
            "amr_id": amr_id,
            "Mã linh kiện": ma_linh_kien
        }, {"Ngày update": 1, "Loại linh kiện": 1, "_id": 0})
        
        if not doc:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy linh kiện với amr_id='{amr_id}' và Mã linh kiện='{ma_linh_kien}'"
            )
        
        return {
            "amr_id": amr_id,
            "Mã linh kiện": ma_linh_kien,
            "Loại linh kiện": doc.get("Loại linh kiện"),
            "Ngày update": doc.get("Ngày update")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
