"""
CameraAI Backend Application
Main FastAPI application with authentication
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import sys
import os
import asyncio
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
from be.shared import setup_logger
from be.app.core.config import settings
from be.app.api import auth, users, permissions, websocket as websocket_api, node, roles, area, caller, notification, camera, task_status, monitor, analytic, route, agv_dashboard, dashboard_performance
from be.app.core.database import connect_to_mongo, close_mongo_connection
from be.app.scheduler import start_scheduler, shutdown_scheduler
from be.app.services.role_service import initialize_default_permissions, initialize_default_roles
from be.app.routers.parts_summary import router as parts_router
from be.app.routers.part_detail import router as part_detail_router
from be.app.routers.update_parts import router as update_router
from be.app.routers.sum_parts_replace import router as sum_parts_router
from be.app.routers.update_part_with_log import router as update_part_log_router
from be.app.routers.maintenance_check import router as maintenance_check_router
from be.app.routers.update_amr_name import router as update_amr_name_router
from be.app.routers.pdf import router as pdf_router
from be.app.services.role_service import initialize_default_permissions, initialize_default_roles
from be.app.services.notification_service import notification_service
from be.app.services.heartbeat_service import websocket_heartbeat_service
from be.app.services.task_service import task_service
from be.app.services.websocket_service import manager as websocket_manager
from be.app.services.modbusTCP_service import modbus_device_manager
from be.app.api.camera_event import router as camera_event_router
from be.app.services.camera_ping_service import monitor_loop
from be.app.api.ai import router as ai_router
from be.app.routers.points_settings import router as points_router

logger = setup_logger("camera_ai_app", "INFO", "app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting CameraAI Backend...")
    await connect_to_mongo(settings.mongo_url, settings.mongo_db)
    
    # Khởi tạo default permissions và roles (nếu chưa có)
    try:
        logger.info("Initializing default permissions...")
        await initialize_default_permissions()
        logger.info("Default permissions initialized")
        
        logger.info("Initializing default roles...")
        await initialize_default_roles()
        logger.info("Default roles initialized")
    except Exception as e:
        logger.error(f"Error initializing default permissions/roles: {e}")
    
    # Khởi tạo default permissions và roles (nếu chưa có)
    try:
        logger.info("Initializing default permissions...")
        await initialize_default_permissions()
        logger.info("Default permissions initialized")
        
        logger.info("Initializing default roles...")
        await initialize_default_roles()
        logger.info("Default roles initialized")
    except Exception as e:
        logger.error(f"Error initializing default permissions/roles: {e}")
    
    # Khởi động scheduler
    start_scheduler()
    logger.info("AGV Scheduler started")
    await notification_service.start()
    logger.info("Notification service started")
    await task_service.start()
    logger.info("Task service started")
    await websocket_heartbeat_service.start()
    logger.info("Heartbeat service started")
    await modbus_device_manager.start()
    logger.info("Modbus device manager started")

    monitor_task = asyncio.create_task(monitor_loop())
    logger.info("Camera ping service started")
    yield
    
    # Shutdown - Thứ tự quan trọng: đóng connections trước, sau đó stop services
    logger.info("Shutting down CameraAI Backend...")
    
    # 1. Dừng heartbeat service trước (để tránh gửi heartbeat đến connections đang đóng)
    await websocket_heartbeat_service.stop()
    logger.info("Heartbeat service stopped")
    
    # 2. Đóng tất cả WebSocket connections
    await websocket_manager.disconnect_all()
    logger.info("All WebSocket connections closed")
    
    # 3. Dừng các background services (notification và task service)
    await notification_service.stop()
    logger.info("Notification service stopped")
    await task_service.stop()
    logger.info("Task service stopped")

    await modbus_device_manager.stop()
    logger.info("Modbus device manager stopped")
    
    # 4. Dừng scheduler (đợi jobs đang chạy hoàn thành với timeout)
    shutdown_scheduler()
    logger.info("AGV Scheduler stopped")

    # Shutdown
    monitor_task.cancel()
    logger.info("Camera ping service stopped")
    await close_mongo_connection()
    logger.info("CameraAI Backend shutdown completed")
    
    # 5. Đóng database connection cuối cùng
    await close_mongo_connection()
    logger.info("MongoDB connection closed")
    
    logger.info("CameraAI Backend shutdown completed")

# Create FastAPI app
app = FastAPI(
    title="Camera AI System",
    description="AI-powered camera management system with permission management",
    version="1.0.0",
    lifespan=lifespan
)

origins=["http://localhost:5173",
"http://192.168.1.114:5173", "http://100.93.141.62:5173"]
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["User Management"])
app.include_router(permissions.router, prefix="/permissions", tags=["Permission Management"])
app.include_router(roles.router, prefix="/roles", tags=["Role Management"])
app.include_router(area.router, prefix="/areas", tags=["Area Management"])
app.include_router(route.router, prefix="/routes", tags=["Route Management"])
app.include_router(node.router, prefix="/nodes", tags=["Node Management"])
app.include_router(camera.router, prefix="/cameras", tags=["Camera Management"])
app.include_router(agv_dashboard.router, tags=["AGV Dashboard"])
app.include_router(websocket_api.router, tags=["WebSocket"])
app.include_router(caller.router, prefix="/caller", tags=["Caller"])
app.include_router(notification.router, tags=["Notification"])
app.include_router(task_status.router, tags=["Task Status"])
app.include_router(dashboard_performance.router, tags=["Dashboard Performance"])
# Add Maintenance API
app.include_router(parts_router, prefix="/api", tags=["Parts Summary"])
app.include_router(part_detail_router, prefix="/api", tags=["Part Detail"])
app.include_router(update_router, prefix="/api", tags=["Update Parts"])
app.include_router(sum_parts_router, prefix="/api", tags=["Sum Parts Replace"])
app.include_router(update_part_log_router, prefix="/api", tags=["Update Part With Log"])
app.include_router(maintenance_check_router, prefix="/api", tags=["Maintenance Check"])
app.include_router(update_amr_name_router, prefix="/api", tags=["Update AMR Name"])

app.include_router(pdf_router, tags=["PDF"])
app.include_router(notification.router, tags=["Notification"])
app.include_router(task_status.router, tags=["Task Status"])
app.include_router(monitor.router, prefix="/monitor", tags=["Monitor Management"])
app.include_router(analytic.router, tags=["Analysis"])

app.include_router(camera_event_router, tags=["Camera Event"])
app.include_router(ai_router, prefix="/ai", tags=["AI"])
app.include_router(points_router)

@app.get("/")
async def root():
    return {"message": "Camera AI System API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_debug
    )