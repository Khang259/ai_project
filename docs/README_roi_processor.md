# ROI Processor

Tool xử lý ROI filtering cho detections từ YOLO model. Sub ROI config queue, raw detection queue, apply IoU filter và push kết quả ra roi_detection_queue.

## Tính năng

- **ROI Cache Management**: Cache ROI config theo camera_id trong RAM
- **Real-time Processing**: Sub raw detection queue và xử lý real-time
- **IoU Filtering**: Lọc detections nằm trong ROI areas
- **Multi-camera Support**: Hỗ trợ nhiều camera đồng thời
- **Thread-safe**: Sử dụng threading để xử lý song song

## Cách hoạt động

1. **Subscribe ROI Config**: Load và monitor ROI config từ `roi_config` queue
2. **Subscribe Raw Detection**: Monitor detections từ `raw_detection` queue  
3. **Apply ROI Filter**: Kiểm tra detections có nằm trong ROI không
4. **Push Results**: Đẩy kết quả đã filter vào `roi_detection` queue

## Cài đặt

```bash
pip install opencv-python numpy
```

## Sử dụng

### Chạy ROI Processor:
```bash
python roi_processor.py
```

### Chạy với database khác:
```bash
python roi_processor.py --db-path "path/to/your/queues.db"
```

## Tham số

- `--db-path`: Đường dẫn đến database SQLite (mặc định: queues.db)

## Input Queues

### 1. roi_config Queue
Topic: `roi_config`
Key: `camera_id`

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

### 2. raw_detection Queue
Topic: `raw_detection`
Key: `camera_id`

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
            "class_name": "candy",
            "confidence": 0.85,
            "bbox": {
                "x1": 150.0,
                "y1": 150.0,
                "x2": 200.0,
                "y2": 200.0
            },
            "center": {
                "x": 175.0,
                "y": 175.0
            }
        }
    ],
    "detection_count": 1
}
```

## Output Queue

### roi_detection Queue
Topic: `roi_detection`
Key: `camera_id`

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
    "roi_detections": [
        {
            "class_id": 0,
            "class_name": "candy",
            "confidence": 0.85,
            "bbox": {
                "x1": 150.0,
                "y1": 150.0,
                "x2": 200.0,
                "y2": 200.0
            },
            "center": {
                "x": 175.0,
                "y": 175.0
            }
        }
    ],
    "roi_detection_count": 1,
    "original_detection_count": 3
}
```

## Thuật toán Filtering

1. **Point-in-Polygon Test**: Kiểm tra center point của detection có nằm trong ROI polygon không
2. **Multi-ROI Support**: Detection chỉ cần nằm trong 1 ROI để được giữ lại
3. **Real-time Processing**: Xử lý ngay khi có detection mới

## Monitoring

Tool sẽ hiển thị log real-time:
```
Đã cập nhật ROI cache cho camera cam-1: 2 slots
Camera cam-1 - Frame 150: 1/3 detections
Camera cam-1 - Frame 155: 0/2 detections
```

## Lưu ý

- ROI config được cache trong RAM, cập nhật real-time khi có thay đổi
- Chỉ detections có center point nằm trong ROI mới được giữ lại
- Tool chạy liên tục cho đến khi nhấn Ctrl+C
- Hỗ trợ nhiều camera đồng thời
