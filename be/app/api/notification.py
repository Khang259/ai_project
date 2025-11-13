from fastapi import APIRouter, Request, HTTPException, Query
from app.services.websocket_service import manager
import json
from app.services.notification_service import filter_notification, get_notifications_from_db
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
async def get_notifications(page: int = 1, limit: int = 20):
    try:
        return await get_notifications_from_db(page, limit)

    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
