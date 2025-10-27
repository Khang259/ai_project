# AI Camera Control System - FastAPI Section

## 📁 Cấu Trúc Folder

```
📦 FastAPI_section/
├── 📄 __init__.py           # Package initialization
├── 📄 main.py              # FastAPI app chính
├── 📄 models.py            # Pydantic models
├── 📄 system_manager.py    # System management functions
└── 📄 api_routes.py        # API endpoints
```

## 🚀 Cách Chạy

### **Option 1: Chạy từ Root**
```bash
# Từ thư mục root của project
python main.py
```

### **Option 2: Chạy trực tiếp từ FastAPI_section**
```bash
# Từ thư mục FastAPI_section
python main.py
```

### **Option 3: Chạy với uvicorn**
```bash
# Từ thư mục root
uvicorn FastAPI_section.main:app --host 0.0.0.0 --port 8000
```

## 🌐 API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/` | GET | System info |
| `/api/status` | GET | Trạng thái hệ thống |
| `/api/ai/toggle` | POST | Bật/tắt AI |
| `/api/ai/status` | GET | Trạng thái AI |
| `/api/cameras` | GET | Thông tin camera |
| `/api/system/restart` | POST | Restart hệ thống |
| `/api/health` | GET | Health check |
| `/api/roi/status` | GET | ROI processor status |
| `/api/stable-pair/status` | GET | Stable pair status |
| `/api/post-api/status` | GET | Post API status |
| `/docs` | GET | API documentation |

## 📋 Dependencies

Đảm bảo đã cài đặt các dependencies trong `requirements.txt`:

```bash
pip install -r requirements.txt
```

## 🔧 Ví Dụ Sử Dụng API

```bash
# Xem trạng thái hệ thống
curl http://localhost:8000/api/status

# Tắt AI
curl -X POST http://localhost:8000/api/ai/toggle \
  -H "Content-Type: application/json" \
  -d '{"enable": false}'

# Bật AI
curl -X POST http://localhost:8000/api/ai/toggle \
  -H "Content-Type: application/json" \
  -d '{"enable": true}'

# Health check
curl http://localhost:8000/api/health
```

## 📖 API Documentation

Truy cập Swagger UI tại: `http://localhost:8000/docs`

## 🏗️ Architecture

- **`main.py`**: FastAPI app setup và lifespan management
- **`models.py`**: Pydantic models cho request/response
- **`system_manager.py`**: Quản lý lifecycle của các system components
- **`api_routes.py`**: Tất cả API endpoints
- **`__init__.py`**: Package exports và initialization
