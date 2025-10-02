# ROI Processor - Tài liệu chi tiết

## Tổng quan

`roi_processor.py` là module xử lý ROI (Region of Interest) filtering cho hệ thống detection. Module này nhận dữ liệu detection từ YOLO, áp dụng bộ lọc ROI, và có khả năng block các ROI cụ thể dựa trên cặp stable pairs.

## Chức năng chính

1. **ROI Filtering**: Lọc detections theo các vùng ROI đã định nghĩa
2. **Block Management**: Block các ROI dựa trên stable pairs (start_qr)
3. **Multi-camera Support**: Hỗ trợ xử lý đồng thời nhiều camera
4. **Real-time Processing**: Xử lý real-time với threading
5. **Video Display**: Hiển thị video với ROI và detections được highlight

## Cấu trúc Class

### ROIProcessor

#### Constructor Parameters

```python
def __init__(self, db_path: str = "queues.db", show_video: bool = True)
```

**Tham số:**
- `db_path` (str): Đường dẫn đến database SQLite (mặc định: "queues.db")
- `show_video` (bool): Có hiển thị video real-time hay không (mặc định: True)

#### Thuộc tính chính

| Thuộc tính | Kiểu dữ liệu | Mô tả |
|------------|--------------|-------|
| `queue` | SQLiteQueue | Kết nối database |
| `roi_cache` | Dict[str, List[Dict]] | Cache ROI theo camera_id |
| `cache_lock` | threading.Lock | Lock để thread-safe |
| `running` | bool | Flag trạng thái chạy |
| `show_video` | bool | Có hiển thị video không |
| `video_captures` | Dict[str, cv2.VideoCapture] | Video capture cho mỗi camera |
| `frame_cache` | Dict[str, np.ndarray] | Cache frame cho mỗi camera |
| `latest_detections` | Dict[str, Dict] | Detection data mới nhất |
| `latest_roi_detections` | Dict[str, Dict] | ROI detection data mới nhất |
| `blocked_slots` | Dict[str, Dict[int, float]] | Các slot bị block theo camera |
| `block_seconds` | float | Thời gian block mặc định (300s) |
| `qr_to_slot` | Dict[int, Tuple[str, int]] | Mapping qr_code -> (camera_id, slot_number) |
| `pairing_config_path` | str | Đường dẫn file config pairing |

## Các phương thức chính

### 1. Quản lý ROI Cache

#### `_load_qr_mapping()`
```python
def _load_qr_mapping(self) -> None
```
**Chức năng:** Tải mapping qr_code từ file `logic/slot_pairing_config.json`
**Input:** Không
**Output:** Không (cập nhật `self.qr_to_slot`)

#### `update_roi_cache(camera_id, roi_data)`
```python
def update_roi_cache(self, camera_id: str, roi_data: Dict[str, Any]) -> None
```
**Chức năng:** Cập nhật ROI cache cho camera
**Input:**
- `camera_id` (str): ID của camera
- `roi_data` (Dict): Dữ liệu ROI từ queue
**Output:** Không (cập nhật `self.roi_cache`)

### 2. Xử lý Detection

#### `process_detection(detection_data)`
```python
def process_detection(self, detection_data: Dict[str, Any]) -> Optional[Dict[str, Any]]
```
**Chức năng:** Xử lý detection data và áp dụng ROI filter
**Input:**
- `detection_data` (Dict): Dữ liệu detection từ queue
**Output:**
- `Optional[Dict]`: Payload đã được filter cho roi_detection_queue

**Cấu trúc output:**
```json
{
    "camera_id": "cam-1",
    "frame_id": 150,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "frame_shape": {"height": 480, "width": 640, "channels": 3},
    "roi_detections": [...],
    "roi_detection_count": 3,
    "original_detection_count": 5
}
```

#### `filter_detections_by_roi(detections, camera_id)`
```python
def filter_detections_by_roi(self, detections: List[Dict[str, Any]], camera_id: str) -> List[Dict[str, Any]]
```
**Chức năng:** Lọc detections theo ROI và thêm "empty" cho ROI không có shelf
**Input:**
- `detections` (List[Dict]): Danh sách detections từ YOLO
- `camera_id` (str): ID của camera
**Output:**
- `List[Dict]`: Danh sách detections đã được lọc

**Logic xử lý:**
1. Làm sạch các block đã hết hạn
2. Lọc detections có class_name="shelf" và confidence >= 0.5
3. Kiểm tra detection có trong ROI không
4. Bỏ qua detections trong ROI bị block
5. Thêm "empty" cho ROI không có shelf hoặc bị block

