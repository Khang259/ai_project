# Cơ Chế Lock/Unlock Trong Hệ Thống ROI

## Tổng Quan

Hệ thống sử dụng cơ chế lock/unlock để kiểm soát việc tái sử dụng các điểm start (ô shelf) trong quá trình xử lý pairs và dual pairs. Cơ chế này đảm bảo rằng một ô start không được sử dụng lại cho đến khi ô end tương ứng đã nhận được hàng hóa (shelf stable).

### Phân Loại Lock

1. **Normal Pairs (2 hoặc 3 điểm)**: KHÔNG lock - chỉ tracking
2. **Dual Pairs (2P hoặc 4P)**: CÓ lock - blocking required

---

## 1. CẤU TRÚC SQLITE VÀ QUEUE SYSTEM

### 1.1. SQLite Database Structure

Hệ thống sử dụng **1 database SQLite duy nhất** (`queues.db`) với **1 bảng duy nhất** (`messages`):

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- ID tự tăng (global order)
    topic TEXT NOT NULL,                   -- Tên topic (như channel/queue name)
    key TEXT NOT NULL,                     -- Key để phân loại (dual_id, camera_id, ...)
    payload TEXT NOT NULL,                 -- JSON string chứa data
    created_at TEXT NOT NULL               -- Timestamp ISO format
);

CREATE INDEX idx_messages_topic_key_time ON messages(topic, key, created_at);
```

**Lưu ý quan trọng:**
- **Topic KHÔNG PHẢI là bảng riêng**, mà là **1 giá trị trong cột `topic`**
- Mỗi message khi publish sẽ tạo **1 dòng mới** trong bảng `messages`
- Các components subscribe topic bằng cách query `WHERE topic = ?`

### 1.2. Publish/Subscribe Pattern

#### A. Publish Message (Ghi vào SQLite)

```python
# Trong SQLiteQueue class
def publish(self, topic: str, key: str, payload: Dict[str, Any]) -> None:
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    # Insert 1 dòng mới vào bảng messages
    INSERT INTO messages(topic, key, payload, created_at) 
    VALUES (topic, key, json.dumps(payload), now_iso)
```

**Ví dụ thực tế:**
```python
# Khi stable_pair_processor gửi dual block message
queue.publish(
    topic="dual_block",
    key="dual_101_201",  # dual_id
    payload={
        "dual_id": "dual_101_201",
        "start_qr": 101,
        "end_qrs": 201,
        "action": "block",
        "timestamp": "2024-11-12T10:30:15.123Z"
    }
)
```

**Kết quả trong SQLite:**
```
id | topic      | key           | payload                                    | created_at
---|------------|---------------|--------------------------------------------|-----------------------
45 | dual_block | dual_101_201  | {"dual_id":"dual_101_201","start_qr":101...} | 2024-11-12T10:30:15Z
```

#### B. Subscribe Topic (Đọc từ SQLite)

```python
# Trong roi_processor hoặc các components khác
def _subscribe_dual_blocking(self) -> None:
    # Track last processed ID
    last_block_id = 0
    
    while self.running:
        # Query messages mới từ SQLite
        SELECT id, payload FROM messages
        WHERE topic = 'dual_block' AND id > last_block_id
        ORDER BY id ASC
        LIMIT 50
        
        # Xử lý từng message
        for row in rows:
            msg_id = row[0]
            payload = json.loads(row[1])
            last_block_id = msg_id
            
            # Xử lý block logic
            self._handle_dual_block(payload)
        
        time.sleep(0.2)  # Poll mỗi 200ms
```

### 1.3. Topics Trong Hệ Thống Block/Unlock

| **Topic**              | **Publisher**              | **Subscriber**          | **Key**        | **Mục đích**                          |
|------------------------|----------------------------|-------------------------|----------------|---------------------------------------|
| `stable_dual`          | stable_pair_processor      | postAPI                 | dual_id        | Thông báo dual pair stable            |
| `dual_block`           | stable_pair_processor      | roi_processor           | dual_id        | Lệnh block start slot                 |
| `dual_unblock`         | stable_pair_processor      | roi_processor           | dual_id        | Lệnh unblock start slot               |
| `dual_unblock_trigger` | roi_processor              | stable_pair_processor   | dual_id        | Trigger unblock (end slot stable)     |
| `unlock_start_slot`    | postAPI                    | roi_processor           | start_qr (str) | Unlock thủ công (POST fail)           |

### 1.4. Message Flow Qua SQLite

```
[Component A] --> publish() --> [SQLite: INSERT vào messages] --> subscribe() --> [Component B]
                                      ↓
                                 Bảng messages:
                                 - id: auto increment
                                 - topic: "dual_block"
                                 - key: "dual_101_201"
                                 - payload: JSON
                                 - created_at: timestamp
```

**Ví dụ complete flow:**
```
1. stable_pair_processor.py
   └─> queue.publish("dual_block", "dual_101_201", {...})
       └─> SQLite INSERT: id=45, topic="dual_block", key="dual_101_201"

2. roi_processor.py (đang chạy loop subscribe)
   └─> SELECT * FROM messages WHERE topic='dual_block' AND id > 44
       └─> Nhận được row id=45
           └─> Parse payload JSON
               └─> _handle_dual_block(payload)
                   └─> Cập nhật self.blocked_slots["cam-1"][3] = math.inf
