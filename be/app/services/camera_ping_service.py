# camera_ping_service.py

import asyncio
import time
from collections import deque
from app.services.camera_state import get_camera_state, set_camera_state

# Danh sách camera (giảm xuống để test nhanh)
CAMERAS = []
for cam in range(100, 110):  # 1 -> 300
    CAMERAS.append({
        "id": f"Camera{cam:03d}",          # cam001, cam002, ..., cam299, cam300
        "ip": f"192.168.1.{cam}",
        "port": f"8554/cam_{cam}"       # cam_001, cam_002, ...
    })

WINDOW_SIZE = 3
CHECK_INTERVAL = 5
MAX_CONCURRENT_PINGS = 20  # Thử 50-100, tùy hiệu suất máy Windows

semaphore = asyncio.Semaphore(MAX_CONCURRENT_PINGS)

camera_windows = {
    cam["id"]: deque(maxlen=WINDOW_SIZE) for cam in CAMERAS
}

async def ping_camera(host: str, port: int, timeout: int = 3):
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host=host, port=port),
            timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
        return True
    except Exception:
        print(f"Ping failed {host}:{port}")
        return False

async def check_camera_status(cam):
    async with semaphore:
        port_number = int(cam["port"].split('/')[0])  # 8554

        ok = await ping_camera(cam["ip"], port_number)
        
        windows = camera_windows[cam["id"]]
        windows.append(ok)

        # Nếu 3 lần ping liên tiếp thành công -> online (True)
        new_status = True if windows.count(True) >= WINDOW_SIZE else False

        old = get_camera_state(cam["id"])
        if not old or old["status"] != new_status:
            set_camera_state(cam["id"], new_status)

async def monitor_loop():
    while True:
        await asyncio.gather(
            *(check_camera_status(cam) for cam in CAMERAS)
        )
        await asyncio.sleep(CHECK_INTERVAL)