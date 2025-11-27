"""
API Gateway - Single entry point for all services
Routes requests to appropriate microservices
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import sys
import os
from contextlib import asynccontextmanager

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.logging import setup_logger

logger = setup_logger("gateway", "INFO", "gateway")

# Service URLs
SERVICES = {
    "app": "http://localhost:8001",      # Auth & User Management
    #"ai": "http://localhost:8002",        # AI Processing
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting API Gateway...")
    yield
    # Shutdown
    logger.info("Shutting down API Gateway...")
    await client.aclose()
    logger.info("HTTP client closed")

# Create FastAPI Gateway
gateway = FastAPI(
    title="Camera AI Gateway",
    description="API Gateway for Camera AI Microservices",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
gateway.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP Client for forwarding requests
client = httpx.AsyncClient(timeout=30.0)

async def forward_request(
    request: Request,
    service_name: str,
    path: str
):
    """Forward request to target service"""
    try:
        service_url = SERVICES.get(service_name)
        if not service_url:
            raise HTTPException(status_code=404, detail=f"Service {service_name} not found")
        
        # Build target URL
        url = f"{service_url}{path}"
        
        # Get request body
        body = await request.body()
        
        # Forward headers (exclude host)
        headers = dict(request.headers)
        headers.pop("host", None)
        
        # Forward request
        response = await client.request(
            method=request.method,
            url=url,
            content=body,
            headers=headers,
            params=request.query_params
        )
        
        return JSONResponse(
            content=response.json() if response.text else {},
            status_code=response.status_code
        )
    
    except httpx.RequestError as e:
        logger.error(f"Error forwarding to {service_name}: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service {service_name} unavailable")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal gateway error")

# ============= ROUTES =============

@gateway.get("/")
async def root():
    return {
        "message": "Camera AI API Gateway",
        "version": "1.0.0",
        "services": list(SERVICES.keys())
    }

@gateway.get("/health")
async def health_check():
    """Check health of all services"""
    health_status = {"gateway": "healthy", "services": {}}
    
    for service_name, service_url in SERVICES.items():
        try:
            response = await client.get(f"{service_url}/health", timeout=5.0)
            health_status["services"][service_name] = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            health_status["services"][service_name] = "unreachable"
    
    return health_status

# ============= SERVICE ROUTES (SIMPLIFIED) =============

@gateway.api_route("/api/app/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def app_service(request: Request, path: str):
    """
    Route ALL /api/app/* requests to App Service
    App service handles internal routing (auth, users, permissions, etc.)
    """
    logger.info(f"Routing to app service: /{path}")
    return await forward_request(request, "app", f"/{path}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:gateway",
        host="0.0.0.0",
        port=9000,
        reload=True
    )