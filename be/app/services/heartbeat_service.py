import asyncio
import contextlib
import json
from typing import Optional
from shared.logging import get_logger
from .websocket_service import manager

logger = get_logger("camera_ai_app")

class WebSocketHeartbeatService:
    """Service để gửi heartbeat đến tất cả WebSocket connections"""
    
    def __init__(self, heartbeat_interval: int = 30):
        """
        Args:
            heartbeat_interval: Khoảng thời gian gửi heartbeat (giây)
        """
        self._heartbeat_interval = heartbeat_interval
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> None:
        """Khởi động heartbeat task"""
        if not self._running:
            self._running = True
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            logger.info(f"WebSocket Heartbeat service started (interval: {self._heartbeat_interval}s)")

    async def stop(self) -> None:
        """Dừng heartbeat task"""
        self._running = False
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._heartbeat_task
            self._heartbeat_task = None
            logger.info("WebSocket Heartbeat service stopped")

    async def _heartbeat_loop(self) -> None:
        """Gửi heartbeat đến tất cả connections để kiểm tra health"""
        while self._running:
            try:
                await asyncio.sleep(self._heartbeat_interval)
                
                if not manager.active_connections:
                    continue
                
                # Gửi heartbeat message đến tất cả connections
                heartbeat_message = json.dumps({
                    "type": "heartbeat",
                    "timestamp": asyncio.get_event_loop().time()
                })
                
                dead_connections = []
                
                for websocket in list(manager.active_connections):
                    try:
                        await websocket.send_text(heartbeat_message)
                        logger.info(f"Sent heartbeat to connection: {websocket}")
                    except Exception as e:
                        # Nếu gửi lỗi → connection đã dead
                        logger.debug(f"Heartbeat failed for connection: {e}")
                        dead_connections.append(websocket)
                
                # Cleanup dead connections
                if dead_connections:
                    logger.info(f"Cleaning up {len(dead_connections)} dead connection(s) detected by heartbeat")
                    for conn in dead_connections:
                        manager.disconnect(conn)
                        
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")

# Global instance
websocket_heartbeat_service = WebSocketHeartbeatService(heartbeat_interval=30)