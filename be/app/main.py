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
from app.api import auth, users, permissions, agv_dashboard, agv_websocket, node, roles, area, caller, notification, camera, task_status
from app.core.database import connect_to_mongo, close_mongo_connection
from app.scheduler import start_scheduler, shutdown_scheduler

logger = setup_logger("camera_ai_app", "INFO", "app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting CameraAI Backend...")
    await connect_to_mongo(settings.mongo_url, settings.mongo_db)
    
    # Khởi động scheduler
    start_scheduler()
    logger.info("AGV Scheduler started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down CameraAI Backend...")
    shutdown_scheduler()
    logger.info("AGV Scheduler stopped")
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
app.include_router(node.router, prefix="/nodes", tags=["Node Management"])
app.include_router(camera.router, prefix="/cameras", tags=["Camera Management"])
app.include_router(agv_dashboard.router, tags=["AGV Dashboard"])
app.include_router(agv_websocket.router, tags=["AGV WebSocket"])
app.include_router(caller.router, prefix="/caller", tags=["Caller"])
app.include_router(notification.router, tags=["Notification"])
app.include_router(task_status.router, tags=["Task Status"])

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