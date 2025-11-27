from fastapi import APIRouter, HTTPException, Query
from app.services.dashboard_performance_service import get_performance_dashboard
router = APIRouter(prefix="/dashboard", tags=["Dashboard Performance"])

@router.get("/performance_dashboard")
async def get_performance_dashboard_endpoint( group_id: str = Query(..., description="Group ID")):
    """ 
    Trả dữ liệu cho biểu đồ hiệu suất theo cột theo group_id
    """
    try:
        result = await get_performance_dashboard(group_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))