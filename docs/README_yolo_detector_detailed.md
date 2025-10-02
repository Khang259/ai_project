# YOLO Detector - Tài liệu chi tiết

## Tổng quan

`yolo_detector.py` là module thực hiện object detection sử dụng YOLO model. Module này hỗ trợ cả single camera và multi-camera detection, với khả năng lưu kết quả detection vào queue để xử lý tiếp.

## Chức năng chính

1. **Object Detection**: Sử dụng YOLO model để detect objects trong video stream
2. **Multi-camera Support**: Hỗ trợ chạy detection đồng thời trên nhiều camera
3. **Real-time Processing**: Xử lý real-time với threading
4. **Queue Integration**: Lưu kết quả detection vào SQLite queue
5. **Video Display**: Hiển thị video với bounding box và labels
6. **Configurable**: Có thể cấu hình model, confidence threshold, camera sources

## Cấu trúc Classes

### 1. YOLODetector

#### Constructor Parameters

```python
def __init__(self, model_path: str, camera_id: str, confidence_threshold: float = 0.5)
```

**Tham số:**
- `model_path` (str): Đường dẫn đến file model YOLO (.pt)
- `camera_id` (str): ID định danh của camera
- `confidence_threshold` (float): Ngưỡng tin cậy cho detection (0.0-1.0, mặc định: 0.5)

#### Thuộc tính chính

| Thuộc tính | Kiểu dữ liệu | Mô tả |
|------------|--------------|-------|
| `camera_id` | str | ID của camera |
| `confidence_threshold` | float | Ngưỡng tin cậy cho detection |
| `queue` | SQLiteQueue | Kết nối database để lưu kết quả |
| `running` | bool | Flag trạng thái chạy detection |
| `model` | YOLO | YOLO model đã load |
| `colors` | List[tuple] | Danh sách màu sắc cho các class |

### 2. MultiCameraDetector

#### Constructor Parameters

```python
def __init__(self, model_path: str, confidence_threshold: float = 0.5)
```

**Tham số:**
- `model_path` (str): Đường dẫn đến file model YOLO (.pt)
- `confidence_threshold` (float): Ngưỡng tin cậy cho detection (mặc định: 0.5)

#### Thuộc tính chính

| Thuộc tính | Kiểu dữ liệu | Mô tả |
|------------|--------------|-------|
| `model_path` | str | Đường dẫn model YOLO |
| `confidence_threshold` | float | Ngưỡng tin cậy |
| `detectors` | Dict[str, YOLODetector] | Dictionary các detector theo camera_id |
| `threads` | Dict[str, Thread] | Dictionary các thread theo camera_id |
| `running` | bool | Flag trạng thái chạy |

## Các phương thức chính

### YOLODetector Methods

#### 1. Khởi tạo và cấu hình

#### `_generate_colors(num_classes)`
```python
def _generate_colors(self, num_classes: int) -> List[tuple]
```
**Chức năng:** Tạo màu sắc ngẫu nhiên cho các class
**Input:**
- `num_classes` (int): Số lượng class trong model
**Output:**
- `List[tuple]`: Danh sách màu sắc (BGR format)

#### 2. Xử lý Detection

#### `draw_detections(frame, results)`
```python
def draw_detections(self, frame: np.ndarray, results) -> np.ndarray
```
**Chức năng:** Vẽ bounding box và label lên frame
**Input:**
- `frame` (np.ndarray): Frame gốc
- `results`: Kết quả detection từ YOLO model
**Output:**
- `np.ndarray`: Frame đã được vẽ detection

**Các bước xử lý:**
1. Lặp qua tất cả boxes trong results
2. Lấy thông tin: tọa độ, confidence, class_id, class_name
3. Chỉ vẽ nếu confidence >= threshold
4. Vẽ bounding box với màu tương ứng
5. Vẽ label với background

#### `process_detection_results(results)`
```python
def process_detection_results(self, results) -> List[Dict[str, Any]]
```
**Chức năng:** Xử lý kết quả detection thành format chuẩn
**Input:**
- `results`: Kết quả detection từ YOLO model
**Output:**
- `List[Dict]`: Danh sách detections đã được xử lý

**Format mỗi detection:**
```json
{
    "class_id": 0,
    "class_name": "shelf",
    "confidence": 0.85,
    "bbox": {
        "x1": 100.0,
        "y1": 150.0,
        "x2": 200.0,
        "y2": 250.0
    },
    "center": {
        "x": 150.0,
        "y": 200.0
    }
}
```

#### 3. Lưu trữ dữ liệu

