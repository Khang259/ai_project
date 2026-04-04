from fastapi import APIRouter, Request, HTTPException, Query
from app.services.websocket_service import manager
import json
from app.services.notification_service import filter_notification, get_notifications_from_db, get_notification_by_device
from shared.logging import get_logger

logger = get_logger("camera_ai_app")
router = APIRouter()

@router.post("/notification-data")
async def send_notification(request: Request):
    data = await request.json()
    try:
        await filter_notification(data)
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "success", "description": "Notification sent successfully"}


@router.get("/notifications")
async def get_notifications(
    page: int = 1,
    limit: int = 20,
    area_id: str | None = Query(None, description="Lọc theo area_id (để trống = tất cả)"),
):
    try:
        return await get_notifications_from_db(page=page, limit=limit, area_id=area_id)
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications-by-device")
async def get_notifications_by_device(
    device_num: str = Query(..., description="Số thiết bị cần lấy thông báo"),
    start_date: str | None = Query(None, description="Thời gian bắt đầu (ISO hoặc YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="Thời gian kết thúc (ISO hoặc YYYY-MM-DD)"),
):
    """
    Lấy thông báo theo device_num trong khoảng thời gian [start_date, end_date].
    Nếu không truyền start/end thì lấy tất cả theo device.
    """
    try:
        return await get_notification_by_device(
            device_num=device_num,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        logger.error(f"Error getting notifications by device: {e}")
        raise HTTPException(status_code=500, detail=str(e))
