# Stable Pair Processor - Bộ Phát Hiện Cặp Slot Ổn Định

## Tổng Quan

`stable_pair_processor.py` là module chịu trách nhiệm:
- **Theo dõi trạng thái slot** (shelf/empty) real-time
- **Phát hiện stable pairs**: Start slot có shelf + End slot empty trong thời gian ổn định
- **Publish stable pairs** vào queue để trigger workflow tiếp theo
- **Deduplication**: Tránh publish duplicate trong cùng phút
- **Cooldown mechanism**: Giảm spam với thời gian chờ giữa các lần publish

## Khái Niệm Cơ Bản

### Slot State
- **shelf**: Có kệ hàng trong slot
- **empty**: Không có kệ hàng trong slot

### Stable Condition
Một slot được coi là **stable** khi:
1. Trạng thái không đổi liên tục
2. Thời gian duy trì ≥ `stable_seconds` (mặc định: 20s)

### Pair Condition
Một **stable pair** được phát hiện khi:
1. **Start slot** ở trạng thái **shelf stable** (≥20s)
2. **End slot** ở trạng thái **empty stable** (≥20s)
3. Start và end được cấu hình thành pair trong config

### Ví Dụ Thực Tế

```
Kịch bản: Chuyển kệ hàng từ kho A (cam-1) sang kho B (cam-2)

T=0s:   Start slot (cam-1, slot-1): empty
        End slot (cam-2, slot-1): empty

T=10s:  Robot đặt kệ vào start slot
        Start slot: empty → shelf

T=15s:  Start slot: shelf (chưa stable, cần 20s)

T=30s:  Start slot: shelf (stable 20s) ✓
        End slot: empty (stable > 20s) ✓
        → Phát hiện stable pair!
        → Publish: "101 -> 201"

T=35s:  Robot nhận lệnh di chuyển kệ

T=60s:  → shel Robot đặt kệ vào end slot
        End slot: emptyf
        Start slot: vẫn shelf (đợi robot lấy)

T=80s:  Robot lấy kệ khỏi start slot
        Start slot: shelf → empty
```

## Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│              Stable Pair Processor                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         ROI Detection Subscriber                       │ │
│  │  - Subscribe topic: roi_detection                      │ │
│  │  - For each camera: track latest processed ID          │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                        │
│                    ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Compute Slot Status                            │ │
│  │  - Extract slot_number from detections                 │ │
│  │  - Determine status: shelf or empty                    │ │
│  │  - Build status_by_slot: {slot_number: status}         │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                        │
│                    ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Update Slot State                              │ │
│  │  slot_state: {                                         │ │
│  │    "cam-1:1": {status: "shelf", since: 1234567890.0}   │ │
│  │    "cam-1:2": {status: "empty", since: 1234567895.0}   │ │
│  │  }                                                     │ │
│  │  - Update if status changed                            │ │
│  │  - Keep 'since' if status unchanged                    │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                        │
│                    ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Evaluate Pairs                                 │ │
│  │  For each (start_qr, end_qrs) in pairs:                │ │
│  │    ├─> Check start slot stable (shelf, 20s)            │ │
│  │    └─> For each end_qr:                                │ │
│  │        └─> Check end slot stable (empty, 20s)          │ │
│  │            └─> If both stable → Maybe publish          │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                        │
│                    ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Publish with Deduplication                     │ │
│  │  1. Check minute-based deduplication                   │ │
│  │  2. Check cooldown period                              │ │
│  │  3. Publish to stable_pairs queue                      │ │
│  │  4. Mark published for this minute                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Thành Phần Chi Tiết

### 1. StablePairProcessor Class

#### 1.1 Khởi Tạo

```python
processor = StablePairProcessor(
    db_path="../queues.db",                          # Database path
    config_path="slot_pairing_config.json",          # Pairing config
    stable_seconds=20.0,                             # Thời gian stable
    cooldown_seconds=10.0                            # Cooldown giữa publishes
)
```

**Tham Số:**

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `db_path` | str | `../queues.db` | Đường dẫn database SQLite |
| `config_path` | str | `slot_pairing_config.json` | File cấu hình pairing |
| `stable_seconds` | float | 20.0 | Thời gian cần giữ trạng thái để stable |
| `cooldown_seconds` | float | 10.0 | Thời gian chờ giữa các lần publish cùng pair |

