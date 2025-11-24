"""
CameraAI Backend Application
Main FastAPI application with authentication
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import setup_logger
from app.core.config import settings
from app.api import auth, users, permissions, websocket as websocket_api, node, roles, area, caller, notification, camera, task_status, monitor, analytic, route
from app.core.database import connect_to_mongo, close_mongo_connection
from app.scheduler import start_scheduler, shutdown_scheduler
from app.services.role_service import initialize_default_permissions, initialize_default_roles
from app.routers.parts_summary import router as parts_router
from app.routers.part_detail import router as part_detail_router
from app.routers.update_parts import router as update_router
from app.routers.sum_parts_replace import router as sum_parts_router
from app.routers.update_part_with_log import router as update_part_log_router
from app.routers.maintenance_check import router as maintenance_check_router
from app.routers.update_amr_name import router as update_amr_name_router
from app.routers.pdf import router as pdf_router
from app.services.role_service import initialize_default_permissions, initialize_default_roles
from app.services.notification_service import notification_service

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
    
    yield
    
    # Shutdown
    logger.info("Shutting down CameraAI Backend...")
    shutdown_scheduler()
    logger.info("AGV Scheduler stopped")
    await notification_service.stop()
    logger.info("Notification service stopped")
    await close_mongo_connection()

# Create FastAPI app
app = FastAPI(
    title="Camera AI System",
    description="AI-powered camera management system with permission management",
    version="1.0.0",
    lifespan=lifespan
)

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
        host="0.0.0.0",
        port=8001,
        reload=settings.app_debug
    )