```

---

## 2. CÁC THÀNH PHẦN CHÍNH

### 2.1. Trong `roi_processor.py`

#### A. Biến Lưu Trữ Trạng Thái Block

```python
# Dictionary lưu trữ các slot đang bị block
# Cấu trúc: {camera_id: {slot_number: expire_epoch}}
self.blocked_slots: Dict[str, Dict[int, float]] = {}
```

**Ví dụ:**
```python
{
    "cam-1": {
        3: math.inf,  # Slot 3 trên cam-1 bị block vô thời hạn
        5: math.inf   # Slot 5 trên cam-1 bị block vô thời hạn
    },
    "cam-2": {
        1: math.inf   # Slot 1 trên cam-2 bị block vô thời hạn
    }
}
```

#### B. Thời Gian Block

```python
# Thời gian block mặc định - vô thời hạn
self.block_seconds: float = math.inf
```

- Block vô thời hạn (không tự hết hạn)
- Chỉ unlock khi end slot đạt điều kiện stable shelf

#### C. Mapping QR Code

```python
# Mapping QR code -> (camera_id, slot_number)
self.qr_to_slot: Dict[int, Tuple[str, int]] = {}
```

**Ví dụ:**
```python
{
    101: ("cam-1", 1),  # QR 101 -> Camera cam-1, Slot 1
    102: ("cam-1", 2),  # QR 102 -> Camera cam-1, Slot 2
    201: ("cam-2", 1),  # QR 201 -> Camera cam-2, Slot 1
}
```

#### D. End Slot Monitoring

```python
# Mapping end slot -> start slot để tracking unlock
self.end_to_start_mapping: Dict[Tuple[str, int], Tuple[str, int]] = {}

# Trạng thái shelf của end slots
# {(camera_id, slot_number): {'state': 'empty'|'shelf', 'first_shelf_time': timestamp}}
self.end_slot_states: Dict[Tuple[str, int], Dict[str, Any]] = {}

# Thời gian cần giữ shelf để unlock (giây)
self.shelf_stable_time: float = 10.0
```

**Ví dụ `end_to_start_mapping`:**
```python
{
    ("cam-2", 5): ("cam-1", 3),  # End slot (cam-2, 5) -> Start slot (cam-1, 3)
    ("cam-2", 6): ("cam-1", 4),  # End slot (cam-2, 6) -> Start slot (cam-1, 4)
}
```

**Ví dụ `end_slot_states`:**
```python
{
    ("cam-2", 5): {
        'state': 'shelf',           # Trạng thái hiện tại
        'first_shelf_time': 1699123456.78,  # Thời điểm bắt đầu có shelf
        'last_update_time': 1699123466.78   # Lần update cuối
    },
    ("cam-2", 6): {
        'state': 'empty',
        'first_shelf_time': None,
        'last_update_time': 1699123466.78
    }
}
```

#### E. Dual Blocking System (CHỈ CHO DUAL PAIRS)

```python
# Lưu thông tin dual pairs đã block
# {dual_id: {start_qr, end_qrs}}
self.dual_blocked_pairs: Dict[str, Dict[str, int]] = {}

# Mapping end slot -> dual_id để tracking
# {(camera_id, slot): dual_id}
self.dual_end_monitoring: Dict[Tuple[str, int], str] = {}
```

**Ví dụ `dual_blocked_pairs`:**
```python
{
    "dual_101_201": {
        "start_qr": 101,  # QR code của start
        "end_qrs": 201    # QR code của end
    },
    "dual_102_202": {
        "start_qr": 102,
        "end_qrs": 202
    }
}
```

#### F. Thread Lock

```python
# Lock để đảm bảo thread-safe khi truy cập các biến shared
self.cache_lock = threading.RLock()
```

---

### 2.2. Trong `stable_pair_processor.py`

#### A. Dual Blocking Variables

```python
# Lưu thông tin dual pairs đã block
self.dual_blocked_pairs: Dict[str, Dict[str, int]] = {}

# Trạng thái của end slots trong dual pairs
# {(camera_id, slot): {state, since}}
self.dual_end_states: Dict[Tuple[str, int], Dict[str, Any]] = {}
```

---

### 2.3. Queue Topics (Đã Giải Thích Ở Mục 1.3)

#### A. Topics Liên Quan Đến Blocking

```python
# Topics trong SQLiteQueue
"dual_block"              # Lệnh block một dual pair
"dual_unblock"            # Lệnh unblock một dual pair
"dual_unblock_trigger"    # Trigger từ roi_processor để unblock
"unlock_start_slot"       # Lệnh unlock start slot (từ postAPI khi POST fail)
```

---

## 3. TƯƠNG TÁC VỚI ROI MAPPING & BBOX

### 3.1. Vai Trò Của Block Trong Detection Processing

Khi một slot bị **block**, nó ảnh hưởng trực tiếp đến quá trình **mapping ROI với bounding boxes** trong `filter_detections_by_roi()`:

```python
# File: roi_processor.py - Hàm filter_detections_by_roi()

# Bước 1: YOLO phát hiện objects → Tạo bounding boxes (bbox)
detections = [
    {
        "class_name": "hang",
        "confidence": 0.85,
        "bbox": {"x1": 100, "y1": 150, "x2": 200, "y2": 250},
        "center": {"x": 150, "y": 200}
    },
    # ... more detections
]

