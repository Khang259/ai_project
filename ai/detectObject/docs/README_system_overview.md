# Tài liệu Tổng quan Hệ thống Camera và AI Inference

## Tổng quan
Hệ thống camera và AI inference được thiết kế để xử lý video stream từ nhiều camera đồng thời, thực hiện object detection bằng YOLO model và cung cấp kết quả real-time.

## Kiến trúc Hệ thống

### 1. Kiến trúc Tổng thể
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Camera 1      │    │   Camera 2      │    │   Camera N      │
│   (RTSP/IP)     │    │   (RTSP/IP)     │    │   (RTSP/IP)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    Camera Process Pool    │
                    │  ┌─────────────────────┐  │
                    │  │  Process 1          │  │
                    │  │  ┌───────────────┐  │  │
                    │  │  │ CameraThread  │  │  │
                    │  │  │ CameraThread  │  │  │
                    │  │  └───────────────┘  │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │  Process 2          │  │
                    │  │  ┌───────────────┐  │  │
                    │  │  │ CameraThread  │  │  │
                    │  │  │ CameraThread  │  │  │
                    │  │  └───────────────┘  │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Shared Dict          │
                    │  (Multiprocessing)        │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    AI Inference Process   │
                    │  ┌─────────────────────┐  │
                    │  │  YOLO Model         │  │
                    │  │  Object Detection   │  │
                    │  │  JSON Output        │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Result Dict          │
                    │  (Detection Results)      │
                    └───────────────────────────┘
```

### 2. Luồng Dữ liệu
```
Camera → CameraThread → Local Dict → Shared Dict → AI Inference → Result Dict
```

## Các Module Chính

### 1. camera_thread.py
**Chức năng:** Quản lý kết nối và đọc dữ liệu từ một camera

**Tính năng chính:**
- Kết nối camera với timeout và retry logic
- Đọc frame liên tục trong thread riêng biệt
- Xử lý lỗi và tự động kết nối lại
- Resize và encode frame để tối ưu băng thông
- Exponential backoff cho retry

**Tham số quan trọng:**
- `max_retry_attempts`: Số lần retry tối đa (mặc định: 5)
- `timeout`: Thời gian timeout kết nối (mặc định: 5s)
- `frame_size`: Kích thước frame resize (640x360)
- `jpeg_quality`: Chất lượng JPEG (85)

### 2. camera_process.py
**Chức năng:** Quản lý nhiều camera trong một process

**Tính năng chính:**
- Tạo và quản lý camera threads
- Cập nhật dữ liệu từ local dict lên shared dict
- Xử lý dừng process graceful
- Phân phối camera giữa các process

**Tham số quan trọng:**
- `process_id`: ID định danh process
- `camera_list`: Danh sách camera [(name, url), ...]
- `shared_dict`: Dictionary chia sẻ giữa processes
- `max_retry_attempts`: Số lần retry cho mỗi camera

### 3. ai_inference.py
**Chức năng:** Xử lý AI inference với YOLO model

**Tính năng chính:**
- Load và sử dụng YOLO model
- Detect objects trong frame
- Vẽ bounding box và label
- Format kết quả thành JSON
- Xử lý nhiều camera đồng thời

**Tham số quan trọng:**
- `model_path`: Đường dẫn model YOLO (.pt)
- `cam_names`: Danh sách camera cần xử lý
- `shared_dict`: Dictionary chứa frame từ camera
- `result_dict`: Dictionary lưu kết quả detection

## Cấu trúc Dữ liệu

### 1. Frame Data (Local Dict)
```python
{
    "camera_name": {
        "frame": bytes,        # JPEG encoded frame
        "ts": float,          # Timestamp
        "status": str         # 'ok', 'retrying', 'connection_failed'
    }
}
```

### 2. Detection Results (Result Dict)
```python
{
    "camera_name": {
        "frame": None,        # Không cần frame
        "ts": float,         # Timestamp
        "status": str,       # 'ok', 'inference_error', 'no_signal'
        "inference_time": float,
        "detections": int,   # Số lượng objects detected
        "objects": list      # Chi tiết detection
    }
}
```

### 3. JSON Output Format
```json
{
    "camera_id": "camera_1",
    "frame_id": 12345,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "frame_shape": {
        "height": 720,
        "width": 1280,
        "channels": 3
    },
    "detections": [
        {
            "class_id": 0,
            "class_name": "person",
            "confidence": 0.95,
            "bbox": {
                "x1": 100.0,
                "y1": 200.0,
                "x2": 300.0,
                "y2": 500.0
            },
            "center": {
                "x": 200.0,
                "y": 350.0
            }
        }
    ],
    "detection_count": 1
}
```

## Performance và Tối ưu

### 1. Camera Processing
- **Frame size:** 640x360 (resize từ camera gốc)
- **JPEG quality:** 85% (cân bằng chất lượng/kích thước)
- **Update rate:** 10 FPS (mỗi 100ms)
- **Retry logic:** Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s)

### 2. AI Inference
- **Input size:** 1280x720 (resize từ 640x360)
- **Processing rate:** ~20 FPS
- **Model:** YOLO (có thể thay đổi)
- **Output:** JSON format với bounding box và confidence

### 3. Memory Usage
- **Frame storage:** JPEG encoded để tiết kiệm memory
- **Shared dict:** Chia sẻ giữa processes
- **Local dict:** Chỉ lưu dữ liệu camera trong process

## Cấu hình Hệ thống

### 1. Camera Configuration
```python
camera_config = [
    {
        "name": "camera_1",
        "url": "rtsp://192.168.1.100:554/stream",
        "max_retry": 5,
        "timeout": 5.0
    },
    {
        "name": "camera_2", 
        "url": "rtsp://192.168.1.101:554/stream",
        "max_retry": 5,
        "timeout": 5.0
    }
]
```

### 2. AI Model Configuration
```python
ai_config = {
    "model_path": "weights/model_vl_0205.pt",
    "input_size": (1280, 720),
    "confidence_threshold": 0.5,
    "nms_threshold": 0.4
}
```

### 3. Process Configuration
```python
process_config = {
    "num_processes": 2,
    "cameras_per_process": 2,
    "update_interval": 0.1,
    "inference_interval": 0.05
}
```

## Sử dụng

### 1. Khởi tạo Hệ thống
```python
from multiprocessing import Process, Manager
from camera_process import camera_process_worker
from ai_inference import ai_inference_worker

