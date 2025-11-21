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
        self.route_connections: Dict[str, Set[WebSocket]] = {}
        self.group_connections: Dict[str, Set[WebSocket]] = {}
        self.global_connections: Set[WebSocket] = set()  # Connections nhận tất cả messages (dashboard)

    async def connect(self, websocket: WebSocket, route_code: str = None, group_id: str = None, is_global: bool = False):
        await websocket.accept()

        self.active_connections.add(websocket)
        
        if route_code:
            if route_code not in self.route_connections:
                self.route_connections[route_code] = set() 
            self.route_connections[route_code].add(websocket)  
            logger.info(f"WebSocket connected to route {route_code}. Total: {len(self.route_connections[route_code])}")
        elif group_id:
            if group_id not in self.group_connections:
                self.group_connections[group_id] = set()  
            self.group_connections[group_id].add(websocket)  
            logger.info(f"WebSocket connected to group {group_id}. Total: {len(self.group_connections[group_id])}")
        else:
            logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Thêm vào global connections nếu là global connection (dashboard)
        if is_global:
            self.global_connections.add(websocket)
            logger.info(f"WebSocket added to global connections (will receive all messages). Total global: {len(self.global_connections)}")

    def disconnect(self, websocket: WebSocket, route_code: str = None, group_id: str = None):
        self.active_connections.discard(websocket)
        self.global_connections.discard(websocket)  # Remove from global connections too
            
        if route_code and route_code in self.route_connections:
            if websocket in self.route_connections[route_code]:
                self.route_connections[route_code].discard(websocket)
                if not self.route_connections[route_code]:
                    del self.route_connections[route_code]
        elif group_id and group_id in self.group_connections:
            if websocket in self.group_connections[group_id]:
                self.group_connections[group_id].discard(websocket)
                if not self.group_connections[group_id]:
                    del self.group_connections[group_id]
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}, Total global: {len(self.global_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast(self, message: str):
        """Helper method để broadcast đến global connections"""
        if not self.global_connections:
            return
        
        disconnected = []
        for connection in list(self.global_connections):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to global connection: {e}")
                disconnected.append(connection)
        
        # Remove disconnected global connections
        for conn in disconnected:
            self.global_connections.discard(conn)
            self.active_connections.discard(conn)

    async def broadcast_to_route(self, route_code: str, message: str):
        """Broadcast message đến route connections và global connections"""
        disconnected = []
        
        # Gửi đến route connections
        if route_code in self.route_connections:
            for connection in self.route_connections[route_code]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    disconnected.append(connection)
                    logger.error(f"Error broadcasting to route {route_code}: {e}")
                    
            for conn in disconnected:
                self.disconnect(conn, route_code=route_code)
        
        # Cũng gửi đến global connections (dashboard)
        await self.broadcast(message)

    async def broadcast_to_group(self, group_id: str, message: str):
        """Broadcast message đến group connections và global connections"""
        disconnected = []
        
        # Gửi đến group connections
        if group_id in self.group_connections:
            for connection in self.group_connections[group_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    disconnected.append(connection)
                    logger.error(f"Error broadcasting to group {group_id}: {e}")
                    
            for conn in disconnected:
                self.disconnect(conn, group_id=group_id)
        
        # Cũng gửi đến global connections (dashboard)
        await self.broadcast(message)

    async def disconnect_all(self):
        """Đóng tất cả WebSocket connections khi shutdown"""
        if not self.active_connections:
            logger.info("No active WebSocket connections to close")
            return
        
        logger.info(f"Closing {len(self.active_connections)} active WebSocket connection(s)...")
        disconnected = []
        
        # Đóng tất cả connections
        for websocket in list(self.active_connections):
            try:
                await websocket.close()
                disconnected.append(websocket)
            except Exception as e:
                logger.error(f"Error closing WebSocket connection: {e}")
                disconnected.append(websocket)
        
        # Cleanup tất cả connections
        for conn in disconnected:
            self.active_connections.discard(conn)
        
        # Clear tất cả dictionaries
        self.route_connections.clear()
        self.group_connections.clear()
        self.global_connections.clear()
        
        logger.info(f"All WebSocket connections closed. Total: {len(disconnected)}")

manager = ConnectionManager()

