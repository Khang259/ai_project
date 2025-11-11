from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
from shared.logging import get_logger

logger = get_logger("camera_ai_app")
router = APIRouter()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.device_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, device_code: str = None):
        await websocket.accept()
        
        if device_code:
            if device_code not in self.device_connections:
                self.device_connections[device_code] = []
            self.device_connections[device_code].append(websocket)
            logger.info(f"WebSocket connected to device {device_code}. Total connections: {len(self.device_connections[device_code])}")
        else:
            self.active_connections.append(websocket)
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, device_code: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        if device_code and device_code in self.device_connections:
            if websocket in self.device_connections[device_code]:
                self.device_connections[device_code].remove(websocket)
                
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_device(self, device_code: str, message: str):
        if device_code in self.device_connections:
            disconnected = []
            for connection in self.device_connections[device_code]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    disconnected.append(connection)
                    logger.error(f"Error broadcasting to device {device_code}: {e}")
                    
            for conn in disconnected:
                self.disconnect(conn, device_code)

manager = ConnectionManager()