#### 1.2 Cấu Trúc Dữ Liệu

**slot_state:**
```python
{
    "cam-1:1": {
        "status": "shelf",              # "shelf" hoặc "empty"
        "since": 1234567890.123         # Epoch timestamp (seconds)
    },
    "cam-1:2": {
        "status": "empty",
        "since": 1234567895.456
    }
}
```

**qr_to_slot:**
```python
{
    101: ("cam-1", 1),   # QR 101 → camera cam-1, slot 1
    102: ("cam-1", 2),
    201: ("cam-2", 1),
    202: ("cam-2", 2)
}
```

**pairs:**
```python
[
    (101, [201]),        # Start QR 101 → End QR 201
    (102, [202, 203])    # Start QR 102 → End QR 202 hoặc 203
]
```

**published_at:**
```python
{
    "101 -> 201": 1234567900.0,   # Lần publish cuối
    "102 -> 202": 1234567910.0
}
```

**published_by_minute:**
```python
{
    "101 -> 201": {
        "2025-01-01 10:00": True,   # Đã publish lúc 10:00
        "2025-01-01 10:01": True    # Đã publish lúc 10:01
    }
}
```

### 2. Configuration Loading

#### 2.1 Load Pairing Config

**File Format: slot_pairing_config.json**

```json
{
  "starts": [
    {
      "qr_code": 101,
      "camera_id": "cam-1",
      "slot_number": 1
    },
    {
      "qr_code": 102,
      "camera_id": "cam-1",
      "slot_number": 2
    }
  ],
  "ends": [
    {
      "qr_code": 201,
      "camera_id": "cam-2",
      "slot_number": 1
    },
    {
      "qr_code": 202,
      "camera_id": "cam-2",
      "slot_number": 2
    }
  ],
  "pairs": [
    {
      "start_qr": 101,
      "end_qrs": 201         # Single end
    },
    {
      "start_qr": 102,
      "end_qrs": [202, 203]  # Multiple ends
    }
  ]
}
```

**Parsing Logic:**

```python
def _load_pairing_config():
    with open(config_path, "r") as f:
        cfg = json.load(f)
    
    # Build qr_to_slot mapping
    qr_to_slot.clear()
    for item in cfg.get("starts", []):
        qr_to_slot[int(item["qr_code"])] = (
            str(item["camera_id"]), 
            int(item["slot_number"])
        )
    
    for item in cfg.get("ends", []):
        qr_to_slot[int(item["qr_code"])] = (
            str(item["camera_id"]), 
            int(item["slot_number"])
        )
    
    # Build pairs
    pairs.clear()
    for pair in cfg.get("pairs", []):
        start_qr = int(pair["start_qr"])
        end_qrs_raw = pair.get("end_qrs", [])
        
        # Normalize to list
        if isinstance(end_qrs_raw, list):
            end_qrs = [int(x) for x in end_qrs_raw]
        else:
            end_qrs = [int(end_qrs_raw)]
        
        pairs.append((start_qr, end_qrs))
```

### 3. ROI Detection Processing

#### 3.1 Subscribe ROI Detections

**Input Queue:**
```
Topic: roi_detection
Key: camera_id
Payload: {
    "camera_id": "cam-1",
    "frame_id": 123,
    "roi_detections": [
        {
            "class_name": "shelf",
            "slot_number": 1,
            ...
        },
        {
            "class_name": "empty",
            "slot_number": 2,
            ...
        }
    ]
}
```

**Subscription Flow:**

```python
# Initialize trackers
roi_det_cameras = _iter_roi_detections()  # Get all camera IDs
last_roi_det_id = {}

for cam in roi_det_cameras:
    row = queue.get_latest_row("roi_detection", cam)
    if row:
        last_roi_det_id[cam] = row["id"]

# Main loop
while True:
    # Check for new cameras
    for cam in _iter_roi_detections():
        if cam not in last_roi_det_id:
            # Initialize new camera
            row = queue.get_latest_row("roi_detection", cam)
            if row:
                last_roi_det_id[cam] = row["id"]
    
    # Read new detections per camera
    for cam, last_id in last_roi_det_id.items():
        rows = queue.get_after_id("roi_detection", cam, last_id, limit=20)
        
        for row in rows:
            payload = row["payload"]
            last_roi_det_id[cam] = row["id"]
            
            roi_detections = payload.get("roi_detections", [])
            
            # Process detections
            status_by_slot = _compute_slot_statuses(cam, roi_detections)
            if status_by_slot:
                _update_slot_state(cam, status_by_slot)
    
    # Evaluate pairs
    # ...
    
    time.sleep(0.2)  # 5 Hz
```