### 3. Quản lý Block

#### `_subscribe_stable_pairs()`
```python
def _subscribe_stable_pairs(self) -> None
```
**Chức năng:** Subscribe topic stable_pairs để nhận lệnh block ROI
**Input:** Không
**Output:** Không (chạy trong thread riêng)

**Cơ chế hoạt động:**
1. Đọc messages từ topic "stable_pairs"
2. Lấy start_qr từ payload
3. Map start_qr -> (camera_id, slot_number)
4. Set block cho slot tương ứng với thời gian `block_seconds`

### 4. Tính toán hình học

#### `calculate_iou(bbox1, bbox2)`
```python
def calculate_iou(self, bbox1: Dict[str, float], bbox2: Dict[str, float]) -> float
```
**Chức năng:** Tính IoU giữa 2 bounding box
**Input:**
- `bbox1` (Dict): Bounding box 1 {x1, y1, x2, y2}
- `bbox2` (Dict): Bounding box 2 {x1, y1, x2, y2}
**Output:**
- `float`: IoU value (0.0 - 1.0)

#### `is_point_in_polygon(point, polygon)`
```python
def is_point_in_polygon(self, point: Tuple[float, float], polygon: List[List[int]]) -> bool
```
**Chức năng:** Kiểm tra điểm có nằm trong polygon không
**Input:**
- `point` (Tuple): Điểm (x, y)
- `polygon` (List): Danh sách các điểm của polygon
**Output:**
- `bool`: True nếu điểm nằm trong polygon

#### `is_detection_in_roi(detection, roi_slots)`
```python
def is_detection_in_roi(self, detection: Dict[str, Any], roi_slots: List[Dict[str, Any]]) -> bool
```
**Chức năng:** Kiểm tra detection có nằm trong ROI không
**Input:**
- `detection` (Dict): Thông tin detection
- `roi_slots` (List): Danh sách ROI slots
**Output:**
- `bool`: True nếu detection nằm trong ít nhất 1 ROI

### 5. Hiển thị Video

#### `display_video()`
```python
def display_video(self) -> None
```
**Chức năng:** Hiển thị video real-time với ROI và detections
**Input:** Không
**Output:** Không (chạy trong thread riêng)

#### `draw_roi_on_frame(frame, camera_id)`
```python
def draw_roi_on_frame(self, frame: np.ndarray, camera_id: str) -> np.ndarray
```
**Chức năng:** Vẽ ROI lên frame
**Input:**
- `frame` (np.ndarray): Frame gốc
- `camera_id` (str): ID của camera
**Output:**
- `np.ndarray`: Frame đã được vẽ ROI

#### `draw_detections_on_frame(frame, detections, camera_id)`
```python
def draw_detections_on_frame(self, frame: np.ndarray, detections: List[Dict[str, Any]], camera_id: str) -> np.ndarray
```
**Chức năng:** Vẽ detections lên frame với highlight cho ROI detections
**Input:**
- `frame` (np.ndarray): Frame gốc
- `detections` (List[Dict]): Danh sách detections
- `camera_id` (str): ID của camera
**Output:**
- `np.ndarray`: Frame đã được vẽ detections

### 6. Subscribe Queues

#### `subscribe_roi_config()`
```python
def subscribe_roi_config(self) -> None
```
**Chức năng:** Subscribe ROI config queue và cập nhật cache
**Input:** Không
**Output:** Không (chạy trong thread riêng)

#### `subscribe_raw_detection()`
```python
def subscribe_raw_detection(self) -> None
```
**Chức năng:** Subscribe raw detection queue và xử lý
**Input:** Không
**Output:** Không (chạy trong thread riêng)

## Input/Output Queues

### Input Queues

#### 1. roi_config Queue
- **Topic:** `roi_config`
- **Key:** `camera_id`
- **Format:**
```json
{
    "camera_id": "cam-1",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "slots": [
        {
            "slot_id": "slot-1",
            "points": [[100, 100], [200, 100], [200, 200], [100, 200]]
        }
    ],
    "image_wh": [640, 480]
}
```

#### 2. raw_detection Queue
- **Topic:** `raw_detection`
- **Key:** `camera_id`
- **Format:**
```json
{
    "camera_id": "cam-1",
    "frame_id": 150,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "frame_shape": {"height": 480, "width": 640, "channels": 3},
    "detections": [
        {
            "class_id": 0,
            "class_name": "shelf",
            "confidence": 0.85,
            "bbox": {"x1": 100.0, "y1": 150.0, "x2": 200.0, "y2": 250.0},
            "center": {"x": 150.0, "y": 200.0}
        }
    ],
    "detection_count": 1
}
```

