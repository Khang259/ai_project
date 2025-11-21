from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_service import manager
from shared.logging import get_logger

logger = get_logger("camera_ai_app")

router = APIRouter()


@router.websocket("/ws/route/{route_name}")
async def websocket_route_channel(websocket: WebSocket, route_name: str):
    await manager.connect(websocket, route_code=route_name)
    try:
        while True:
            # Nếu frontend không gửi dữ liệu thì vẫn phải "consume" frame để tránh disconnect.
            message = await websocket.receive_text()
            logger.debug(f"Received WS message from {route_name}: {message}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected from route channel {route_name}")
        manager.disconnect(websocket, route_code=route_name)
    except Exception as exc:
        logger.error(f"Unexpected error on route WS {route_name}: {exc}")
        manager.disconnect(websocket, route_code=route_name)
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