#### 3.2 Compute Slot Status

**Logic:**

```python
def _compute_slot_statuses(camera_id, roi_detections):
    status_by_slot = {}
    
    for det in roi_detections:
        cls = det.get("class_name")
        slot_num = det.get("slot_number")
        
        if slot_num is None:
            continue
        
        if cls == "shelf":
            # Shelf có độ ưu tiên cao
            status_by_slot[int(slot_num)] = "shelf"
        elif cls == "empty" and int(slot_num) not in status_by_slot:
            # Chỉ mark empty nếu chưa thấy shelf cho slot này
            status_by_slot[int(slot_num)] = "empty"
    
    return status_by_slot
```

**Example:**

Input detections:
```python
[
    {"class_name": "shelf", "slot_number": 1},
    {"class_name": "empty", "slot_number": 2},
    {"class_name": "empty", "slot_number": 3}
]
```

Output status_by_slot:
```python
{
    1: "shelf",
    2: "empty",
    3: "empty"
}
```

#### 3.3 Update Slot State

**State Transition Logic:**

```python
def _update_slot_state(camera_id, status_by_slot):
    now = time.time()
    
    for slot_num, status in status_by_slot.items():
        key = f"{camera_id}:{slot_num}"
        prev = slot_state.get(key)
        
        if prev is None:
            # Khởi tạo state mới
            slot_state[key] = {
                "status": status,
                "since": now
            }
        else:
            if prev["status"] != status:
                # Trạng thái thay đổi → reset timestamp
                slot_state[key] = {
                    "status": status,
                    "since": now
                }
            # else: Giữ nguyên 'since' (đang stable)
```

**State Diagram:**

```
Initial State: None
    │
    ├─> Receive "shelf"
    │   └─> State: {status: "shelf", since: T0}
    │
    ├─> Time passes, still "shelf"
    │   └─> State: {status: "shelf", since: T0}  (unchanged)
    │
    ├─> Receive "empty"
    │   └─> State: {status: "empty", since: T1}  (reset timestamp)
    │
    └─> Receive "shelf" again
        └─> State: {status: "shelf", since: T2}  (reset timestamp)
```

### 4. Pair Evaluation

#### 4.1 Check Slot Stability

```python
def _is_slot_stable(camera_id, slot_number, expect_status):
    key = f"{camera_id}:{slot_number}"
    st = slot_state.get(key)
    
    # Slot chưa có state
    if not st:
        return False, None
    
    # Trạng thái không match
    if st["status"] != expect_status:
        return False, None
    
    # Tính thời gian stable
    now = time.time()
    duration = now - st["since"]
    stable = (duration >= stable_seconds)
    
    # Return (is_stable, stable_since_timestamp)
    return stable, st["since"] if stable else None
```

**Example:**

```python
# Slot state: {"cam-1:1": {"status": "shelf", "since": 1234567890.0}}
# Current time: 1234567910.0 (20s sau)
# stable_seconds: 20.0

is_stable, since = _is_slot_stable("cam-1", 1, "shelf")
# is_stable = True
# since = 1234567890.0
```

#### 4.2 Evaluate All Pairs

```python
# For each configured pair
for start_qr, end_qrs in pairs:
    # Get start slot location
    start_cam_slot = qr_to_slot.get(start_qr)
    if not start_cam_slot:
        continue
    
    start_cam, start_slot = start_cam_slot
    
    # Check if start slot is stable with "shelf"
    start_ok, start_since = _is_slot_stable(
        start_cam, start_slot, expect_status="shelf"
    )
    
    if not start_ok or start_since is None:
        continue  # Start not stable yet
    
    # Check each possible end slot
    for end_qr in end_qrs:
        end_cam_slot = qr_to_slot.get(end_qr)
        if not end_cam_slot:
            continue
        
        end_cam, end_slot = end_cam_slot
        
        # Check if end slot is stable with "empty"
        end_ok, end_since = _is_slot_stable(
            end_cam, end_slot, expect_status="empty"
        )
        
        if not end_ok or end_since is None:
            continue  # End not stable yet
        
        # Both stable! Calculate stable_since
        stable_since_epoch = max(start_since, end_since)
        
        # Try to publish
        _maybe_publish_pair(start_qr, end_qr, stable_since_epoch)
```

