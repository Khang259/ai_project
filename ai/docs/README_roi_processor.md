# ROI Processor - Bộ Xử Lý ROI

## Tổng Quan

`roi_processor.py` là module cốt lõi của hệ thống, chịu trách nhiệm:
- **Lọc detections theo vùng ROI** (Region of Interest)
- **Quản lý trạng thái block/unlock của các ROI slots**
- **Theo dõi end slots để tự động unlock start slots**
- **Tích hợp với hệ thống queue để nhận/gửi dữ liệu real-time**

## Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│                     ROI Processor                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐   │
│  │ ROI Config   │  │ Raw Detection │  │ Stable Pairs    │   │
│  │ Subscriber   │  │ Subscriber    │  │ Subscriber      │   │
│  └──────┬───────┘  └───────┬───────┘  └────────┬────────┘   │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            ROI Cache & State Manager                 │   │
│  │  - roi_cache: {camera_id: [slots]}                  │    │
│  │  - blocked_slots: {camera_id: {slot: expire}}       │    │
│  │  - end_slot_states: {(cam, slot): {state, time}}    │    │
│  └──────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Detection Filter & Publisher               │   │
│  │  - Filter by ROI                                     │   │
│  │  - Add "empty" for non-shelf slots                   │   │
│  │  - Publish to roi_detection queue                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Thành Phần Chính

### 1. ROIProcessor Class

#### Khởi Tạo

```python
processor = ROIProcessor(
    db_path="queues.db",      # Database SQLite
    show_video=True           # Hiển thị video real-time
)
```

#### Thuộc Tính Quan Trọng

| Thuộc tính | Kiểu | Mô tả |
|-----------|------|-------|
| `roi_cache` | `Dict[str, List[Dict]]` | Cache ROI cho mỗi camera |
| `blocked_slots` | `Dict[str, Dict[int, float]]` | Slots bị block: `{camera_id: {slot_number: expire_time}}` |
| `end_slot_states` | `Dict[Tuple[str, int], Dict]` | Trạng thái end slots để monitoring |
| `end_to_start_mapping` | `Dict[Tuple, Tuple]` | Mapping `end_slot -> start_slot` |
| `qr_to_slot` | `Dict[int, Tuple[str, int]]` | Mapping `qr_code -> (camera_id, slot_number)` |
| `shelf_stable_time` | `float` | Thời gian cần giữ shelf để unlock (mặc định: 20s) |

### 2. Hệ Thống Subscribe

#### 2.1 Subscribe ROI Config (`subscribe_roi_config`)

```python
Topic: "roi_config"
Key: camera_id
Payload: {
    "camera_id": "cam-1",
    "timestamp": "2025-01-01T00:00:00Z",
    "slots": [
        {
            "slot_id": "slot-1",
            "points": [[x1, y1], [x2, y2], ...]
        }
    ]
}
```

**Chức năng:**
- Load ROI config cho tất cả cameras
- Monitor và update khi có ROI config mới
- Update `roi_cache` real-time

#### 2.2 Subscribe Raw Detection (`subscribe_raw_detection`)

```python
Topic: "raw_detection"
Key: camera_id
Payload: {
    "camera_id": "cam-1",
    "frame_id": 123,
    "timestamp": "2025-01-01T00:00:00.123Z",
    "detections": [
        {
            "class_name": "shelf",
            "confidence": 0.95,
            "bbox": {"x1": 100, "y1": 200, "x2": 300, "y2": 400},
            "center": {"x": 200, "y": 300}
        }
    ]
}
```

**Chức năng:**
- Nhận detections từ AI inference
- Filter theo ROI
- Thêm `slot_number` cho mỗi detection
- Tạo "empty" detection cho slots không có shelf
- Publish vào `roi_detection` queue

#### 2.3 Subscribe Stable Pairs (`_subscribe_stable_pairs`)

```python
Topic: "stable_pairs"
Key: pair_id
Payload: {
    "pair_id": "101 -> 201",
    "start_slot": "101",  # QR code
    "end_slot": "201",    # QR code
    "stable_since": "2025-01-01T00:00:00Z"
}
```

**Chức năng:**
- Nhận thông báo về stable pairs
- **Block start slot vô thời hạn** khi nhận start_qr
- **Bắt đầu monitor end slot** để unlock

### 3. ROI Filtering System

#### 3.1 Filter Detections By ROI (`filter_detections_by_roi`)

**Flow:**

```
Input: detections + camera_id
    │
    ├─> Load ROI slots for camera
    │
    ├─> For each detection:
    │   ├─> Check if class_name == "shelf" && confidence >= 0.5
    │   ├─> Check if detection center in any ROI polygon
    │   ├─> If slot is BLOCKED → skip (sẽ tạo empty)
    │   └─> If slot is NOT BLOCKED → add with slot_number
    │
    └─> For each ROI slot:
        ├─> If slot is BLOCKED OR no shelf → create "empty" detection
        │   └─> Update end_slot_state("empty")
        └─> If slot has shelf → Update end_slot_state("shelf")
    
Output: List of detections with slot_number (shelf + empty)
```

#### 3.2 IoU Calculation (`calculate_iou`)

Tính Intersection over Union giữa 2 bounding boxes:

```python
IoU = Intersection Area / Union Area
```

#### 3.3 Point in Polygon (`is_detection_in_roi`)

Sử dụng ray casting algorithm để kiểm tra detection center có nằm trong ROI polygon hay không.

### 4. Block/Unlock Mechanism

#### 4.1 Block ROI Slot

**Khi nào block:**
- Khi nhận `stable_pairs` message với `start_qr`

**Cơ chế:**
```python
blocked_slots[camera_id][slot_number] = math.inf  # Vô thời hạn
```

**Hiệu ứng:**
- Slot bị block → Bỏ qua tất cả shelf detections
- Luôn tạo "empty" detection cho slot đó
- Chỉ unlock khi end slot đủ điều kiện

#### 4.2 End Slot Monitoring

**Thiết lập mapping:**
```python
# Từ slot_pairing_config.json
end_to_start_mapping = {
    ("cam-2", 1): ("cam-1", 1),  # End slot -> Start slot
    ("cam-2", 2): ("cam-1", 2),
}
```

**State tracking:**
```python
end_slot_states[(camera_id, slot_number)] = {
    'state': 'empty' | 'shelf',
    'first_shelf_time': timestamp | None,
    'last_update_time': timestamp
}
```

**Update flow:**

```
Detection frame arrives
    │
    └─> For each ROI slot:
        ├─> Determine state: "shelf" or "empty"
        │
        └─> If slot is an END slot being monitored:
            ├─> If transition: empty → shelf
            │   └─> Start timer (first_shelf_time = now)
            │
            ├─> If transition: shelf → empty
            │   └─> Reset timer (first_shelf_time = None)
            │
            └─> If state == "shelf" AND timer running:
                └─> If duration >= 20s:
                    ├─> Unlock corresponding START slot
                    └─> Reset timer
```

#### 4.3 Unlock Start Slot (`_unlock_start_slot`)

**Điều kiện unlock:**
1. End slot ở trạng thái "shelf"
2. Giữ trạng thái "shelf" liên tục trong `shelf_stable_time` (20s)
3. End slot có mapping với start slot

**Kết quả:**
```python
# Xóa slot khỏi blocked_slots
del blocked_slots[camera_id][slot_number]
```

### 5. Video Display Integration

Tích hợp với `optimized_roi_visualizer.py`:

```python
video_display_manager.display_video(
    roi_cache=self.roi_cache,
    latest_roi_detections=self.latest_roi_detections,
    end_slot_states=self.end_slot_states,
    video_captures=self.video_captures,
    frame_cache=self.frame_cache,
    update_frame_cache_func=self.update_frame_cache
)
```

## Cấu Hình

### 1. Slot Pairing Config (`logic/slot_pairing_config.json`)

```json
{
  "starts": [
    {
      "qr_code": 101,
      "camera_id": "cam-1",
      "slot_number": 1
    }
  ],
  "ends": [
    {
      "qr_code": 201,
      "camera_id": "cam-2",
      "slot_number": 1
    }
  ],
  "pairs": [
    {
      "start_qr": 101,
      "end_qrs": 201
    }
  ]
}
```

### 2. Camera Config (`logic/cam_config.json`)

```json
{
  "cam_urls": [
    ["cam-1", "rtsp://192.168.1.100:554/stream"],
    ["cam-2", "rtsp://192.168.1.101:554/stream"]
  ]
}
```

## Sử Dụng

### Command Line

```bash
# Chạy với video display
python roi_processor.py

# Chạy không hiển thị video
python roi_processor.py --no-video

# Chỉ định database path
python roi_processor.py --db-path /path/to/queues.db
```

### Programmatic

```python
from roi_processor import ROIProcessor

# Khởi tạo
processor = ROIProcessor(
    db_path="queues.db",
    show_video=True
)

# Chạy processor (blocking)
processor.run()

# Hoặc custom control
processor.running = True

# Start threads
roi_thread = threading.Thread(target=processor.subscribe_roi_config)
detection_thread = threading.Thread(target=processor.subscribe_raw_detection)
stable_pairs_thread = threading.Thread(target=processor._subscribe_stable_pairs)

roi_thread.start()
detection_thread.start()
stable_pairs_thread.start()

# Stop
processor.running = False
```

## Data Flow

### Input Queues

1. **roi_config**: Cấu hình ROI từ `roi_tool.py`
2. **raw_detection**: Detections từ AI inference
3. **stable_pairs**: Stable pairs từ `stable_pair_processor.py`

### Output Queue

**roi_detection**: Detections đã được filter theo ROI

```json
{
  "camera_id": "cam-1",
  "frame_id": 123,
  "timestamp": "2025-01-01T00:00:00.123Z",
  "frame_shape": [1080, 1920, 3],
  "roi_detections": [
    {
      "class_name": "shelf",
      "confidence": 0.95,
      "slot_number": 1,
      "bbox": {...},
      "center": {...}
    },
    {
      "class_name": "empty",
      "confidence": 1.0,
      "slot_number": 2,
      "bbox": {...},
      "center": {...}
    }
  ],
  "roi_detection_count": 2,
  "original_detection_count": 5
}
```

## Thread Architecture

```
Main Thread
    │
    ├─> ROI Config Thread (subscribe_roi_config)
    │   └─> Update roi_cache every 1s
    │
    ├─> Raw Detection Thread (subscribe_raw_detection)
    │   └─> Process detections every 100ms
    │
    ├─> Stable Pairs Thread (_subscribe_stable_pairs)
    │   └─> Block/Monitor slots every 200ms
    │
    └─> Video Display Thread (display_video)
        └─> Render frames at target FPS
```

## Logging & Debugging

### Console Output Examples

```
[BLOCK] Đã block ROI slot 1 trên cam-1 (vô thời hạn) do start_qr=101
[END_MONITOR] Bắt đầu theo dõi end slot 1 trên cam-2 (QR: 201)
[END_MONITOR] End slot 1 trên cam-2: empty -> shelf (bắt đầu đếm)
[UNLOCK] Đã unlock start slot 1 trên cam-1 (do end slot 1 trên cam-2 có shelf stable 20.0s)
```

### State Inspection

```python
# Check blocked slots
print(processor.blocked_slots)
# {'cam-1': {1: inf, 2: inf}}

# Check end slot states
print(processor.end_slot_states)
# {('cam-2', 1): {'state': 'shelf', 'first_shelf_time': 1234567890.5, 'last_update_time': 1234567910.5}}

# Check ROI cache
print(processor.roi_cache)
# {'cam-1': [{'slot_id': 'slot-1', 'points': [[100, 200], ...]}]}
```

## Performance Considerations

1. **Thread-safe với RLock**: Tất cả shared state được bảo vệ bởi `cache_lock`
2. **Batch processing**: Xử lý multiple detections mỗi lần để giảm overhead
3. **Efficient polygon check**: Ray casting algorithm O(n) với n là số đỉnh polygon
4. **Cache ROI**: Tránh reload ROI config liên tục

## Troubleshooting

### Issue: Slot không bị block

**Nguyên nhân:**
- `stable_pairs` không publish
- QR code không match trong `qr_to_slot`
- File `slot_pairing_config.json` chưa được load

**Giải pháp:**
```python
# Reload mapping
processor._load_qr_mapping()

# Check mapping
print(processor.qr_to_slot)
```

### Issue: Start slot không unlock

**Nguyên nhân:**
- End slot không được monitor
- End slot không đạt 20s shelf stable
- Mapping `end_to_start` không đúng

**Giải pháp:**
```python
# Check end_to_start mapping
print(processor.end_to_start_mapping)

# Check end slot state
print(processor.end_slot_states)
```

### Issue: Không có ROI detections

**Nguyên nhân:**
- ROI cache chưa load
- Detection center không nằm trong ROI polygon
- Confidence < 0.5

**Giải pháp:**
```python
# Check ROI cache
print(processor.roi_cache.get('cam-1'))

# Check raw detections
print(processor.latest_detections.get('cam-1'))
```

## Tích Hợp Với Các Module Khác

### Với stable_pair_processor.py
```
stable_pair_processor → stable_pairs queue → roi_processor
                                               ↓
                                        Block start slot
                                        Monitor end slot
```

### Với optimized_roi_visualizer.py
```
roi_processor → roi_cache, latest_roi_detections → VideoDisplayManager
                                                     ↓
                                              Display with ROI overlay
```

### Với AI Inference
```
AI Inference → raw_detection queue → roi_processor
                                       ↓
                                Filter by ROI
                                       ↓
                                roi_detection queue
```

## Best Practices

1. **Luôn load ROI config trước khi process detections**
2. **Monitor console logs để debug block/unlock behavior**
3. **Kiểm tra `slot_pairing_config.json` trước khi chạy**
4. **Sử dụng `--no-video` khi chạy trên server không có display**
5. **Backup database định kỳ để tránh mất dữ liệu**

## Tham Khảo

- `optimized_roi_visualizer.py`: Display visualization
- `roi_tool.py`: Draw and configure ROI
- `stable_pair_processor.py`: Stable pair detection
- `queue_store.py`: Queue management

