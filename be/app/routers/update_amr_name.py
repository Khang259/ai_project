from fastapi import APIRouter, HTTPException
from app.core.database import get_collection
from app.schemas.part_schema import UpdateAMRNameRequest, UpdateAMRNameResponse

router = APIRouter()

@router.put("/amr/update-name")
async def update_amr_name(request: UpdateAMRNameRequest):
    """
    Cập nhật tên AMR (amr_id) trong collection amrParts
    Thay đổi tất cả documents có amr_id cũ thành amr_id mới
    """
    try:
        # Validate input
        if not request.old_amr_id or not request.new_amr_id:
            raise HTTPException(
                status_code=400, 
                detail="old_amr_id và new_amr_id không được để trống"
            )
        
        if request.old_amr_id == request.new_amr_id:
            raise HTTPException(
                status_code=400, 
                detail="old_amr_id và new_amr_id không được giống nhau"
            )
        
        # Kiểm tra xem có documents nào với amr_id cũ không
        amrParts = get_collection("amrParts")
        existing_docs = await amrParts.count_documents({"amr_id": request.old_amr_id})
        
        if existing_docs == 0:
            raise HTTPException(
                status_code=404, 
                detail=f"Không tìm thấy documents nào với amr_id='{request.old_amr_id}'"
            )
        
        # Kiểm tra xem amr_id mới đã tồn tại chưa
        existing_new_docs = await amrParts.count_documents({"amr_id": request.new_amr_id})
        if existing_new_docs > 0:
            raise HTTPException(
                status_code=409, 
                detail=f"amr_id='{request.new_amr_id}' đã tồn tại. Vui lòng chọn tên khác"
            )
        
        # Thực hiện cập nhật
        filter_query = {"amr_id": request.old_amr_id}
        update_data = {
            "$set": {
                "amr_id": request.new_amr_id
            }
        }
        
        result = await amrParts.update_many(filter_query, update_data)
        
        return UpdateAMRNameResponse(
            success=True,
            message=f"Đã cập nhật thành công {result.modified_count} documents từ amr_id='{request.old_amr_id}' thành amr_id='{request.new_amr_id}'",
            updated_count=result.modified_count
        )
        
    except HTTPException:
        # Re-raise HTTPException để giữ nguyên status code và message
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/amr/{amr_id}/exists")
async def check_amr_exists(amr_id: str):
    """
    Kiểm tra xem amr_id có tồn tại trong collection amrParts không
    """
    try:
        amrParts = get_collection("amrParts")
        count = await amrParts.count_documents({"amr_id": amr_id})
        
        return {
            "amr_id": amr_id,
            "exists": count > 0,
            "document_count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