**Why max(start_since, end_since)?**

Vì pair chỉ thực sự stable khi **cả hai** đều stable. Nếu:
- Start stable từ T1
- End stable từ T2 (T2 > T1)

Thì pair chỉ stable từ T2 (thời điểm sau hơn).

### 5. Publish with Deduplication

#### 5.1 Minute-based Deduplication

**Mục đích:** Tránh publish duplicate trong cùng phút

```python
def _get_minute_key(epoch_seconds):
    dt = datetime.utcfromtimestamp(epoch_seconds)
    return dt.strftime("%Y-%m-%d %H:%M")

def _is_already_published_this_minute(pair_id, stable_since_epoch):
    minute_key = _get_minute_key(stable_since_epoch)
    
    if pair_id not in published_by_minute:
        published_by_minute[pair_id] = {}
    
    return minute_key in published_by_minute[pair_id]

def _mark_published_this_minute(pair_id, stable_since_epoch):
    minute_key = _get_minute_key(stable_since_epoch)
    
    if pair_id not in published_by_minute:
        published_by_minute[pair_id] = {}
    
    published_by_minute[pair_id][minute_key] = True
```

**Example:**

```python
# T1 = 2025-01-01 10:00:15 → minute_key = "2025-01-01 10:00"
# T2 = 2025-01-01 10:00:45 → minute_key = "2025-01-01 10:00" (same)
# T3 = 2025-01-01 10:01:10 → minute_key = "2025-01-01 10:01" (different)

# At T1: Publish → Mark "2025-01-01 10:00"
# At T2: Skip (same minute)
# At T3: Publish → Mark "2025-01-01 10:01"
```

#### 5.2 Cooldown Mechanism

**Mục đích:** Tránh spam khi slot liên tục stable

```python
def _maybe_publish_pair(start_qr, end_qr, stable_since_epoch):
    pair_id = f"{start_qr} -> {end_qr}"
    
    # Check minute deduplication
    if _is_already_published_this_minute(pair_id, stable_since_epoch):
        return  # Skip
    
    # Check cooldown
    last_pub = published_at.get(pair_id, 0.0)
    now = time.time()
    
    if now - last_pub < cooldown_seconds:
        return  # Too soon, skip
    
    # OK to publish
    _mark_published_this_minute(pair_id, stable_since_epoch)
    published_at[pair_id] = now
    
    # Create payload
    payload = {
        "pair_id": pair_id,
        "start_slot": str(start_qr),
        "end_slot": str(end_qr),
        "stable_since": datetime.utcfromtimestamp(stable_since_epoch)
                               .replace(tzinfo=timezone.utc)
                               .isoformat()
                               .replace("+00:00", "Z")
    }
    
    # Publish
    queue.publish("stable_pairs", pair_id, payload)
```

#### 5.3 Publish Payload Format

```json
{
  "pair_id": "101 -> 201",
  "start_slot": "101",
  "end_slot": "201",
  "stable_since": "2025-01-01T10:00:15.123456Z"
}
```

**Queue Schema:**
```
Topic: stable_pairs
Key: pair_id (e.g., "101 -> 201")
Payload: JSON object (see above)
```

### 6. Main Loop

