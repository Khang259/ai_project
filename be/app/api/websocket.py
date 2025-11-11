from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_service import manager
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

router = APIRouter()


@router.websocket("/ws/devices/{device_code}")
async def websocket_device_channel(websocket: WebSocket, device_code: str):
    """
    WebSocket channel gắn với từng thiết bị (device_code).

    Frontend kết nối tới ws://<host>/ws/devices/{device_code}. Sau khi kết nối
    thành công, phía server sẽ sử dụng device_code làm khóa để push dữ liệu
    realtime (ví dụ các task mới).
    """
    await manager.connect(websocket, device_code=device_code)
    try:
        while True:
            # Nếu frontend không gửi dữ liệu thì vẫn phải "consume" frame để tránh disconnect.
            message = await websocket.receive_text()
            logger.debug(f"Received WS message from {device_code}: {message}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected from device channel {device_code}")
        manager.disconnect(websocket, device_code=device_code)
    except Exception as exc:
        logger.error(f"Unexpected error on device WS {device_code}: {exc}")
        manager.disconnect(websocket, device_code=device_code)
        raise


@router.websocket("/ws/dashboard")
async def websocket_dashboard_channel(websocket: WebSocket):
    """
    WebSocket channel chung cho dashboard tổng quan.

    Frontend kết nối tới ws://<host>/ws/dashboard và sẽ nhận broadcast
    chung thông qua manager.broadcast(...)
    """
    await manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            logger.debug(f"Received WS message from dashboard client: {message}")
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected from dashboard channel")
        manager.disconnect(websocket)
    except Exception as exc:
        logger.error(f"Unexpected error on dashboard WS: {exc}")
        manager.disconnect(websocket)
        raise

