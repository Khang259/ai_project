# system_manager.py - System management functions

import asyncio
import threading
import time
import os
import sys
from typing import Optional

# Import các modules
parent_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.append(os.path.join(parent_dir, 'detectObject'))
sys.path.append(os.path.join(parent_dir, 'logic'))
sys.path.append(parent_dir)

from detectObject.main import CameraOrchestrator
from detectObject.fps_config import get_fps_config
from roi_processor import ROIProcessor
from logic.stable_pair_processor import StablePairProcessor
from postRq.postAPI import main as post_api_main

# Global instances
camera_orchestrator: Optional[CameraOrchestrator] = None
roi_processor: Optional[ROIProcessor] = None
stable_pair_processor: Optional[StablePairProcessor] = None
post_api_thread: Optional[threading.Thread] = None

# System status
system_status = {
    "camera_system": {"running": False, "ai_enabled": False},
    "roi_processor": {"running": False},
    "stable_pair_processor": {"running": False},
    "post_api": {"running": False}
}

async def startup_system():
    """Khởi động toàn bộ hệ thống"""
    global camera_orchestrator, roi_processor, stable_pair_processor, post_api_thread
    
    try:
        print("📷 Initializing Camera System...")
        
        # Camera URLs configuration
        camera_urls = [
            ("cam-1", "rtsp://192.168.1.202:8554/live/cam1"),
            ("cam-6", "rtsp://192.168.1.202:8554/live/cam6")
        ]
        
        # Get FPS config
        target_fps = get_fps_config(preset_name="low")
        
        # Initialize Camera Orchestrator
        camera_orchestrator = CameraOrchestrator(
            camera_urls=camera_urls,
            num_processes=5,
            max_retry_attempts=5,
            use_ai=True,  # Start with AI enabled
            model_path="../detectObject/weights/model-hanam_0506.pt",
            target_fps=target_fps
        )
        
        # Start camera system
        camera_orchestrator.start()
        system_status["camera_system"]["running"] = True
        system_status["camera_system"]["ai_enabled"] = True
        
        print("✅ Camera System started")
        
        # Initialize ROI Processor
        print("🎯 Initializing ROI Processor...")
        roi_processor = ROIProcessor(
            db_path="queues.db",
            show_video=True,  # Disable video display in API mode
            enable=1
        )
        
        # Start ROI processor in background thread
        roi_thread = threading.Thread(target=roi_processor.run, daemon=False)
        roi_thread.start()
        system_status["roi_processor"]["running"] = True
        
        print("✅ ROI Processor started")
        
        # Initialize Stable Pair Processor
        print("🔗 Initializing Stable Pair Processor...")
        stable_pair_processor = StablePairProcessor()
        
        # Start stable pair processor in background thread
        stable_thread = threading.Thread(target=stable_pair_processor.run, daemon=True)
        stable_thread.start()
        system_status["stable_pair_processor"]["running"] = True
        
        print("✅ Stable Pair Processor started")
        
        # Initialize Post API
        print("📡 Initializing Post API...")
        post_api_thread = threading.Thread(target=post_api_main, daemon=True)
        post_api_thread.start()
        system_status["post_api"]["running"] = True
        
        print("✅ Post API started")
        
        print("🎉 All systems started successfully!")
        
    except Exception as e:
        print(f"❌ Error starting system: {e}")
        raise

async def shutdown_system():
    """Dừng toàn bộ hệ thống"""
    global camera_orchestrator, roi_processor, stable_pair_processor, post_api_thread
    
    try:
        print("🛑 Stopping all systems...")
        
        # Stop camera orchestrator
        if camera_orchestrator:
            camera_orchestrator._stop()
            system_status["camera_system"]["running"] = False
        
        # Stop ROI processor
        if roi_processor:
            roi_processor.running = False
            system_status["roi_processor"]["running"] = False
        
        # Stop stable pair processor (no explicit stop method, will stop when main thread stops)
        system_status["stable_pair_processor"]["running"] = False
        
        # Post API will stop when main thread stops
        system_status["post_api"]["running"] = False
        
        print("✅ All systems stopped")
        
    except Exception as e:
        print(f"❌ Error stopping system: {e}")

async def restart_system_background():
    """Background task để restart hệ thống"""
    try:
        print("🔄 Restarting system...")
        
        # Stop current system
        await shutdown_system()
        
        # Wait a bit
        await asyncio.sleep(2)
        
        # Start system again
        await startup_system()
        
        print("✅ System restarted successfully")
        
    except Exception as e:
        print(f"❌ Error restarting system: {e}")

def get_camera_orchestrator():
    """Get camera orchestrator instance"""
    return camera_orchestrator

def get_roi_processor():
    """Get ROI processor instance"""
    return roi_processor

def get_stable_pair_processor():
    """Get stable pair processor instance"""
    return stable_pair_processor

def get_system_status():
    """Get system status"""
    return system_status

def update_ai_status(enabled: bool):
    """Update AI status"""
    system_status["camera_system"]["ai_enabled"] = enabled