```python
def run():
    # Initialize
    roi_det_cameras = _iter_roi_detections()
    last_roi_det_id = {}
    for cam in roi_det_cameras:
        row = queue.get_latest_row("roi_detection", cam)
        if row:
            last_roi_det_id[cam] = row["id"]
    
    print(f"Started. Watching cameras: {roi_det_cameras}")
    
    while True:
        try:
            # 1. Discover new cameras
            for cam in _iter_roi_detections():
                if cam not in last_roi_det_id:
                    row = queue.get_latest_row("roi_detection", cam)
                    if row:
                        last_roi_det_id[cam] = row["id"]
            
            # 2. Read new detections
            for cam, last_id in last_roi_det_id.items():
                rows = queue.get_after_id("roi_detection", cam, last_id, limit=20)
                
                for row in rows:
                    payload = row["payload"]
                    last_roi_det_id[cam] = row["id"]
                    
                    roi_detections = payload.get("roi_detections", [])
                    status_by_slot = _compute_slot_statuses(cam, roi_detections)
                    
                    if status_by_slot:
                        _update_slot_state(cam, status_by_slot)
            
            # 3. Evaluate pairs
            for start_qr, end_qrs in pairs:
                # ... (as described above)
            
            # 4. Sleep
            time.sleep(0.2)  # 5 Hz
        
        except KeyboardInterrupt:
            print("Stopping...")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(1.0)
```

## Sử Dụng

### Command Line

```bash
# Từ thư mục logic/
cd logic
python stable_pair_processor.py

# Hoặc từ project root
cd ..
python logic/stable_pair_processor.py
```

**Note:** Script tự động thêm parent directory vào sys.path để import queue_store

### Programmatic

```python
from logic.stable_pair_processor import StablePairProcessor

processor = StablePairProcessor(
    db_path="../queues.db",
    config_path="slot_pairing_config.json",
    stable_seconds=20.0,
    cooldown_seconds=10.0
)

processor.run()  # Blocking
```

### Custom Configuration

```python
# Use custom thresholds
processor = StablePairProcessor(
    stable_seconds=30.0,      # Tăng thời gian stable lên 30s
    cooldown_seconds=5.0      # Giảm cooldown xuống 5s
)
```

## Data Flow

```
ROI Processor
    │
    └─> roi_detection queue
            │
            ▼
    Stable Pair Processor
            │
            ├─> Compute slot status
            ├─> Update slot state
            ├─> Evaluate pairs
            │
            └─> stable_pairs queue
                    │
                    ├─> ROI Processor (block/monitor)
                    └─> Post API (create task)
```

## Configuration Examples

### Simple Setup (1 pair)

```json
{
  "starts": [
    {"qr_code": 101, "camera_id": "cam-1", "slot_number": 1}
  ],
  "ends": [
    {"qr_code": 201, "camera_id": "cam-2", "slot_number": 1}
  ],
  "pairs": [
    {"start_qr": 101, "end_qrs": 201}
  ]
}
```

### Multiple Pairs

```json
{
  "starts": [
    {"qr_code": 101, "camera_id": "cam-1", "slot_number": 1},
    {"qr_code": 102, "camera_id": "cam-1", "slot_number": 2},
    {"qr_code": 103, "camera_id": "cam-1", "slot_number": 3}
  ],
  "ends": [
    {"qr_code": 201, "camera_id": "cam-2", "slot_number": 1},
    {"qr_code": 202, "camera_id": "cam-2", "slot_number": 2},
    {"qr_code": 203, "camera_id": "cam-2", "slot_number": 3}
  ],
  "pairs": [
    {"start_qr": 101, "end_qrs": 201},
    {"start_qr": 102, "end_qrs": 202},
    {"start_qr": 103, "end_qrs": 203}
  ]
}
```

### One-to-Many (Multiple End Slots)

```json
{
  "starts": [
    {"qr_code": 101, "camera_id": "cam-1", "slot_number": 1}
  ],
  "ends": [
    {"qr_code": 201, "camera_id": "cam-2", "slot_number": 1},
    {"qr_code": 202, "camera_id": "cam-2", "slot_number": 2},
    {"qr_code": 203, "camera_id": "cam-3", "slot_number": 1}
  ],
  "pairs": [
    {
      "start_qr": 101,
      "end_qrs": [201, 202, 203]  // Kệ từ slot 101 có thể đến 3 vị trí
    }
  ]
}
```

**Use case:** Một start slot có thể gửi kệ đến nhiều end slots khác nhau

## Performance & Optimization

### Polling Frequency

```python
time.sleep(0.2)  # 5 Hz
```

**Trade-offs:**
- **Faster (0.1s)**: Lower latency, higher CPU
- **Slower (0.5s)**: Higher latency, lower CPU

