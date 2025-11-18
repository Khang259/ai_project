from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
from shared.logging import get_logger

import json

logger = get_logger("camera_ai_app")
router = APIRouter()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.device_connections: Dict[str, Set[WebSocket]] = {}
        self.group_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, device_code: str = None, group_id: str = None):
        await websocket.accept()

        self.active_connections.add(websocket)
        
        if device_code:
            if device_code not in self.device_connections:
                self.device_connections[device_code] = set() 
            self.device_connections[device_code].add(websocket)  
            logger.info(f"WebSocket connected to device {device_code}. Total: {len(self.device_connections[device_code])}")
        elif group_id:
            if group_id not in self.group_connections:
                self.group_connections[group_id] = set()  
            self.group_connections[group_id].add(websocket)  
            logger.info(f"WebSocket connected to group {group_id}. Total: {len(self.group_connections[group_id])}")
        else:
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, device_code: str = None, group_id: str = None):
        self.active_connections.discard(websocket)
            
        if device_code and device_code in self.device_connections:
            if websocket in self.device_connections[device_code]:
                self.device_connections[device_code].discard(websocket)
                if not self.device_connections[device_code]:
                    del self.device_connections[device_code]
        elif group_id and group_id in self.group_connections:
            if websocket in self.group_connections[group_id]:
                self.group_connections[group_id].discard(websocket)
                if not self.group_connections[group_id]:
                    del self.group_connections[group_id]
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

