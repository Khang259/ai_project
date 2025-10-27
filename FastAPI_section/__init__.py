# __init__.py - FastAPI Section Package

"""
FastAPI Section Package
Chứa tất cả các modules liên quan đến FastAPI API server
"""

from main import app, main
from models import (
    SystemConfig,
    AIControl,
    SystemResponse,
    CameraInfo,
    SystemStatus,
    HealthStatus
)
from system_manager import (
    startup_system,
    shutdown_system,
    restart_system_background,
    get_camera_orchestrator,
    get_roi_processor,
    get_stable_pair_processor,
    get_system_status,
    update_ai_status
)
from api_routes import router

__version__ = "1.0.0"
__author__ = "AI Camera System"

__all__ = [
    # Main app
    "app",
    "main",
    
    # Models
    "SystemConfig",
    "AIControl", 
    "SystemResponse",
    "CameraInfo",
    "SystemStatus",
    "HealthStatus",
    
    # System Manager
    "startup_system",
    "shutdown_system",
    "restart_system_background",
    "get_camera_orchestrator",
    "get_roi_processor", 
    "get_stable_pair_processor",
    "get_system_status",
    "update_ai_status",
    
    # API Routes
    "router"
]
