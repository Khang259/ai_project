from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from shared.logging import get_logger

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.websocket("/ws/agv")
async def agv_websocket(websocket: WebSocket):
    await websocket.accept()
    client = f"{websocket.client.host}:{websocket.client.port}" if websocket.client else "unknown"
    logger.info(f"[WS] Client connected: {client}")
    try:
        while True:
            message = await websocket.receive_text()
            logger.debug(f"[WS] Received from {client}: {message}")
            # Echo back; place to integrate AGV stream or broker later
            await websocket.send_text(message)
    except WebSocketDisconnect:
        logger.info(f"[WS] Client disconnected: {client}")

