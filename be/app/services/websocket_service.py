from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
from shared.logging import get_logger
import json

logger = get_logger("camera_ai_app")
router = APIRouter()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.device_connections: Dict[str, List[WebSocket]] = {}
        self.group_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, device_code: str = None, group_id: str = None):
        await websocket.accept()
        
        if device_code:
            if device_code not in self.device_connections:
                self.device_connections[device_code] = []
            self.device_connections[device_code].append(websocket)
            logger.info(f"WebSocket connected to device {device_code}. Total connections: {len(self.device_connections[device_code])}")
        elif group_id:
            if group_id not in self.group_connections:
                self.group_connections[group_id] = []
            self.group_connections[group_id].append(websocket)
            logger.info(f"WebSocket connected to group {group_id}. Total connections: {len(self.group_connections[group_id])}")
        else:
            self.active_connections.append(websocket)
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, device_code: str = None, group_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        if device_code and device_code in self.device_connections:
            if websocket in self.device_connections[device_code]:
                self.device_connections[device_code].remove(websocket)
        elif group_id and group_id in self.group_connections:
            if websocket in self.group_connections[group_id]:
                self.group_connections[group_id].remove(websocket)
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
                self.disconnect(conn, device_code=device_code)

    async def broadcast_to_group(self, group_id: str, message: str):
        if group_id in self.group_connections:
            disconnected = []
            for connection in self.group_connections[group_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    disconnected.append(connection)
                    logger.error(f"Error broadcasting to group {group_id}: {e}")
                    
            for conn in disconnected:
                self.disconnect(conn, group_id=group_id)

manager = ConnectionManager()
monitor_manager = ConnectionManager()

@router.websocket("/ws/full-agv-data")
async def websocket_agv_data_all(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            await asyncio.sleep(1)  # Chỉ chờ nhận broadcast
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/ws/monitor-data")
async def websocket_monitor_data(websocket: WebSocket):
    await monitor_manager.connect(websocket)
    
    try:
        while True:
            await asyncio.sleep(1)  # Chỉ chờ nhận broadcast
    except WebSocketDisconnect:
        monitor_manager.disconnect(websocket)

async def broadcast_monitor_data():
    await monitor_manager.broadcast(json.dumps({"changed": True}))