#!/usr/bin/env python3
"""
Script để chạy FastAPI Server
Chạy server tại: http://192.168.1.110:7000
"""

import os
import sys
import uvicorn

# Thêm thư mục hiện tại vào Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("="*60)
    print("KHỞI ĐỘNG FASTAPI SERVER")
    print("="*60)
    print("Server sẽ chạy tại: http://localhost:7000")
    print("Endpoint chính: http://localhost:7000/ics/taskOrder/addTask")
    print("Health check: http://localhost:7000/health")
    print("Raw endpoint: http://localhost:7000/ics/taskOrder/addTask/raw")
    print("="*60)
    
    try:
        uvicorn.run(
            "fastapi_server:app",
            host="0.0.0.0",
            port=7000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\nServer đã dừng bởi người dùng.")
    except Exception as e:
        print(f"Lỗi khởi động server: {e}")
        sys.exit(1)