**Recommendation:** 0.2s (5 Hz) là balance tốt

### Batch Size

```python
rows = queue.get_after_id("roi_detection", cam, last_id, limit=20)
```

**Trade-offs:**
- **Smaller (10)**: Lower memory, more frequent DB access
- **Larger (50)**: Higher memory, less frequent DB access

**Recommendation:** 20 là đủ cho hầu hết cases

### State Cleanup

**Problem:** `published_by_minute` dict có thể lớn dần theo thời gian

**Solution (optional):** Periodic cleanup

```python
# Cleanup entries older than 1 hour
def _cleanup_old_minutes():
    now = time.time()
    cutoff_time = now - 3600  # 1 hour ago
    cutoff_minute = _get_minute_key(cutoff_time)
    
    for pair_id in published_by_minute:
        # Remove old minute keys
        published_by_minute[pair_id] = {
            minute: val 
            for minute, val in published_by_minute[pair_id].items()
            if minute >= cutoff_minute
        }
```

## Logging & Debugging

### Console Output

```python
print(f"StablePairProcessor started. Watching cameras: {roi_det_cameras}")
```

**During operation:**
- Mặc định: Silent (không log mỗi frame)
- Chỉ log khi publish pair

**Add verbose logging:**

```python
# In _update_slot_state
if prev and prev["status"] != status:
    print(f"[STATE] {key}: {prev['status']} -> {status}")

# In _maybe_publish_pair
print(f"[PUBLISH] {pair_id} (stable since {stable_since})")
```

### State Inspection

```python
# Check slot states
print(processor.slot_state)
# {'cam-1:1': {'status': 'shelf', 'since': 1234567890.0}}

# Check pair publish history
print(processor.published_at)
# {'101 -> 201': 1234567900.0}

# Check minute deduplication
print(processor.published_by_minute)
# {'101 -> 201': {'2025-01-01 10:00': True}}
```

## Troubleshooting

### Issue: Không phát hiện stable pairs

**Symptoms:**
- Processor chạy nhưng không publish stable_pairs
- Slot state thay đổi liên tục

**Debug:**

```python
# 1. Check slot states
print("Slot states:")
for key, state in processor.slot_state.items():
    now = time.time()
    duration = now - state['since']
    print(f"  {key}: {state['status']} ({duration:.1f}s)")

# 2. Check pair config
print("Pairs:")
for start_qr, end_qrs in processor.pairs:
    print(f"  {start_qr} -> {end_qrs}")

# 3. Check QR mapping
print("QR to slot:")
for qr, (cam, slot) in processor.qr_to_slot.items():
    print(f"  QR {qr} -> {cam}, slot {slot}")
```

**Possible causes:**
- Slot state không đủ 20s stable
- Pairing config sai (QR code không match)
- ROI detection không có slot_number

### Issue: Publish quá nhiều lần

**Symptoms:**
- Cùng một pair publish nhiều lần liên tục
- Spam queue

**Debug:**

```python
# Check cooldown
print(f"Cooldown: {processor.cooldown_seconds}s")

# Check last publish times
print("Last publish times:")
for pair_id, timestamp in processor.published_at.items():
    now = time.time()
    since = now - timestamp
    print(f"  {pair_id}: {since:.1f}s ago")
```

**Solutions:**
- Tăng `cooldown_seconds`
- Kiểm tra minute deduplication logic

### Issue: Config không load được

**Symptoms:**
```
FileNotFoundError: [Errno 2] No such file or directory: 'slot_pairing_config.json'
```

**Solution:**

```bash
# Check file exists
ls -la logic/slot_pairing_config.json

# Run from correct directory
cd logic
python stable_pair_processor.py

# Or use absolute path
processor = StablePairProcessor(
    config_path="/absolute/path/to/slot_pairing_config.json"
)
```

### Issue: Không nhận ROI detections

**Symptoms:**
- `roi_det_cameras` empty
- Processor không xử lý gì

**Debug:**

```python
# Check queue manually
from queue_store import SQLiteQueue

queue = SQLiteQueue("../queues.db")

# List cameras in roi_detection
with queue._connect() as conn:
    cur = conn.execute(
        "SELECT DISTINCT key FROM messages WHERE topic = 'roi_detection'"
    )
    cameras = [row[0] for row in cur.fetchall()]
    print(f"Cameras: {cameras}")
```

