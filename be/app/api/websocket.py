from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_service import manager
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

router = APIRouter()


@router.websocket("/ws/route/{device_code}")
async def websocket_device_channel(websocket: WebSocket, device_code: str):
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

@router.websocket("/ws/group/{group_id}")
async def websocket_group_channel(websocket: WebSocket, group_id: str):
    await manager.connect(websocket, group_id=group_id)
    try:
        while True:
            # Nếu frontend không gửi dữ liệu thì vẫn phải "consume" frame để tránh disconnect.
            message = await websocket.receive_text()
            logger.debug(f"Received WS message from {group_id}: {message}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected from notification channel {group_id}")
        manager.disconnect(websocket, group_id=group_id)
    except Exception as exc:
        logger.error(f"Unexpected error on notification WS {group_id}: {exc}")
        manager.disconnect(websocket, group_id=group_id)
        raise


@router.websocket("/ws/admin")
async def websocket_dashboard_channel(websocket: WebSocket):
    """
    WebSocket channel tổng - nhận TẤT CẢ các thông báo và lệnh:
    - Broadcast chung (broadcast)
    - Broadcast đến device (broadcast_to_device)
    - Broadcast đến group (broadcast_to_group)
    - Tất cả các loại thông báo khác
    
    Frontend kết nối tới ws://<host>/ws/dashboard để nhận tất cả messages
    """
    await manager.connect(websocket, is_global=True)
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