# Bước 2: Lấy ROI slots từ cache
roi_slots = self.roi_cache.get(camera_id, [])  # Danh sách các ROI polygons

# Bước 3: Mapping bbox với ROI
for detection in detections:
    for i, slot in enumerate(roi_slots):
        slot_number = i + 1
        
        # Kiểm tra detection có nằm trong ROI không
        if self.is_detection_in_roi(detection, [slot]):
            
            # ⚠️ ĐIỂM QUAN TRỌNG: Kiểm tra slot có bị BLOCK không
            if self.blocked_slots.get(camera_id, {}).get(slot_number):
                # ❌ Slot BỊ BLOCK → BỎ QUA detection này
                # → Không thêm vào filtered_detections
                # → Sẽ tạo "empty" thay vì "shelf" cho slot này
                continue
            
            # ✅ Slot KHÔNG bị block → Thêm vào kết quả
            detection_with_slot = dict(detection)
            detection_with_slot["slot_number"] = slot_number
            filtered_detections.append(detection_with_slot)
            roi_has_shelf[i] = True
            break

# Bước 4: Tạo "empty" cho các slot bị block hoặc không có shelf
for i, slot in enumerate(roi_slots):
    slot_number = i + 1
    
    # Nếu slot bị BLOCK hoặc không có shelf → Tạo empty detection
    if slot_number in self.blocked_slots.get(camera_id, {}) or not roi_has_shelf[i]:
        empty_detection = {
            "class_name": "empty",
            "confidence": 0.0,
            "slot_number": slot_number,
            # ... bbox từ ROI polygon
        }
        filtered_detections.append(empty_detection)
```

### 3.2. Hiệu Ứng Blocking Lên Logic Processing

```
Trường Hợp 1: Slot KHÔNG bị block
=====================================
YOLO Detection → [shelf, confidence=0.85] 
                 ↓
ROI Mapping    → [Phát hiện nằm trong Slot 3]
                 ↓
Block Check    → ✅ Slot 3 KHÔNG bị block
                 ↓
Output         → [roi_detection: "shelf" tại Slot 3]
                 ↓
Logic          → Có thể tạo pair mới từ Slot 3


Trường Hợp 2: Slot BỊ block
=====================================
YOLO Detection → [shelf, confidence=0.85]
                 ↓
ROI Mapping    → [Phát hiện nằm trong Slot 3]
                 ↓
Block Check    → ❌ Slot 3 BỊ BLOCK (do đang trong dual pair)
                 ↓
Output         → [roi_detection: "empty" tại Slot 3]  ⚠️ BỊ GHI ĐÈ
                 ↓
Logic          → KHÔNG thể tạo pair mới từ Slot 3 (vì bị coi là empty)
```

### 3.3. Diagram: Blocking Flow Trong Detection Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ CAMERA FEED                                                     │
│ ┌──────────┐                                                    │
│ │  Video   │ → Frame → YOLO Detection                          │
│ └──────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ RAW DETECTIONS                                                  │
│ [shelf@bbox(100,150,200,250), shelf@bbox(300,200,400,300), ...] │
└─────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ ROI PROCESSOR - filter_detections_by_roi()                     │
│                                                                 │
│ 1. Load ROI Polygons từ cache                                  │
│    roi_slots = [{points: [[x1,y1], [x2,y2], ...]}, ...]       │
│                                                                 │
│ 2. Mapping Each Detection với ROI                              │
│    for detection in detections:                                │
│        for slot in roi_slots:                                  │
│            if point_in_polygon(detection.center, slot.points): │
│                                                                 │
│ 3. ⚠️ CHECK BLOCKING STATUS                                    │
│    if slot_number in self.blocked_slots[camera_id]:           │
│        → SKIP detection (treat as empty)                       │
│    else:                                                       │
│        → ADD to filtered_detections                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ ROI DETECTIONS (Sau khi filter + block logic)                  │
│                                                                 │
│ Slot 1: shelf (không bị block)                                 │
│ Slot 2: shelf (không bị block)                                 │
│ Slot 3: empty ⚠️ (BỊ BLOCK - dù YOLO phát hiện shelf)          │
│ Slot 4: empty (thật sự không có shelf)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ LOGIC PROCESSOR                                                 │
│                                                                 │
│ → Slot 3 bị coi là EMPTY                                       │
│ → KHÔNG thể tạo pair mới từ Slot 3                            │
│ → Ngăn chặn việc tái sử dụng slot đang trong dual pair        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. CƠ CHẾ LOCK (BLOCKING)

### 4.1. Dual Pairs Lock Flow

#### Bước 1: Phát Hiện Dual Pair (stable_pair_processor.py)

```python
def _check_dual_publish_condition(self, dual_config: Dict[str, int]) -> bool:
    # Kiểm tra các điều kiện:
    # 1. Start và End đều có shelf
    # 2. Shelf đã stable đủ thời gian (stable_seconds)
    # 3. Chưa publish trong cooldown_seconds gần đây
    # 4. Chưa publish trong phút hiện tại
```

#### Bước 2: Publish Dual Pair và Block Start

```python
def _publish_stable_dual(self, dual_config: Dict[str, int], stable_since_epoch: float) -> None:
    # 1. Tạo dual_id unique
    dual_id = f"dual_{start_qr}_{end_qrs}"
    
    # 2. Publish stable_dual message cho postAPI
    self.queue.publish("stable_dual", dual_id, payload)
    
    # 3. BLOCK start slot ngay sau khi publish
    self._publish_dual_block(dual_config, dual_id)
```

#### Bước 3: Gửi Block Message

```python
def _publish_dual_block(self, dual_config: Dict[str, int], dual_id: str) -> None:
    start_qr = dual_config["start_qr"]
    end_qrs = dual_config["end_qrs"]
    
    # Lưu thông tin dual đã block
    self.dual_blocked_pairs[dual_id] = {
        "start_qr": start_qr,
        "end_qrs": end_qrs
    }
    
    # Publish block message
    block_payload = {
        "dual_id": dual_id,
        "start_qr": start_qr,
        "end_qrs": end_qrs,
        "action": "block",
        "timestamp": utc_now_iso()
    }
    
    self.queue.publish("dual_block", dual_id, block_payload)
```

#### Bước 4: ROI Processor Nhận Block Message

```python
def _handle_dual_block(self, payload: Dict[str, Any]) -> None:
    dual_id = payload.get("dual_id")
    start_qr = int(payload.get("start_qr"))
    end_qrs = int(payload.get("end_qrs"))
    
    # Tìm camera và slot từ QR code
    start_cam_slot = self.qr_to_slot.get(start_qr)
    start_camera_id, start_slot_number = start_cam_slot
    
    # BLOCK ROI slot
    with self.cache_lock:
        if start_camera_id not in self.blocked_slots:
            self.blocked_slots[start_camera_id] = {}
        
        # Block vô thời hạn (math.inf)
        self.blocked_slots[start_camera_id][start_slot_number] = math.inf
    
    # Lưu thông tin dual đã block
    self.dual_blocked_pairs[dual_id] = {
        "start_qr": start_qr,
        "end_qrs": end_qrs
    }
    
    # Bắt đầu monitor end slot
    self._add_dual_end_slot_monitoring(dual_id, end_qrs)
```

---

### 4.2. Hiệu Ứng Của Block

#### A. Trong Detection Filtering

```python
def filter_detections_by_roi(self, detections: List[Dict], camera_id: str) -> List[Dict]:
    # ...
    for detection in detections:
        if detection.get("class_name") == "hang":
            for i, slot in enumerate(roi_slots):
                if self.is_detection_in_roi(detection, [slot]):
                    if detection.get("confidence", 0) >= 0.5:
                        # KIỂM TRA BLOCK
                        if self.blocked_slots.get(camera_id, {}).get(i + 1):
                            # ❌ Bị block: BỎ QUA shelf này
                            # → Sẽ tạo "empty" thay vì "shelf"
                            continue
                        
                        # ✅ Không bị block: Thêm vào filtered
                        filtered_detections.append(detection_with_slot)
                        roi_has_shelf[i] = True
    
    # Thêm "empty" cho các ROI bị block hoặc không có shelf
    for i, slot in enumerate(roi_slots):
        slot_number = i + 1
        if slot_number in self.blocked_slots.get(camera_id, {}) or not roi_has_shelf[i]:
            # ⚠️ Slot bị block → Tạo empty detection
            empty_detection = {
                "class_name": "empty",
                "confidence": max_confidence,
                "slot_number": slot_number,
                # ...
            }
            filtered_detections.append(empty_detection)
```

**Hiệu Ứng:**
- Slot bị block → LUÔN trả về `"empty"` dù có shelf thực tế
- Shelf trong slot bị block bị BỎ QUA
- Ngăn logic processor phát hiện pair mới từ slot này

---

## 5. CƠ CHẾ UNLOCK (UNBLOCKING)

### 5.1. Unlock Tự Động (End Slot Stable Shelf)

#### Bước 1: Monitoring End Slot State

```python
def _add_dual_end_slot_monitoring(self, dual_id: str, end_qr: int) -> None:
    end_slot = self.qr_to_slot.get(end_qr)
    camera_id, slot_number = end_slot
    
    # Khởi tạo trạng thái tracking
    with self.cache_lock:
        self.end_slot_states[end_slot] = {
            'state': 'empty',
            'first_shelf_time': None,
            'last_update_time': time.time(),
            'dual_id': dual_id  # ✅ Mark đây là dual monitoring
        }
```

#### Bước 2: Update End Slot State (Trong Detection Loop)

```python
def _update_end_slot_state(self, camera_id: str, slot_number: int, current_state: str) -> None:
    end_slot = (camera_id, slot_number)
    current_time = time.time()
    
    with self.cache_lock:
        if end_slot not in self.end_slot_states:
            return
        
        slot_state = self.end_slot_states[end_slot]
        previous_state = slot_state['state']
        
        # Cập nhật trạng thái
        slot_state['state'] = current_state
        slot_state['last_update_time'] = current_time
        
        # Xử lý chuyển đổi trạng thái
        if previous_state == 'empty' and current_state == 'shelf':
            # empty -> shelf: BẮT ĐẦU đếm thời gian
            slot_state['first_shelf_time'] = current_time
            print(f"[END_MONITOR] End slot {slot_number} trên {camera_id}: empty -> shelf (bắt đầu đếm)")
        
        elif previous_state == 'shelf' and current_state == 'empty':
            # shelf -> empty: RESET thời gian
            slot_state['first_shelf_time'] = None
            print(f"[END_MONITOR] End slot {slot_number} trên {camera_id}: shelf -> empty (reset)")
        
        elif current_state == 'shelf' and slot_state['first_shelf_time'] is not None:
            # Đang ở trạng thái shelf: KIỂM TRA thời gian stable
            shelf_duration = current_time - slot_state['first_shelf_time']
            
            if shelf_duration >= self.shelf_stable_time:  # Default: 10 giây
                # ✅ ĐỦ THỜI GIAN STABLE → UNLOCK
                
                if 'dual_id' in slot_state:
                    # Đây là dual monitoring
                    self._trigger_dual_unblock(slot_state['dual_id'], end_slot)
                else:
                    # Đây là regular monitoring (normal pairs)
                    self._unlock_start_slot(end_slot)
                
                # Reset để tránh unlock nhiều lần
                slot_state['first_shelf_time'] = None
```

#### Bước 3: Trigger Dual Unblock (roi_processor.py)

```python
def _trigger_dual_unblock(self, dual_id: str, end_slot: Tuple[str, int]) -> None:
    if dual_id not in self.dual_blocked_pairs:
        return
    
    blocked_info = self.dual_blocked_pairs[dual_id]
    start_qr = blocked_info["start_qr"]
    end_qrs = blocked_info["end_qrs"]
    
    # Tạo unblock payload
    unblock_payload = {
        "dual_id": dual_id,
        "start_qr": start_qr,
        "end_qrs": end_qrs,
        "action": "unblock",
        "reason": "end_shelf_stable_roi_processor",
        "timestamp": utc_now_iso(),
        "end_slot": f"{end_slot[0]}:{end_slot[1]}"
    }
    
    # Gửi message cho stable_pair_processor
    self.queue.publish("dual_unblock_trigger", dual_id, unblock_payload)
```

#### Bước 4: Stable Pair Processor Xử Lý Unblock

```python
def _subscribe_dual_unblock_trigger(self) -> None:
    # Subscribe "dual_unblock_trigger" topic
    # ...
    
    for message in messages:
        payload = message["payload"]
        dual_id = payload.get("dual_id")
        
        # Unblock dual start
        self._unblock_dual_start(dual_id)
```

```python
def _unblock_dual_start(self, dual_id: str) -> None:
    if dual_id not in self.dual_blocked_pairs:
        return
    
    blocked_info = self.dual_blocked_pairs[dual_id]
    start_qr = blocked_info["start_qr"]
    end_qrs = blocked_info["end_qrs"]
    
    # Publish unblock message cho roi_processor
    unblock_payload = {
        "dual_id": dual_id,
        "start_qr": start_qr,
        "end_qrs": end_qrs,
        "action": "unblock",
        "reason": "end_qrs_stable_shelf",
        "timestamp": utc_now_iso()
    }
    
    self.queue.publish("dual_unblock", dual_id, unblock_payload)
    
    # Xóa khỏi danh sách blocked
    del self.dual_blocked_pairs[dual_id]
```

#### Bước 5: ROI Processor Nhận Unblock Message

```python
def _handle_dual_unblock(self, payload: Dict[str, Any]) -> None:
    dual_id = payload.get("dual_id")
    start_qr = int(payload.get("start_qr"))
    
    if dual_id in self.dual_blocked_pairs:
        # Tìm camera và slot
        start_cam_slot = self.qr_to_slot.get(start_qr)
        start_camera_id, start_slot_number = start_cam_slot
        
        # UNBLOCK ROI slot
        with self.cache_lock:
            if start_camera_id in self.blocked_slots:
                if start_slot_number in self.blocked_slots[start_camera_id]:
                    del self.blocked_slots[start_camera_id][start_slot_number]
        
        # Xóa khỏi dual blocked pairs
        del self.dual_blocked_pairs[dual_id]
        
        # Xóa khỏi end monitoring
        for (cam, slot), monitored_dual_id in list(self.dual_end_monitoring.items()):
            if monitored_dual_id == dual_id:
                del self.dual_end_monitoring[(cam, slot)]
                break
        
        print(f"[DUAL_UNBLOCK] Đã unblock ROI slot {start_slot_number} trên {start_camera_id}")
```

---

### 5.2. Unlock Thủ Công (POST API Failed)

#### Bước 1: PostAPI Gửi Unlock Request (Sau Khi POST Fail 3 Lần)

```python
# Trong postAPI.py
def send_unlock_after_delay(queue: SQLiteQueue, pair_id: str, start_slot: str, 
                            delay_seconds: int = 60) -> None:
    def _delayed_unlock():
        time.sleep(delay_seconds)  # Đợi 60 giây
        
        try:
            unlock_payload = {
                "pair_id": pair_id,
                "start_slot": start_slot,  # QR code dạng string
                "reason": "post_failed_after_retries",
                "timestamp": datetime.now().isoformat()
            }
            
            # Gửi unlock message
            queue.publish("unlock_start_slot", start_slot, unlock_payload)
            
            print(f"[UNLOCK_SCHEDULED] Đã gửi unlock message cho start_slot={start_slot} sau {delay_seconds}s")
        except Exception as e:
            print(f"[ERR] Lỗi khi gửi unlock message: {e}")
    
    # Tạo thread để delay và gửi unlock
    thread = threading.Thread(target=_delayed_unlock, daemon=True)
    thread.start()