**Solutions:**
- Đảm bảo `roi_processor.py` đang chạy
- Kiểm tra `raw_detection` queue có data

## Best Practices

### 1. Configuration Management

**Version control:**
```bash
# Backup before changes
cp slot_pairing_config.json slot_pairing_config.json.backup

# Edit config
vim slot_pairing_config.json

# Restart processor to reload
```

**Validate config:**
```python
def validate_config(config_path):
    with open(config_path) as f:
        cfg = json.load(f)
    
    # Check required keys
    assert "starts" in cfg
    assert "ends" in cfg
    assert "pairs" in cfg
    
    # Check QR uniqueness
    qr_codes = set()
    for item in cfg["starts"] + cfg["ends"]:
        qr = item["qr_code"]
        assert qr not in qr_codes, f"Duplicate QR: {qr}"
        qr_codes.add(qr)
    
    print("Config is valid!")
```

### 2. Monitoring

**Add health check:**
```python
def health_check():
    # Check số cameras đang monitor
    num_cameras = len(last_roi_det_id)
    
    # Check slot states active
    num_active_slots = len(slot_state)
    
    # Check pairs configured
    num_pairs = sum(len(ends) for _, ends in pairs)
    
    print(f"Health: {num_cameras} cameras, "
          f"{num_active_slots} active slots, "
          f"{num_pairs} pairs configured")
```

### 3. Graceful Shutdown

```python
def run():
    try:
        while True:
            # Main loop
            ...
    except KeyboardInterrupt:
        print("Stopping gracefully...")
        # Optional: Publish final states
        # Optional: Save state to file
    finally:
        # Cleanup
        queue.close()
```

### 4. Testing

**Unit test slot stability:**
```python
def test_slot_stability():
    proc = StablePairProcessor()
    
    # Set slot state
    proc.slot_state["cam-1:1"] = {
        "status": "shelf",
        "since": time.time() - 25  # 25s ago
    }
    
    # Check stability
    is_stable, since = proc._is_slot_stable("cam-1", 1, "shelf")
    
    assert is_stable == True
    assert since is not None
```

## Tích Hợp Với Các Module Khác

### Với roi_processor.py
```
roi_processor → roi_detection queue → stable_pair_processor
                                           ↓
                                    stable_pairs queue
                                           ↓
                                    roi_processor (block/unlock)
```

### Với postAPI.py
```
stable_pair_processor → stable_pairs queue → postAPI.py
                                               ↓
                                         POST to API
                                               ↓
                                         Create robot task
```

## Tham Khảo

- `roi_processor.py`: ROI filtering and blocking
- `postAPI.py`: API integration
- `queue_store.py`: Queue operations
- `roi_tool.py`: ROI configuration



=================================================================================
Thêm 1 logic sau cho post lệnh:
Đọc file @slot_pairing_config. Với các cặp dual.
1.	Nếu trạng thái của cặp (start_qr và end_qrs). 
    1.1 Nếu start_qr ==1 và end_qrs ==0 và ổn định >20s thì sẽ xét tiếp trạng thái của start_qr_2. 
    1.1.1 Nếu start_qr_2 ==1 thì sẽ lưu cặp stable_dual vào queue nội dung (bao gồm 4 điểm QR code):
{
    "dual_id": "111-> 222-> 333-> 444",
    "start_slot": "111", 
    "end_slot": "222",
    "start_slot_2": "333", 
    "end_slot": "444",
    "stable_since": "2025-01-15T10:30:45Z"
}
   1.1.2 Else start_qr_2 ==0 thì sẽ lưu cặp stable_dual vào queue nội dung (bao gồm 2 điểm QR code):

    "dual_id": "111-> 222",
    "start_slot": "111", 
    "end_slot": "222",
    "stable_since": "2025-01-15T10:30:45Z"

VỀ CƠ CHẾ LOGIC LỆNH ĐÔI
1.	Cấu hình slot_...json:
     thêm điểm start_2
     thêm trường “dual”
 
2. File stable_.py
Truy vấn “slot_number” “camera_id” để xác định “start_qr_2” trong “dual” để xác nhận trạng thái 