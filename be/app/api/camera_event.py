import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.core.redis import redis_client
from shared import setup_logger

logger = setup_logger("sse_camera_event", "INFO", "sse_camera_event")

router = APIRouter()

#SSE
@router.get("/camera-event")
async def camera_event():
    async def event_generator():
        pubsub = None
        try:
            initial_data = {}
            for key in redis_client.scan_iter("camera:*"):
                try:
                    data = redis_client.get(key)
                    logger.debug(f"[SSE] Reading key {key}: {data}")
                    if data:
                        initial_data[key] = json.loads(data)
                except Exception as e:
                    logger.error(f"Error reading key {key}: {e}")
                    continue
            
            initial_payload = {
                "type": "initial",
                "data": initial_data
            }
            yield f"data: {json.dumps(initial_payload)}\n\n"
            
            # Subscribe vào Redis channel để nhận updates
            pubsub = redis_client.pubsub()
            pubsub.subscribe("camera:events")
            
            # Bỏ qua subscribe confirmation message
            pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            
            # Listen cho messages (non-blocking)
            while True:
                try:
                    msg = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if msg and msg["type"] == "message":
                        yield f"data: {msg['data']}\n\n"
                    # Cho phép event loop xử lý tasks khác
                    await asyncio.sleep(0.1)
                except asyncio.CancelledError:
                    # Client disconnect hoặc server shutdown
                    break
                except Exception as e:
                    logger.error(f"[SSE] Error in message loop: {e}")
                    await asyncio.sleep(1)
                
        except Exception as e:
            logger.error(f"SSE error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        finally:
            if pubsub:
                try:
                    pubsub.close()
                except:
                    pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )