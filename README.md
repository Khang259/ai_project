## Hướng dẫn

### Cài đặt

1) Yêu cầu: Python 3.10+
2) Cài đặt package:

```bash
pip install -r requirements.txt
```

Lưu ý: `ultralytics` phụ thuộc `torch`. Trên Windows, pip thường cài bản CPU. Nếu cần CUDA, hãy cài torch theo hướng dẫn chính thức trước khi cài `ultralytics`.

### 1) Chạy detector: RTSP → YOLO → queue `raw_detection`

```bash
python detector_rtsp.py --camera-id cam-1 --rtsp rtsp://192.168.1.162:8080/h264_ulaw.sdp --model-path yolo11s_candy_model.pt --conf 0.25 --device cpu
```

Mỗi frame sẽ ghi 1 message vào SQLite `queues.db` (bảng `messages`) với:
- topic: `raw_detection`
- key: `camera_id`

Payload mẫu:

```json
{
  "camera_id": "cam-1",
  "frame_id": 42,
  "timestamp": "2025-09-23T10:00:00Z",
  "detections": [
    {"class_id": 0, "class_name": "person", "confidence": 0.91, "bbox_xyxy": [10.2, 15.7, 120.9, 200.3]}
  ]
}
```

### 2) Tool vẽ ROI theo camera → queue `roi_config`

```bash
python roi_tool.py --camera-id cam-1 --rtsp rtsp://192.168.1.162:8080/h264_ulaw.sdp
```

Phím tắt:
- Click trái: thêm điểm
- c: đóng polygon hiện tại
- n: bắt đầu polygon mới
- z: undo điểm
- r: reset
- s: lưu và thoát
- ESC: thoát không lưu polygon đang dở

Sau khi lưu, sẽ ghi 1 message vào topic `roi_config`, key = `camera_id`.

Payload mẫu:

```json
{
  "camera_id": "cam-1",
  "timestamp": "2025-09-23T10:00:00Z",
  "image_wh": [1280, 720],
  "slots": [
    {"slot_id": "slot-1", "points": [[100,200], [180,210], [190,260], [110,270]]}
  ]
}
```

### Kiểm tra nhanh message gần nhất trong queue

```python
from queue_store import SQLiteQueue
q = SQLiteQueue("queues.db")
print(q.get_latest("raw_detection", "cam-1"))
print(q.get_latest("roi_config", "cam-1"))
```

### 3) Chạy mapper worker: map bbox ↔ ROI + debounce + overlay

```bash
python mapper_worker.py --camera-id cam-1 --rtsp rtsp://192.168.1.162:8080/h264_ulaw.sdp --alpha 0.3 --iou-threshold 0.3
```

- Worker sẽ đọc `raw_detection` và `roi_config` theo `camera_id`, tính occupancy score cho từng `slot` (ROI).
- Sử dụng EMA (`alpha`) để debounce mượt mà theo thời gian.
- Vẽ overlay trực tiếp video: bbox, ROI và score theo từng slot; nhấn ESC để thoát.


