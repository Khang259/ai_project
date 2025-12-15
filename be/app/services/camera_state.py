#Lưu trạng thái của camera vào Redis

import json
from datetime import datetime
from app.core.redis import redis_client

TTL_SECONDS = 500

now = datetime.now()
formatted_time = now.strftime("%S:%M:%H")


def get_camera_state(camera_id:str):
    data = redis_client.get(f"camera:{camera_id}")
    if data:
        return json.loads(data)
    return None

def set_camera_state(camera_id:str, state:str):
    payload = {
        "status": state,
        "last_seen": formatted_time
    }
    redis_client.setex(
        f"camera:{camera_id}",
        TTL_SECONDS,
        json.dumps(payload)
        )
    return payload