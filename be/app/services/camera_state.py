#Lưu trạng thái của camera vào Redis

import json
from datetime import datetime
from app.core.redis import redis_client

TTL_SECONDS = 5

def get_camera_state(camera_id:str):
    data = redis_client.get(f"camera:{camera_id}")
    if data:
        return json.loads(data)
    return None

def set_camera_state(camera_id:str, state:bool):
    now = datetime.now()
    formatted_time = now.strftime("%S:%M:%H")
    payload = {
        "status": state,
        "last_seen": formatted_time
    }
    redis_client.setex(
        f"camera:{camera_id}",
        TTL_SECONDS,
        json.dumps(payload)
        )
    
    # Publish event
    event_payload = {
        "type": "update",
        "camera_id": camera_id,
        "status": state,
        "last_seen": formatted_time
    }
    try:
        redis_client.publish("camera:events", json.dumps(event_payload))
    except Exception as e:
        print(f"Error publishing camera event: {e}")
    
    return payload