```

#### Bước 2: Trong Main Loop (Khi POST Fail)

```python
# Trong postAPI.py main() loop
if not ok:  # POST thất bại sau 3 lần retry
    fail_msg = f"✗ THẤT BẠI HOÀN TOÀN | {topic}={pair_id} | OrderID: {order_id}"
    print(fail_msg)
    
    # CHỈ unlock cho dual pairs (blocking required)
    if topic == "stable_dual":
        # Gửi unlock message sau 60 giây (DUAL ONLY)
        unlock_msg = f"[UNLOCK_SCHEDULE] Sẽ unlock start_slot={start_slot} sau 60 giây (DUAL ONLY)"
        print(unlock_msg)
        send_unlock_after_delay(queue, pair_id, start_slot, delay_seconds=60)
    else:
        # Normal pairs không block → không cần unlock
        no_unlock_msg = f"[NO_UNLOCK] Normal pairs không block → không cần unlock mechanism"
        print(no_unlock_msg)
```

#### Bước 3: ROI Processor Subscribe Unlock Topic

```python
def _subscribe_unlock_start_slot(self) -> None:
    # Subscribe "unlock_start_slot" topic
    # ...
    
    for message in messages:
        payload = message["payload"]
        start_qr_str = payload.get("start_slot")
        reason = payload.get("reason", "unknown")
        
        if start_qr_str:
            try:
                start_qr = int(start_qr_str)
                # Unlock start slot theo QR code
                self._unlock_start_by_qr(start_qr, reason=reason)
            except Exception:
                print(f"[UNLOCK_FAILED] Invalid start_qr: {start_qr_str}")
```

#### Bước 4: Unlock Theo QR Code

```python
def _unlock_start_by_qr(self, start_qr: int, reason: str = "manual") -> None:
    # Load lại mapping để đảm bảo mới nhất
    self._load_qr_mapping()
    
    # Lấy thông tin camera_id và slot_number từ QR code
    cam_slot = self.qr_to_slot.get(start_qr)
    if not cam_slot:
        print(f"[UNLOCK_FAILED] Không tìm thấy slot cho start_qr={start_qr}")
        return
    
    camera_id, slot_number = cam_slot
    
    # UNLOCK start slot
    with self.cache_lock:
        if camera_id in self.blocked_slots:
            if slot_number in self.blocked_slots[camera_id]:
                del self.blocked_slots[camera_id][slot_number]
                
                self.block_logger.info(f"UNLOCK_BY_QR_SUCCESS: camera={camera_id}, slot={slot_number}, qr={start_qr}, reason={reason}")
                print(f"[UNLOCK_BY_QR] Đã unlock start slot {slot_number} trên {camera_id} (QR: {start_qr}, reason: {reason})")
                
                # Xóa end slot khỏi monitoring
                start_slot_tuple = (camera_id, slot_number)
                for end_slot, start_slot in self.end_to_start_mapping.items():
                    if start_slot == start_slot_tuple:
                        if end_slot in self.end_slot_states:
                            del self.end_slot_states[end_slot]
                            print(f"[UNLOCK_BY_QR] Đã xóa end slot {end_slot} khỏi monitoring")
                        break
```

---

## 6. FLOW DIAGRAM

### 6.1. Dual Pair Lock Flow

```
1. StablePairProcessor
   └─> Phát hiện dual pair stable
       └─> Publish "stable_dual" message
           └─> Gọi _publish_dual_block()
               └─> Lưu vào self.dual_blocked_pairs
               └─> Publish "dual_block" message

2. ROIProcessor
   └─> Subscribe "dual_block" topic
       └─> _handle_dual_block()
           └─> Cập nhật self.blocked_slots[camera_id][slot_number] = math.inf
           └─> Lưu vào self.dual_blocked_pairs
           └─> Bắt đầu monitoring end slot

3. Detection Loop
   └─> filter_detections_by_roi()
       └─> Kiểm tra if slot in self.blocked_slots
           └─> ❌ Bị block → BỎ QUA shelf → Tạo "empty"
           └─> ✅ Không block → Thêm vào filtered
```

### 6.2. Dual Pair Unlock Flow (End Slot Stable Shelf)

```
1. ROIProcessor Detection Loop
   └─> Phát hiện end slot có shelf
       └─> _update_end_slot_state(camera_id, slot_number, "shelf")
           └─> Nếu shelf_duration >= shelf_stable_time (10s)
               └─> _trigger_dual_unblock(dual_id, end_slot)
                   └─> Publish "dual_unblock_trigger" message

2. StablePairProcessor
   └─> Subscribe "dual_unblock_trigger" topic
       └─> _unblock_dual_start(dual_id)
           └─> Publish "dual_unblock" message
           └─> Xóa khỏi self.dual_blocked_pairs

3. ROIProcessor
   └─> Subscribe "dual_unblock" topic
       └─> _handle_dual_unblock()
           └─> Xóa khỏi self.blocked_slots[camera_id][slot_number]
           └─> Xóa khỏi self.dual_blocked_pairs
           └─> Xóa khỏi end monitoring
```

### 6.3. Unlock Flow (POST API Failed)

```
1. PostAPI (sau 3 lần retry POST thất bại)
   └─> Chỉ áp dụng cho dual pairs
       └─> send_unlock_after_delay(queue, pair_id, start_slot, 60s)
           └─> Thread đợi 60 giây
               └─> Publish "unlock_start_slot" message

