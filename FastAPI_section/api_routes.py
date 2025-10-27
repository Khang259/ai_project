# api_routes.py - API routes và endpoints

import time
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any

from models import SystemResponse, AIControl, SystemStatus, HealthStatus
from system_manager import (
    get_camera_orchestrator, 
    get_roi_processor, 
    get_stable_pair_processor,
    get_system_status,
    update_ai_status,
    restart_system_background
)

# Create router
router = APIRouter()

@router.get("/", response_model=SystemResponse)
async def root():
    """Root endpoint - System info"""
    return SystemResponse(
        status="success",
        message="AI Camera Control System API",
        data={
            "version": "1.0.0",
            "endpoints": {
                "status": "/api/status",
                "ai_control": "/api/ai/toggle",
                "system_control": "/api/system/restart",
                "docs": "/docs"
            }
        }
    )

@router.get("/api/status", response_model=SystemResponse)
async def get_system_status():
    """Lấy trạng thái hệ thống"""
    try:
        camera_orchestrator = get_camera_orchestrator()
        system_status = get_system_status()
        
        # Get camera system status
        camera_status = {}
        if camera_orchestrator:
            camera_status = {
                "running": system_status["camera_system"]["running"],
                "ai_enabled": system_status["camera_system"]["ai_enabled"],
                "active_cameras": len(camera_orchestrator.shared_dict),
                "num_processes": len([p for p in camera_orchestrator.processes if p.is_alive()]),
                "num_ai_processes": len([p for p in camera_orchestrator.ai_process if p.is_alive()])
            }
        
        return SystemResponse(
            status="success",
            message="System status retrieved",
            data={
                "camera_system": camera_status,
                "roi_processor": {
                    "running": system_status["roi_processor"]["running"]
                },
                "stable_pair_processor": {
                    "running": system_status["stable_pair_processor"]["running"]
                },
                "post_api": {
                    "running": system_status["post_api"]["running"]
                },
                "timestamp": time.time()
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")

@router.post("/api/ai/toggle", response_model=SystemResponse)
async def toggle_ai(control: AIControl):
    """Bật/tắt AI detection"""
    try:
        camera_orchestrator = get_camera_orchestrator()
        roi_processor = get_roi_processor()
        if not camera_orchestrator:
            raise HTTPException(status_code=400, detail="Camera system not initialized")
        
        # Toggle AI
        result = camera_orchestrator.toggle_ai(control.enable)
        para_toggle_roi = 1 if control.enable else 0
        roi_processor.toggle_enable(para_toggle_roi)

        # Update system status
        update_ai_status(control.enable)
        
        return SystemResponse(
            status="success",
            message=f"AI {'enabled' if control.enable else 'disabled'}",
            data={
                "ai_enabled": control.enable,
                "result": result
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error toggling AI: {str(e)}")

@router.get("/api/ai/status", response_model=SystemResponse)
async def get_ai_status():
    """Lấy trạng thái AI"""
    try:
        camera_orchestrator = get_camera_orchestrator()
        if not camera_orchestrator:
            raise HTTPException(status_code=400, detail="Camera system not initialized")
        
        system_status = get_system_status()
        ai_running = any(p.is_alive() for p in camera_orchestrator.ai_process)
        
        return SystemResponse(
            status="success",
            message="AI status retrieved",
            data={
                "ai_enabled": system_status["camera_system"]["ai_enabled"],
                "ai_running": ai_running,
                "num_ai_processes": len([p for p in camera_orchestrator.ai_process if p.is_alive()])
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI status: {str(e)}")

@router.post("/api/system/restart", response_model=SystemResponse)
async def restart_system(background_tasks: BackgroundTasks):
    """Restart toàn bộ hệ thống"""
    try:
        # Schedule restart in background
        background_tasks.add_task(restart_system_background)
        
        return SystemResponse(
            status="success",
            message="System restart initiated",
            data={"restarting": True}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error restarting system: {str(e)}")

@router.get("/api/cameras", response_model=SystemResponse)
async def get_camera_info():
    """Lấy thông tin camera"""
    try:
        camera_orchestrator = get_camera_orchestrator()
        if not camera_orchestrator:
            raise HTTPException(status_code=400, detail="Camera system not initialized")
        
        camera_info = {}
        for cam_name, cam_data in camera_orchestrator.shared_dict.items():
            camera_info[cam_name] = {
                "status": cam_data.get("status", "unknown"),
                "last_update": cam_data.get("ts", 0),
                "frame_age": time.time() - cam_data.get("ts", 0) if cam_data.get("ts") else None
            }
        
        return SystemResponse(
            status="success",
            message="Camera info retrieved",
            data={
                "cameras": camera_info,
                "total_cameras": len(camera_info)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting camera info: {str(e)}")

@router.get("/api/health", response_model=SystemResponse)
async def health_check():
    """Health check endpoint"""
    try:
        system_status = get_system_status()
        
        health_status = {
            "camera_system": system_status["camera_system"]["running"],
            "roi_processor": system_status["roi_processor"]["running"],
            "stable_pair_processor": system_status["stable_pair_processor"]["running"],
            "post_api": system_status["post_api"]["running"],
            "timestamp": time.time()
        }
        
        all_healthy = all([
            system_status["camera_system"]["running"],
            system_status["roi_processor"]["running"],
            system_status["stable_pair_processor"]["running"],
            system_status["post_api"]["running"]
        ])
        
        return SystemResponse(
            status="success" if all_healthy else "warning",
            message="Health check completed",
            data=health_status
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/api/roi/status", response_model=SystemResponse)
async def get_roi_status():
    """Lấy trạng thái ROI processor"""
    try:
        roi_processor = get_roi_processor()
        system_status = get_system_status()
        
        roi_status = {
            "running": system_status["roi_processor"]["running"],
            "initialized": roi_processor is not None
        }
        
        return SystemResponse(
            status="success",
            message="ROI status retrieved",
            data=roi_status
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting ROI status: {str(e)}")

@router.get("/api/stable-pair/status", response_model=SystemResponse)
async def get_stable_pair_status():
    """Lấy trạng thái Stable Pair processor"""
    try:
        stable_pair_processor = get_stable_pair_processor()
        system_status = get_system_status()
        
        stable_status = {
            "running": system_status["stable_pair_processor"]["running"],
            "initialized": stable_pair_processor is not None
        }
        
        return SystemResponse(
            status="success",
            message="Stable Pair status retrieved",
            data=stable_status
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting Stable Pair status: {str(e)}")

@router.get("/api/post-api/status", response_model=SystemResponse)
async def get_post_api_status():
    """Lấy trạng thái Post API"""
    try:
        system_status = get_system_status()
        
        post_api_status = {
            "running": system_status["post_api"]["running"]
        }
        
        return SystemResponse(
            status="success",
            message="Post API status retrieved",
            data=post_api_status
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting Post API status: {str(e)}")