#### 3. stable_pairs Queue
- **Topic:** `stable_pairs`
- **Key:** `pair_id`
- **Format:**
```json
{
    "pair_id": "1111 -> 4567",
    "start_slot": "1111",
    "end_slot": "4567",
    "stable_since": "2024-01-01T12:00:00.000Z"
}
```

### Output Queues

#### roi_detection Queue
- **Topic:** `roi_detection`
- **Key:** `camera_id`
- **Format:**
```json
{
    "camera_id": "cam-1",
    "frame_id": 150,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "frame_shape": {"height": 480, "width": 640, "channels": 3},
    "roi_detections": [
        {
            "class_name": "shelf",
            "confidence": 0.85,
            "class_id": 0,
            "bbox": {"x1": 100.0, "y1": 150.0, "x2": 200.0, "y2": 250.0},
            "center": {"x": 150.0, "y": 200.0},
            "slot_number": 1
        },
        {
            "class_name": "empty",
            "confidence": 1.0,
            "class_id": -1,
            "bbox": {"x1": 300.0, "y1": 200.0, "x2": 400.0, "y2": 300.0},
            "center": {"x": 350.0, "y": 250.0},
            "slot_number": 2
        }
    ],
    "roi_detection_count": 2,
    "original_detection_count": 5
}
```

## Cấu hình

### File slot_pairing_config.json
```json
{
    "starts": [
        {
            "slot_number": 1,
            "camera_id": "cam-1",
            "qr_code": 1111
        }
    ],
    "ends": [
        {
            "slot_number": 5,
            "camera_id": "cam-1",
            "qr_code": 5555
        }
    ],
    "pairs": [
        {
            "start_qr": 1111,
            "end_qrs": 5555
        }
    ],
    "roi_coordinates": [
        {
            "slot_number": 1,
            "camera_id": "cam-1",
            "points": [[173, 170], [979, 170], [979, 564], [173, 564]]
        }
    ]
}
```

## Cách sử dụng

### Chạy cơ bản
```bash
python roi_processor.py
```

### Chạy với database khác
```bash
python roi_processor.py --db-path "path/to/your/queues.db"
```

### Chạy không hiển thị video
```bash
python roi_processor.py --no-video
```

## Threading Model

Module sử dụng 4 threads chính:

1. **ROI Config Thread**: Subscribe và cập nhật ROI config
2. **Raw Detection Thread**: Subscribe và xử lý raw detections
3. **Stable Pairs Thread**: Subscribe stable_pairs để block ROI
4. **Video Display Thread**: Hiển thị video (nếu bật)

## Xử lý Block

### Cơ chế Block
1. Khi nhận stable_pairs với start_qr
2. Map start_qr -> (camera_id, slot_number)
3. Block slot đó trong `block_seconds` (300s)
4. Trong thời gian block, ROI đó sẽ luôn trả về "empty"

### Làm sạch Block
- Tự động dọn các block đã hết hạn mỗi lần xử lý detection
- Block được lưu dưới dạng `{camera_id: {slot_number: expire_epoch}}`

## Lỗi thường gặp

### 1. Lỗi OpenCV polylines
- **Nguyên nhân:** Points không đúng định dạng
- **Giải pháp:** Kiểm tra points có ít nhất 3 điểm và đúng format

### 2. Lỗi unpack non-iterable
- **Nguyên nhân:** Dữ liệu từ queue không đúng format
- **Giải pháp:** Thêm validation trước khi unpack

### 3. Lỗi mapping qr_code
- **Nguyên nhân:** File config không tồn tại hoặc format sai
- **Giải pháp:** Kiểm tra file `logic/slot_pairing_config.json`

## Performance

### Tối ưu hóa
- Sử dụng threading để xử lý song song
- Cache ROI trong RAM để tránh đọc database liên tục
- Lock để đảm bảo thread-safe
- Làm sạch block hết hạn để tránh memory leak

### Monitoring
- Log chi tiết cho các hoạt động quan trọng
- Hiển thị thông tin real-time trên video
- Thống kê số lượng detections và ROI

## Dependencies

```python
import argparse
import time
import threading
import json
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional, Set
import numpy as np
import cv2
from queue_store import SQLiteQueue
```

## Version History

- **v1.0**: ROI filtering cơ bản
- **v1.1**: Thêm block management cho stable pairs
- **v1.2**: Cải thiện error handling và performance