2. ROIProcessor
   └─> Subscribe "unlock_start_slot" topic
       └─> _unlock_start_by_qr(start_qr, reason="post_failed_after_retries")
           └─> Xóa khỏi self.blocked_slots[camera_id][slot_number]
           └─> Xóa end slot khỏi monitoring
```

---

## 7. SỰ KHÁC BIỆT: NORMAL PAIRS vs DUAL PAIRS

| **Aspect**              | **Normal Pairs (2/3 điểm)** | **Dual Pairs (2P/4P)** |
|-------------------------|----------------------------|------------------------|
| **Block start slot?**   | ❌ KHÔNG                    | ✅ CÓ                   |
| **End slot monitoring** | ✅ Track (optional)        | ✅ Track (required)    |
| **Unlock mechanism**    | Không cần                  | 2 cách: Auto + Manual  |
| **postAPI unlock**      | ❌ KHÔNG gửi unlock        | ✅ Gửi unlock nếu POST fail |
| **blocking_slots**      | Không sử dụng              | Sử dụng                |
| **dual_blocked_pairs**  | Không sử dụng              | Sử dụng                |

---

## 8. LOGGING

### 8.1. Block Logs

```
# Trong roi_processor.py
self.block_logger.info(f"DUAL_BLOCK_SUCCESS: dual_id={dual_id}, camera={camera_id}, slot={slot_number}, start_qr={start_qr}, end_qrs={end_qrs}")
```

**File:** `logs/block_unblock.log`

**Ví dụ:**
```
2024-11-12 10:30:15 - block_unblock - INFO - DUAL_BLOCK_SUCCESS: dual_id=dual_101_201, camera=cam-1, slot=3, start_qr=101, end_qrs=201
```

### 8.2. Unlock Logs

```
# Unlock tự động (end slot stable shelf)
self.block_logger.info(f"DUAL_UNBLOCK_TRIGGER: dual_id={dual_id}, end_camera={end_camera}, end_slot={end_slot}, start_qr={start_qr}, end_qrs={end_qrs}")

# Unlock thủ công (POST fail)
self.block_logger.info(f"UNLOCK_BY_QR_SUCCESS: camera={camera_id}, slot={slot_number}, qr={start_qr}, reason={reason}")
```

**Ví dụ:**
```
2024-11-12 10:30:25 - block_unblock - INFO - DUAL_UNBLOCK_TRIGGER: dual_id=dual_101_201, end_camera=cam-2, end_slot=5, start_qr=101, end_qrs=201
2024-11-12 10:31:15 - block_unblock - INFO - UNLOCK_BY_QR_SUCCESS: camera=cam-1, slot=3, qr=101, reason=post_failed_after_retries
```

---

## 9. VÍ DỤ THỰC TẾ

### Ví Dụ 1: Dual Pair Lock/Unlock Thành Công

**Giả sử:**
- Start QR: 101 (cam-1, slot 3)
- End QR: 201 (cam-2, slot 5)

**Timeline:**

```
T=0s:   StablePairProcessor phát hiện dual pair stable
        → Publish "stable_dual" message
        → Publish "dual_block" message

T=0.1s: ROIProcessor nhận "dual_block"
        → blocked_slots["cam-1"][3] = math.inf
        → dual_blocked_pairs["dual_101_201"] = {start_qr: 101, end_qrs: 201}
        → Bắt đầu monitoring end slot (cam-2, 5)

T=5s:   Detection loop phát hiện slot 3 có shelf
        → Nhưng slot 3 bị block
        → BỎ QUA shelf → Tạo "empty" thay thế
        → Logic processor KHÔNG phát hiện pair mới từ slot 3 ✅

T=15s:  End slot (cam-2, 5) nhận được hàng (shelf)
        → end_slot_states[(cam-2, 5)]['state'] = 'shelf'
        → end_slot_states[(cam-2, 5)]['first_shelf_time'] = 15s

T=25s:  Shelf đã stable 10 giây (25s - 15s = 10s)
        → _trigger_dual_unblock()
        → Publish "dual_unblock_trigger" message

T=25.1s: StablePairProcessor nhận "dual_unblock_trigger"
        → _unblock_dual_start()
        → Publish "dual_unblock" message

T=25.2s: ROIProcessor nhận "dual_unblock"
        → del blocked_slots["cam-1"][3]
        → del dual_blocked_pairs["dual_101_201"]
        → Xóa end slot monitoring

T=26s:  Slot 3 đã được unlock ✅
        → Có thể tham gia vào pair mới
```

### Ví Dụ 2: Dual Pair + POST Fail → Unlock Thủ Công

**Timeline:**

```
T=0s:   Dual pair được publish và block (tương tự ví dụ 1)

T=1s:   postAPI nhận "stable_dual" message
        → Gửi POST request lần 1 → FAILED
        → Retry sau 2s

T=3s:   POST request lần 2 → FAILED
        → Retry sau 2s

T=5s:   POST request lần 3 → FAILED
        → Không còn retry
        → Gọi send_unlock_after_delay(pair_id, start_slot="101", 60s)

T=65s:  Thread unlock đợi đủ 60 giây
        → Publish "unlock_start_slot" message với start_slot="101"

T=65.1s: ROIProcessor nhận "unlock_start_slot"
        → _unlock_start_by_qr(start_qr=101, reason="post_failed_after_retries")
        → del blocked_slots["cam-1"][3]
        → Xóa end slot monitoring

