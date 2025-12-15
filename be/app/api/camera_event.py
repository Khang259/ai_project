#Khởi tạo api để sse

import asyncio
import json
from fastapi import APIRouter
from app.core.redis import redis_client


router = APIRouter()

#SSE endpoint để lấy sự kiện từ Redis
@router.get("/camera-event")
async def camera_event():
    async def event_generator():
        pubsub = redis_client.pubsub()
        pubsub.subscribe("camera:events")

        for msg in pubsub.listen():
            if msg["type"] == "message":
                yield f"data: {msg['data']}\n\n"
                await asyncio.sleep(0)

    return event_generator()

@router.get("/cameras_status")
async def get_all_status():
    result = {}
    for key in redis_client.scan_iter("camera:*"):
        result[key] = json.loads(redis_client.get(key))
    return result