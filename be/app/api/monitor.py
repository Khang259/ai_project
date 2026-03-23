from fastapi import APIRouter, HTTPException, status, Query
from typing import List
from datetime import datetime
from app.schemas.monitor import (
    MonitorRequest,
    MonitorResponse,
    MonitorOut,
)
from app.services.monitor_service import (
    save_monitors_with_bulk,
    get_monitor,
)


router = APIRouter()

@router.post("/sync-plan", response_model=MonitorResponse, status_code=status.HTTP_200_OK)
async def sync_plan_endpoint(payload: List[MonitorRequest]):
    try:
        result = await save_monitors_with_bulk(payload)
        return MonitorResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/", response_model=List[MonitorOut])
async def get_monitors(date: datetime = Query(..., description="Ngày cần lấy (YYYY-MM-DD)")):
    try:
        return await get_monitor(date)
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