T=66s:  Slot 3 đã được unlock thủ công ✅
```

---

## 10. THREAD SAFETY

### 10.1. RLock (Reentrant Lock)

```python
# Khởi tạo trong __init__
self.cache_lock = threading.RLock()

# Sử dụng
with self.cache_lock:
    # Truy cập các biến shared
    self.blocked_slots[camera_id][slot_number] = math.inf
    self.dual_blocked_pairs[dual_id] = {...}
    self.end_slot_states[end_slot] = {...}
```

**Tại sao dùng RLock?**
- Cho phép cùng thread acquire lock nhiều lần (reentrant)
- Tránh deadlock khi function gọi function khác trong cùng thread
- Đảm bảo thread-safe khi nhiều threads truy cập shared variables

---

## 11. TÓM TẮT

### 11.1. Biến Chính

| **Biến**                  | **Mục Đích**                                  | **File**             |
|---------------------------|-----------------------------------------------|----------------------|
| `blocked_slots`           | Lưu trạng thái block của mỗi slot           | roi_processor.py     |
| `dual_blocked_pairs`      | Lưu thông tin dual pairs đã block            | roi_processor.py, stable_pair_processor.py |
| `end_slot_states`         | Theo dõi trạng thái shelf của end slots     | roi_processor.py     |
| `qr_to_slot`              | Mapping QR code → (camera_id, slot_number)   | roi_processor.py, stable_pair_processor.py |
| `cache_lock`              | Thread lock để đảm bảo thread-safe          | roi_processor.py     |

### 11.2. Queue Topics

| **Topic**                 | **Mục Đích**                                  | **Publisher**              | **Subscriber**      |
|---------------------------|-----------------------------------------------|----------------------------|---------------------|
| `stable_dual`             | Thông báo dual pair stable                   | stable_pair_processor      | postAPI             |
| `dual_block`              | Lệnh block start slot                        | stable_pair_processor      | roi_processor       |
| `dual_unblock`            | Lệnh unblock start slot                      | stable_pair_processor      | roi_processor       |
| `dual_unblock_trigger`    | Trigger unblock từ ROI processor             | roi_processor              | stable_pair_processor |
| `unlock_start_slot`       | Lệnh unlock thủ công (POST fail)             | postAPI                    | roi_processor       |

### 11.3. Flow Chính

1. **Lock:** stable_pair_processor → `dual_block` → roi_processor → `blocked_slots` cập nhật
2. **Unlock Auto:** roi_processor (end slot stable) → `dual_unblock_trigger` → stable_pair_processor → `dual_unblock` → roi_processor → `blocked_slots` xóa
3. **Unlock Manual:** postAPI (POST fail) → `unlock_start_slot` → roi_processor → `blocked_slots` xóa

---

## 12. LƯU Ý QUAN TRỌNG

1. **Normal Pairs KHÔNG lock**: Chỉ dual pairs mới sử dụng blocking mechanism
2. **Block vô thời hạn**: `math.inf` - không tự hết hạn, chỉ unlock theo 2 cách:
   - End slot stable shelf (auto)
   - POST API failed (manual)
3. **Thread-safe**: Luôn dùng `with self.cache_lock:` khi truy cập shared variables
4. **Monitoring required**: End slot monitoring là bắt buộc để unlock được
5. **Logging**: Tất cả block/unblock operations đều được log vào `logs/block_unblock.log`

---

## 13. DEBUG & TROUBLESHOOTING

### Kiểm Tra Slot Có Bị Block Không

```python
# Trong roi_processor
camera_id = "cam-1"
slot_number = 3

if slot_number in self.blocked_slots.get(camera_id, {}):
    print(f"Slot {slot_number} trên {camera_id} ĐANG BỊ BLOCK")
    expire_time = self.blocked_slots[camera_id][slot_number]
    print(f"Expire time: {expire_time}")  # math.inf = vô thời hạn
else:
    print(f"Slot {slot_number} trên {camera_id} KHÔNG BỊ BLOCK")
```

### Kiểm Tra End Slot Monitoring

```python
# Trong roi_processor
end_slot = ("cam-2", 5)

if end_slot in self.end_slot_states:
    state_info = self.end_slot_states[end_slot]
    print(f"End slot {end_slot}:")
    print(f"  State: {state_info['state']}")
    print(f"  First shelf time: {state_info['first_shelf_time']}")
    
    if state_info['first_shelf_time']:
        duration = time.time() - state_info['first_shelf_time']
        print(f"  Shelf duration: {duration:.2f}s / {self.shelf_stable_time}s")
else:
    print(f"End slot {end_slot} KHÔNG ĐƯỢC MONITOR")
```

### Kiểm Tra Dual Blocked Pairs

```python
# Trong roi_processor hoặc stable_pair_processor
for dual_id, info in self.dual_blocked_pairs.items():
    print(f"Dual {dual_id}:")
    print(f"  Start QR: {info['start_qr']}")
    print(f"  End QRs: {info['end_qrs']}")
```

---

**Tài liệu này mô tả chi tiết cơ chế lock/unlock trong hệ thống ROI. Để hiểu rõ hơn, vui lòng tham khảo source code tại `roi_processor.py`, `stable_pair_processor.py`, và `postAPI.py`.**