# Tạo shared dict
manager = Manager()
shared_dict = manager.dict()
result_dict = manager.dict()

# Tạo camera processes
camera_processes = []
for i, camera_group in enumerate(camera_groups):
    process = Process(
        target=camera_process_worker,
        args=(i, camera_group, shared_dict, 5)
    )
    camera_processes.append(process)
    process.start()

# Tạo AI inference process
ai_process = Process(
    target=ai_inference_worker,
    args=(shared_dict, result_dict, None, "weights/model_vl_0205.pt")
)
ai_process.start()
```

### 2. Xử lý Kết quả
```python
# Đọc kết quả detection
for cam_name in result_dict:
    data = result_dict[cam_name]
    if data['status'] == 'ok':
        print(f"Camera {cam_name}: {data['detections']} objects detected")
        for obj in data['objects']:
            print(f"  - {obj['class_name']}: {obj['confidence']:.2f}")
```

### 3. Dừng Hệ thống
```python
# Dừng tất cả processes
for process in camera_processes:
    process.terminate()
    process.join()

ai_process.terminate()
ai_process.join()
```

## Xử lý Lỗi

### 1. Camera Connection Errors
- **Timeout:** Tự động retry với exponential backoff
- **Connection failed:** Dừng retry sau max_retry_attempts
- **No signal:** Tiếp tục thử kết nối

### 2. AI Inference Errors
- **Model load error:** Dừng AI process
- **Inference error:** Log lỗi và tiếp tục
- **Frame decode error:** Bỏ qua frame lỗi

### 3. Process Errors
- **Camera process crash:** Restart process
- **AI process crash:** Restart với model mới
- **Memory error:** Giảm số camera per process

## Monitoring và Debug

### 1. Log Messages
- **Camera connection:** ✅ Thành công, ❌ Thất bại, ⚠️ Mất tín hiệu
- **AI inference:** Detection count, inference time
- **Process status:** Start, stop, error

### 2. Status Monitoring
```python
# Kiểm tra trạng thái camera
for cam_name in shared_dict:
    data = shared_dict[cam_name]
    print(f"Camera {cam_name}: {data['status']}")

# Kiểm tra kết quả AI
for cam_name in result_dict:
    data = result_dict[cam_name]
    print(f"AI {cam_name}: {data['detections']} objects")
```

### 3. Performance Metrics
- **FPS:** Số frame xử lý mỗi giây
- **Latency:** Thời gian từ camera đến AI result
- **Memory usage:** Sử dụng memory của mỗi process
- **CPU usage:** Tải CPU của camera và AI processes

## Dependencies
- **OpenCV:** Xử lý camera và ảnh
- **Ultralytics:** YOLO model
- **NumPy:** Xử lý array
- **Multiprocessing:** Quản lý processes
- **Threading:** Quản lý camera threads
- **JSON:** Serialization
- **DateTime:** Timestamp

## Lưu ý Quan trọng
1. **Thread Safety:** Sử dụng multiprocessing.Manager() để chia sẻ dữ liệu
2. **Memory Management:** JPEG encoding để tiết kiệm memory
3. **Error Handling:** Robust retry logic và error recovery
4. **Performance:** Tối ưu cho real-time processing
5. **Scalability:** Có thể mở rộng số lượng camera và processes
