# main.py - Root file với FastAPI

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import các modules mới
from system_manager import startup_system, shutdown_system
from api_routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan events"""
    print("🚀 Starting AI Camera System...")
    
    # Startup
    await startup_system()
    
    yield
    
    # Shutdown
    print("🛑 Shutting down AI Camera System...")
    await shutdown_system()

# Create FastAPI app
app = FastAPI(
    title="AI Camera Control System",
    description="API để điều khiển hệ thống camera AI và ROI processing",
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

# Include API routes
app.include_router(router)

# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    """Main function để chạy FastAPI server"""
    print("=" * 60)
    print("🤖 AI CAMERA CONTROL SYSTEM")
    print("=" * 60)
    print("📡 Starting FastAPI server...")
    print("🌐 API Documentation: http://localhost:9001/docs")
    print("🔗 API Base URL: http://localhost:9001")
    print("=" * 60)
    
    # Run FastAPI server
    uvicorn.run(
        "FastAPI_section.main:app",
        host="0.0.0.0",
        port=9001,
        reload=False,  # Set True for development
        log_level="info"
    )

if __name__ == "__main__":
    main()