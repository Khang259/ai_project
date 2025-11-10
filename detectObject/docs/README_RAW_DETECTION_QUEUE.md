# Raw Detection Queue - Hệ thống lưu trữ kết quả detection

## Tổng quan

Hệ thống đã được cập nhật để lưu kết quả detection vào **SQLiteQueue** thay vì file JSON. Dữ liệu được lưu trong topic `raw_detection` với key là `camera_id`.

## Cấu trúc dữ liệu

### Topic: `raw_detection`
- **Key**: `camera_id` (ví dụ: "cam-1", "cam-2", "cam-3")
- **Payload**: JSON object chứa thông tin detection

### Payload Structure:
```json
{
  "camera_id": "cam-1",
  "frame_id": 123,
  "timestamp": "2025-01-04T02:48:53.445631Z",
  "frame_shape": {
    "height": 720,
    "width": 1280,
    "channels": 3
  },
  "detections": [
    {
      "class_id": 0,
      "class_name": "shelf",
      "confidence": 0.9254645705223083,
      "bbox": {
        "x1": 371.4974365234375,
        "y1": 301.6153564453125,
        "x2": 588.31201171875,
        "y2": 477.29791259765625
      },
      "center": {
        "x": 479.90472412109375,
        "y": 389.4566345214844
      }
    }
  ],
  "detection_count": 1
}
```

## Thay đổi trong code

### `ai_inference.py`:
- **Trước**: Lưu vào file JSONL (`logs/ai_detections_YYYYMMDD.jsonl`)
- **Sau**: Lưu vào SQLiteQueue topic `raw_detection`

```python
# Thêm import
import sys
sys.path.append('..')
from queue_store import SQLiteQueue

# Khởi tạo queue
queue = SQLiteQueue("queues.db")

# Lưu kết quả detection
queue.publish("raw_detection", cam_name, payload)
```

## Cách sử dụng

### 1. Xem dữ liệu trong queue:

```bash
cd detectObject
python view_raw_detection.py
```

### 2. Test lưu dữ liệu:

```bash
python test_queue_save.py
```

### 3. Sử dụng trong code khác:

```python
import sys
import os
sys.path.append('..')
from queue_store import SQLiteQueue

# Khởi tạo queue (lưu trong thư mục cha)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
queue_db_path = os.path.join(parent_dir, "queues.db")
queue = SQLiteQueue(queue_db_path)

# Đọc detection mới nhất cho camera
latest_detection = queue.get_latest("raw_detection", "cam-1")

# Đọc nhiều detection sau một ID cụ thể
detections = queue.get_after_id("raw_detection", "cam-1", after_id=100, limit=50)
```

## Lợi ích của việc sử dụng SQLiteQueue

### 1. **Truy cập đồng thời**:
- Nhiều process có thể đọc/ghi cùng lúc
- Thread-safe với SQLite WAL mode

### 2. **Truy vấn linh hoạt**:
- Có thể query theo topic, key, thời gian
- Hỗ trợ pagination với `get_after_id()`

### 3. **Hiệu suất cao**:
- SQLite được tối ưu cho việc đọc/ghi
- Index trên topic, key, created_at

### 4. **Durability**:
- Dữ liệu được lưu persistent
- Không mất dữ liệu khi restart

### 5. **Tích hợp dễ dàng**:
- Cùng cơ sở dữ liệu với `roi_config`, `stable_pairs`
- API nhất quán với các topic khác

## So sánh với file JSON

| Aspect | File JSON | SQLiteQueue |
|--------|-----------|-------------|
| **Truy cập đồng thời** | ❌ Khó khăn | ✅ Thread-safe |
| **Truy vấn** | ❌ Phải đọc toàn bộ file | ✅ Query SQL linh hoạt |
| **Hiệu suất** | ❌ Chậm với file lớn | ✅ Nhanh với index |
| **Durability** | ✅ OK | ✅ Tốt hơn |
| **Tích hợp** | ❌ Riêng biệt | ✅ Cùng hệ thống |

## Monitoring và Debug

### 1. Kiểm tra thống kê:
```bash
python view_raw_detection.py
```

### 2. Kiểm tra trực tiếp database:
```bash
# Từ thư mục cha của detectObject
sqlite3 queues.db "SELECT COUNT(*) FROM messages WHERE topic='raw_detection';"
sqlite3 queues.db "SELECT key, COUNT(*) FROM messages WHERE topic='raw_detection' GROUP BY key;"
```

### 3. Xem detection mới nhất:
```bash
# Từ thư mục cha của detectObject
sqlite3 queues.db "SELECT key, payload, created_at FROM messages WHERE topic='raw_detection' ORDER BY id DESC LIMIT 5;"
```

## Integration với ROI Processor

ROI Processor có thể đọc dữ liệu từ `raw_detection` topic:

```python
# Trong roi_processor.py
latest_detection = self.queue.get_latest("raw_detection", camera_id)
if latest_detection:
    detections = latest_detection.get("detections", [])
    # Xử lý detections với ROI logic
```

## Troubleshooting

### Vấn đề: Không thấy dữ liệu trong queue
- **Kiểm tra**: Database file `queues.db` có tồn tại không
- **Kiểm tra**: Process AI inference có đang chạy không
- **Kiểm tra**: Camera có đang gửi frame không

### Vấn đề: Lỗi import SQLiteQueue
- **Giải pháp**: Đảm bảo `sys.path.append('..')` được thêm vào
- **Kiểm tra**: File `queue_store.py` có trong thư mục cha không

### Vấn đề: Queue bị lock
- **Nguyên nhân**: Nhiều process truy cập đồng thời
- **Giải pháp**: SQLiteQueue sử dụng WAL mode, tự động xử lý concurrent access

## Tương lai

- [ ] Compression cho payload lớn
- [ ] TTL (Time To Live) cho dữ liệu cũ
- [ ] Batch insert để tăng hiệu suất
- [ ] Real-time notification khi có detection mới