#### `save_to_queue(detections, frame_shape, frame_id)`
```python
def save_to_queue(self, detections: List[Dict[str, Any]], frame_shape: tuple, frame_id: int) -> None
```
**Chức năng:** Lưu kết quả detection vào raw_detection queue
**Input:**
- `detections` (List[Dict]): Danh sách detections đã xử lý
- `frame_shape` (tuple): Kích thước frame (height, width, channels)
- `frame_id` (int): ID của frame hiện tại
**Output:** Không (lưu vào queue)

**Format payload lưu vào queue:**
```json
{
    "camera_id": "cam-1",
    "frame_id": 150,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "frame_shape": {
        "height": 480,
        "width": 640,
        "channels": 3
    },
    "detections": [...],
    "detection_count": 5
}
```

#### 4. Chạy Detection

#### `run_video_detection(video_source)`
```python
def run_video_detection(self, video_source: str = 0) -> None
```
**Chức năng:** Chạy detection trên video stream
**Input:**
- `video_source` (str/int): Nguồn video (0 cho webcam, đường dẫn file, hoặc RTSP URL)
**Output:** Không (chạy detection loop)

**Các bước xử lý:**
1. Mở video source
2. Loop đọc frame
3. Chạy YOLO detection
4. Vẽ kết quả lên frame
5. Xử lý kết quả thành format chuẩn
6. Lưu vào queue (mỗi 5 frame)
7. Hiển thị frame với thông tin
8. Xử lý phím bấm (q: thoát, s: lưu ảnh)

**Controls:**
- `q`: Thoát detection
- `s`: Lưu ảnh hiện tại

#### `stop()`
```python
def stop(self) -> None
```
**Chức năng:** Dừng detection
**Input:** Không
**Output:** Không (set running = False)

### MultiCameraDetector Methods

#### 1. Quản lý Camera

#### `add_camera(camera_id, video_source)`
```python
def add_camera(self, camera_id: str, video_source: str) -> None
```
**Chức năng:** Thêm camera vào hệ thống
**Input:**
- `camera_id` (str): ID của camera
- `video_source` (str): Nguồn video cho camera
**Output:** Không (tạo YOLODetector mới)

#### `start_detection(camera_id, video_source)`
```python
def start_detection(self, camera_id: str, video_source: str) -> None
```
**Chức năng:** Bắt đầu detection cho một camera trong thread riêng
**Input:**
- `camera_id` (str): ID của camera
- `video_source` (str): Nguồn video cho camera
**Output:** Không (tạo và start thread)

#### `start_all_detections(camera_configs)`
```python
def start_all_detections(self, camera_configs: Dict[str, str]) -> None
```
**Chức năng:** Bắt đầu detection cho tất cả camera
**Input:**
- `camera_configs` (Dict[str, str]): Dictionary với key là camera_id và value là video_source
**Output:** Không (start tất cả camera)

**Ví dụ camera_configs:**
```python
camera_configs = {
    "cam-1": "video/hanam.mp4",
    "cam-2": "video/vinhPhuc.mp4",
    "cam-3": 0  # Webcam
}
```

#### 2. Quản lý trạng thái

#### `stop_camera(camera_id)`
```python
def stop_camera(self, camera_id: str) -> None
```
**Chức năng:** Dừng detection cho một camera
**Input:**
- `camera_id` (str): ID của camera cần dừng
**Output:** Không (dừng detector và thread)

#### `stop_all()`
```python
def stop_all(self) -> None
```
**Chức năng:** Dừng tất cả camera
**Input:** Không
**Output:** Không (dừng tất cả detector và threads)

## Command Line Interface

### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--model` | str | "model/model-hanam_0506.pt" | Đường dẫn đến file model YOLO |
| `--camera-id` | str | "cam-1" | ID của camera (chỉ dùng với --single-camera) |
| `--video-source` | str | "video/hanam.mp4" | Nguồn video (chỉ dùng với --single-camera) |
| `--confidence` | float | 0.5 | Ngưỡng tin cậy cho detection (0.0-1.0) |
| `--single-camera` | flag | False | Chạy detection cho một camera duy nhất |
| `--multi-camera` | flag | True | Chạy detection cho nhiều camera đồng thời |

### Usage Examples

#### Single Camera Mode
```bash
# Chạy với camera mặc định
python yolo_detector.py --single-camera

# Chạy với camera và video source tùy chỉnh
python yolo_detector.py --single-camera --camera-id "cam-1" --video-source "video/test.mp4"

# Chạy với model và confidence tùy chỉnh
python yolo_detector.py --single-camera --model "model/custom.pt" --confidence 0.7
```

#### Multi Camera Mode
```bash
# Chạy multi-camera (mặc định)
python yolo_detector.py

# Chạy với model tùy chỉnh
python yolo_detector.py --model "model/custom.pt" --confidence 0.6
```

