import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn


# Pydantic models cho request/response
class TaskOrderDetail(BaseModel):
    taskPath: str = Field(..., description="Đường dẫn task, ví dụ: 'QR001,QR002'")

class TaskOrderRequest(BaseModel):
    modelProcessCode: str = Field(..., description="Mã quy trình xử lý: 'lenhDon' hoặc 'lenhDooi'")
    fromSystem: str = Field(default="ICS", description="Hệ thống gửi request")
    orderId: str = Field(..., description="ID đơn hàng unique")
    taskOrderDetail: list[TaskOrderDetail] = Field(..., description="Danh sách chi tiết task")

class TaskOrderResponse(BaseModel):
    code: int = Field(default=1000, description="Mã trả về: 1000 = thành công")
    message: str = Field(default="Success", description="Thông báo trả về")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Dữ liệu trả về")


def setup_server_logger(log_dir: str = "../logs") -> logging.Logger:
    """Thiết lập logger cho FastAPI server"""
    # Tạo thư mục logs nếu chưa có
    os.makedirs(log_dir, exist_ok=True)
    
    # Tạo logger
    logger = logging.getLogger('fastapi_server')
    logger.setLevel(logging.INFO)
    
    # Tránh duplicate handlers
    if logger.handlers:
        return logger
    
    # Tạo formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler với rotating
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'fastapi_server.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Thêm handlers vào logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


# Khởi tạo FastAPI app
app = FastAPI(
    title="Task Order API Server",
    description="Server nhận POST request từ postAPI.py để xử lý task orders",
    version="1.0.0"
)

# Thiết lập logger
logger = setup_server_logger()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Task Order API Server đang chạy", "status": "healthy"}


@app.get("/health")
async def health_check():
    """Health check endpoint chi tiết"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Task Order API Server"
    }


@app.post("/ics/taskOrder/addTask", response_model=TaskOrderResponse)
async def add_task(request: TaskOrderRequest, http_request: Request):
    """
    Endpoint chính để nhận task order từ postAPI.py
    
    Args:
        request: TaskOrderRequest object chứa thông tin task
        http_request: FastAPI Request object để lấy thông tin client
    
    Returns:
        TaskOrderResponse: Response với code=1000 nếu thành công
    """
    # Lấy thông tin client
    client_ip = http_request.client.host if http_request.client else "unknown"
    user_agent = http_request.headers.get("user-agent", "unknown")
    
    # Log request details
    logger.info(f"POST_REQUEST_RECEIVED: orderId={request.orderId}, "
                f"modelProcessCode={request.modelProcessCode}, "
                f"taskCount={len(request.taskOrderDetail)}, "
                f"client_ip={client_ip}")
    
    # Log chi tiết task paths
    task_paths = [task.taskPath for task in request.taskOrderDetail]
    logger.info(f"TASK_PATHS: {task_paths}")
    
    # In ra console để debug
    print(f"\n{'='*60}")
    print(f"NHẬN POST REQUEST TỪ postAPI.py")
    print(f"{'='*60}")
    print(f"OrderID: {request.orderId}")
    print(f"ModelProcessCode: {request.modelProcessCode}")
    print(f"FromSystem: {request.fromSystem}")
    print(f"TaskCount: {len(request.taskOrderDetail)}")
    print(f"TaskPaths: {task_paths}")
    print(f"Client IP: {client_ip}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")
    
    try:
        # Xử lý logic business ở đây
        # Ví dụ: validate task paths, lưu vào database, etc.
        
        # Simulate processing time
        import time
        time.sleep(0.1)  # 100ms processing time
        
        # Log success
        logger.info(f"POST_REQUEST_PROCESSED_SUCCESS: orderId={request.orderId}, "
                   f"taskCount={len(request.taskOrderDetail)}")
        
        # Trả về response thành công
        response = TaskOrderResponse(
            code=1000,
            message="Task order đã được xử lý thành công",
            data={
                "orderId": request.orderId,
                "processedAt": datetime.now().isoformat(),
                "taskCount": len(request.taskOrderDetail),
                "taskPaths": task_paths
            }
        )
        
        print(f"✓ TRẢ VỀ RESPONSE THÀNH CÔNG: code=1000, orderId={request.orderId}")
        
        return response
        
    except Exception as e:
        # Log error
        error_msg = f"POST_REQUEST_PROCESSING_ERROR: orderId={request.orderId}, error={str(e)}"
        logger.error(error_msg)
        
        print(f"✗ LỖI XỬ LÝ REQUEST: {str(e)}")
        
        # Trả về error response
        raise HTTPException(
            status_code=500,
            detail={
                "code": 5000,
                "message": f"Lỗi xử lý request: {str(e)}",
                "orderId": request.orderId
            }
        )


@app.post("/ics/taskOrder/addTask/raw")
async def add_task_raw(request: Request):
    """
    Endpoint để nhận raw JSON request (backup endpoint)
    """
    try:
        # Đọc raw body
        body = await request.body()
        body_str = body.decode('utf-8')
        
        # Parse JSON
        data = json.loads(body_str)
        
        # Log raw request
        logger.info(f"RAW_POST_REQUEST: {body_str}")
        
        print(f"\n{'='*60}")
        print(f"NHẬN RAW POST REQUEST")
        print(f"{'='*60}")
        print(f"Raw Body: {body_str}")
        print(f"{'='*60}\n")
        
        # Trả về response
        return {
            "code": 1000,
            "message": "Raw request đã được nhận thành công",
            "data": data
        }
        
    except Exception as e:
        logger.error(f"RAW_POST_REQUEST_ERROR: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Lỗi parse JSON: {str(e)}")


if __name__ == "__main__":
    print("Khởi động FastAPI Server...")
    print("Server sẽ chạy tại: http://localhost:7000")
    print("Endpoint chính: http://localhost:7000/ics/taskOrder/addTask")
    print("Health check: http://localhost:7000/health")
    print("Raw endpoint: http://localhost:7000/ics/taskOrder/addTask/raw")
    
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=7000,
        reload=True,
        log_level="info"
    )
