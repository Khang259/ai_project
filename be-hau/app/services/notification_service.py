# backend/app/services/notification_service.py - Phiên bản cải tiến

from datetime import datetime
from app.core.database import get_collection
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

async def filter_notification(payload: list):
    alarm_collection = get_collection("alarm")
    count = 0
    alarms = []
    for record in payload:
        alarm_date = datetime.now()
        alarm_data = {
            "device_code": record.get("deviceNum"),
            "device_name": record.get("deviceName"),
            "alarm_type": record.get("alarmType"),
            "area_id": record.get("areaId"),
            "channel_name": record.get("channelName"),
            "alarm_date": alarm_date,
            "alarm_grade": record.get("alarmGrade"),
        }
        alarms.append(alarm_data)
        count += 1
    if len(alarms) > 0:
        await alarm_collection.insert_many(alarms)
    return {"status": "success", "data": f"Saved {count} alarm records"}