## Output Data Format

### Raw Detection Queue

**Topic:** `raw_detection`
**Key:** `camera_id`

```json
{
    "camera_id": "cam-1",
    "frame_id": 150,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "frame_shape": {
        "height": 480,
        "width": 640,
        "channels": 3
    },
    "detections": [
        {
            "class_id": 0,
            "class_name": "shelf",
            "confidence": 0.85,
            "bbox": {
                "x1": 100.0,
                "y1": 150.0,
                "x2": 200.0,
                "y2": 250.0
            },
            "center": {
                "x": 150.0,
                "y": 200.0
            }
        }
    ],
    "detection_count": 1
}
```

## Performance và Tối ưu hóa

### Threading Model
- **Single Camera**: Chạy trong main thread
- **Multi Camera**: Mỗi camera chạy trong thread riêng
- **Queue Operations**: Thread-safe với SQLiteQueue

### Memory Management
- **Model Loading**: Load model một lần và tái sử dụng
- **Frame Processing**: Xử lý frame theo batch
- **Queue Storage**: Lưu trữ hiệu quả với SQLite

### Performance Tips
1. **Giảm confidence threshold** để tăng tốc độ (ít detection hơn)
2. **Sử dụng GPU** nếu có (YOLO tự động detect)
3. **Giảm resolution** video nếu không cần độ phân giải cao
4. **Tăng interval lưu queue** (hiện tại mỗi 5 frame)

## Error Handling

### Common Errors

#### 1. Model Loading Error
```
RuntimeError: Model file not found
```
**Giải pháp:** Kiểm tra đường dẫn model file

#### 2. Video Source Error
```
RuntimeError: Cannot open video source
```
**Giải pháp:** Kiểm tra video file tồn tại hoặc camera kết nối

#### 3. CUDA/GPU Error
```
CUDA out of memory
```
**Giải pháp:** Giảm batch size hoặc sử dụng CPU

### Exception Handling
- Tất cả methods đều có try-catch
- Graceful shutdown khi KeyboardInterrupt
- Log lỗi chi tiết cho debugging

## Dependencies

```python
import argparse
import cv2
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
import torch
import threading
import time
from ultralytics import YOLO
from queue_store import SQLiteQueue
```

### Required Packages
```
opencv-python>=4.5.0
numpy>=1.19.0
torch>=1.9.0
ultralytics>=8.0.0
```

## Configuration

### Model Requirements
- **Format**: .pt (PyTorch model)
- **Architecture**: YOLOv8, YOLOv11, hoặc tương thích
- **Classes**: Phải có class "shelf" nếu sử dụng với ROI processor

### Video Sources Supported
- **Files**: .mp4, .avi, .mov, .mkv
- **Webcam**: 0, 1, 2... (device index)
- **RTSP**: rtsp://username:password@ip:port/stream
- **HTTP**: http://ip:port/video

### Default Camera Configuration
```python
camera_configs = {
    "cam-1": "video/hanam.mp4",
    "cam-2": "video/vinhPhuc.mp4"
}
```

## Integration với ROI Processor

### Data Flow
1. **YOLO Detector** → `raw_detection` queue
2. **ROI Processor** ← `raw_detection` queue
3. **ROI Processor** → `roi_detection` queue

### Required Classes
- Model phải detect được class "shelf"
- Confidence threshold nên >= 0.5
- Bounding box format phải tương thích

## Monitoring và Debugging

### Console Output
- Model loading status
- Camera connection status
- Detection counts per frame
- Error messages và warnings

### Visual Feedback
- Real-time video display
- Bounding box với colors
- Confidence scores
- Frame information overlay

### File Output
- Screenshot khi nhấn 's'
- Log files (nếu có logging config)

## Version History

- **v1.0**: Single camera detection
- **v1.1**: Multi-camera support
- **v1.2**: Queue integration
- **v1.3**: Performance optimization
- **v1.4**: Error handling improvements

## Troubleshooting

### Performance Issues
1. **Low FPS**: Giảm confidence threshold, giảm resolution
2. **High Memory**: Giảm batch size, tăng interval lưu queue
3. **GPU Issues**: Fallback về CPU mode

### Detection Issues
1. **No detections**: Kiểm tra confidence threshold
2. **Wrong classes**: Kiểm tra model training
3. **Poor accuracy**: Fine-tune model hoặc adjust threshold

### Integration Issues
1. **Queue errors**: Kiểm tra database connection
2. **Format mismatch**: Kiểm tra data format compatibility
3. **Thread issues**: Kiểm tra thread safety
