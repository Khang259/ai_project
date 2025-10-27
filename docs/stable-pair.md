# PHÂN TÍCH CHI TIẾT: StablePairProcessor

## 📋 MỤC LỤC
1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Các hàm tiện ích (Utility Functions)](#2-các-hàm-tiện-ích-utility-functions)
3. [Hệ thống Logger](#3-hệ-thống-logger)
4. [Class StablePairProcessor](#4-class-stablepairprocessor)
5. [Cơ chế hoạt động](#5-cơ-chế-hoạt-động)
6. [Luồng xử lý dữ liệu](#6-luồng-xử-lý-dữ-liệu)
7. [Sơ đồ quan hệ](#7-sơ-đồ-quan-hệ)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục đích
**StablePairProcessor** là một hệ thống xử lý và phát hiện các cặp slot (pair) ổn định trong một hệ thống giám sát kho hàng tự động. Hệ thống giám sát trạng thái của các slot (có kệ/trống) và phát hiện các cặp slot đáp ứng điều kiện:
- **Start slot**: có kệ (shelf) ổn định
- **End slot**: trống (empty) ổn định

### 1.2 Các loại Pair
1. **Normal Pair (2 điểm)**: `start_qr -> end_qr`
   - 1 start slot có shelf
   - 1 hoặc nhiều end slot empty
   
2. **Dual Pair 2P (2 điểm)**: `start_qr -> end_qrs`
   - 1 start slot có shelf
   - 1 end slot empty
   - start_qr_2 phải empty (hoặc không tồn tại)
   
3. **Dual Pair 4P (4 điểm)**: `start_qr -> end_qrs -> start_qr_2 -> end_qrs_2`
   - 1 start slot có shelf
   - 1 end slot empty
   - start_qr_2 cũng có shelf

### 1.3 Thông số chính
- **stable_seconds**: Thời gian cần giữ trạng thái ổn định (mặc định: 10s)
- **cooldown_seconds**: Thời gian chờ giữa các lần publish cùng 1 pair (mặc định: 5s)

---

## 2. CÁC HÀM TIỆN ÍCH (UTILITY FUNCTIONS)

### 2.1 `utc_now_iso()` - Hàm lấy thời gian UTC

```python
def utc_now_iso() -> str:
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
```

**Mục đích**: Trả về timestamp UTC hiện tại theo format ISO 8601

**Output**: 
- Format: `"YYYY-MM-DDTHH:MM:SS.ffffffZ"`
- Ví dụ: `"2024-01-15T14:30:45.123456Z"`

**Ứng dụng**: Ghi timestamp cho các sự kiện publish, logging

---

### 2.2 `is_point_in_polygon()` - Kiểm tra điểm trong đa giác

```python
def is_point_in_polygon(point: Tuple[float, float], polygon: List[List[int]]) -> bool:
```

**Thuật toán**: Ray Casting Algorithm

**Input**:
- `point`: Tuple `(x, y)` - tọa độ điểm cần kiểm tra
- `polygon`: List các đỉnh `[[x1,y1], [x2,y2], ...]` - định nghĩa đa giác

**Output**: `True` nếu điểm nằm trong đa giác, `False` nếu ngoài

**Nguyên lý Ray Casting**:
1. Vẽ tia từ điểm cần test theo chiều ngang (+x)
2. Đếm số lần tia cắt cạnh đa giác
3. Nếu số lần cắt = lẻ → điểm TRONG đa giác
4. Nếu số lần cắt = chẵn → điểm NGOÀI đa giác

**Lưu ý**: Hiện tại hàm này không được sử dụng trong code (comment: "No ROI polygons dependency anymore")

---

## 3. HỆ THỐNG LOGGER

### 3.1 `setup_pair_publish_logger()` - Logger cho Pair Publishing

**Mục đích**: Ghi log các sự kiện publish pair thành công

**Cấu hình**:
- File log: `../logs/pair_publish.log`
- Max size: 5MB
- Backup count: 3 files
- Level: INFO
- Format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`

**Log events**:
- `STABLE_PAIR_PUBLISHED`: Normal pair được publish
- `STABLE_DUAL_2P_PUBLISHED`: Dual 2P được publish
- `STABLE_DUAL_4P_PUBLISHED`: Dual 4P được publish

**Ví dụ log**:
```
2024-01-15 14:30:45 - pair_publish - INFO - STABLE_PAIR_PUBLISHED: pair_id=101 -> 201, start_slot=101, end_slot=201, stable_since=2024-01-15T14:30:35.000000Z
```

---

### 3.2 `setup_block_unblock_logger()` - Logger cho Block/Unblock Operations

**Mục đích**: Ghi log các thao tác block/unblock start_qr trong dual pairs

**Cấu hình**: Giống như pair_publish_logger, nhưng file: `block_unblock.log`

**Log events**:
- `DUAL_BLOCK_PUBLISHED`: Block start_qr khi phát hiện dual pair
- `DUAL_UNBLOCK_PUBLISHED`: Unblock start_qr khi end_qrs đã stable shelf

**Ví dụ log**:
```
2024-01-15 14:30:45 - block_unblock - INFO - DUAL_BLOCK_PUBLISHED: dual_id=101-> 201, start_qr=101, end_qrs=201, action=block
2024-01-15 14:31:00 - block_unblock - INFO - DUAL_UNBLOCK_PUBLISHED: dual_id=101-> 201, start_qr=101, end_qrs=201, reason=end_qrs_stable_shelf
```

---

## 4. CLASS STABLEPAIRPROCESSOR

### 4.1 `__init__()` - Khởi tạo

```python
def __init__(self, db_path: str = "../queues.db", 
             config_path: str = "slot_pairing_config.json",
             stable_seconds: float = 10.0, 
             cooldown_seconds: float = 5.0) -> None:
```

**Tham số**:
| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `db_path` | str | `"../queues.db"` | Đường dẫn đến SQLite database chứa queue messages |
| `config_path` | str | `"slot_pairing_config.json"` | File cấu hình pairing (starts, ends, pairs, dual) |
| `stable_seconds` | float | `10.0` | Thời gian (giây) trạng thái phải ổn định trước khi publish |
| `cooldown_seconds` | float | `5.0` | Thời gian (giây) chờ giữa các lần publish cùng pair |

**Các biến state**:

1. **Slot State Tracking**:
```python
self.slot_state: Dict[str, Dict[str, Any]] = {}
# Format: {"cam-1:5": {"status": "shelf", "since": 1705330245.123}}
```
- Key: `"camera_id:slot_number"`
- Value: Dictionary với `status` ("shelf"/"empty") và `since` (epoch time)

2. **Pair Publishing Control**:
```python
self.published_at: Dict[str, float] = {}
# Format: {"101 -> 201": 1705330245.123}
# Lưu thời điểm publish gần nhất của mỗi pair_id
```

3. **Minute-based Deduplication**:
```python
self.published_by_minute: Dict[str, Dict[str, bool]] = {}
# Format: {"101 -> 201": {"2024-01-15 14:30": True, "2024-01-15 14:31": True}}
# Tránh publish trùng trong cùng 1 phút
```

4. **Pairing Configuration**:
```python
self.qr_to_slot: Dict[int, Tuple[str, int]] = {}
# Format: {101: ("cam-1", 5)} - Map QR code → (camera_id, slot_number)

self.pairs: List[Tuple[int, List[int]]] = []
# Format: [(101, [201, 202, 203])] - (start_qr, [end_qrs])
```

5. **Dual Pairing**:
```python
self.dual_pairs: List[Dict[str, int]] = []
# Format: [{"start_qr": 101, "end_qrs": 201, "start_qr_2": 102, "end_qrs_2": 202}]

self.dual_blocked_pairs: Dict[str, Dict[str, int]] = {}
# Format: {"101-> 201": {"start_qr": 101, "end_qrs": 201}}
# Lưu các dual pair đang bị block

self.dual_end_states: Dict[Tuple[str, int], Dict[str, Any]] = {}
# Format: {("cam-1", 5): {"state": "empty", "since": 1705330245, "dual_id": "101-> 201", "stable_time": 10.0}}
# Monitor trạng thái end_qrs để unblock
```

---

### 4.2 `_load_pairing_config()` - Load cấu hình pairing

**File config format** (`slot_pairing_config.json`):
```json
{
  "starts": [
    {"qr_code": 101, "camera_id": "cam-1", "slot_number": 5}
  ],
  "starts_2": [
    {"qr_code": 102, "camera_id": "cam-1", "slot_number": 6}
  ],
  "ends": [
    {"qr_code": 201, "camera_id": "cam-2", "slot_number": 3},
    {"qr_code": 202, "camera_id": "cam-2", "slot_number": 4}
  ],
  "pairs": [
    {"start_qr": 101, "end_qrs": [201, 202]}
  ],
  "dual": [
    {
      "start_qr": 101,
      "end_qrs": 201,
      "start_qr_2": 102,
      "end_qrs_2": 202
    }
  ]
}
```

**Xử lý**:
1. Load JSON file
2. Build `qr_to_slot` mapping từ 3 nguồn: `starts`, `starts_2`, `ends`
3. Normalize `pairs`: đảm bảo `end_qrs` luôn là list
4. Load `dual_pairs` configuration
5. Log thống kê: số lượng QR mappings, pairs, dual pairs

**Error handling**: Raise exception nếu file không tồn tại hoặc format sai

---

### 4.3 `_iter_roi_detections()` - Liệt kê cameras có dữ liệu

```python
def _iter_roi_detections(self) -> List[str]:
```

**Mục đích**: Lấy danh sách tất cả camera_id có message trong topic `roi_detection`

**Query**:
```sql
SELECT DISTINCT key FROM messages 
WHERE topic = 'roi_detection' 
ORDER BY key
```

**Output**: List camera IDs, ví dụ: `["cam-1", "cam-2", "cam-3"]`

---

### 4.4 `_compute_slot_statuses()` - Tính trạng thái slot từ detections

```python
def _compute_slot_statuses(self, camera_id: str, roi_detections: List[Dict[str, Any]]) -> Dict[int, str]:
```

**Input**:
- `camera_id`: ID của camera
- `roi_detections`: List các detection objects từ roi_processor
  ```python
  [
    {"class_name": "shelf", "slot_number": 5, ...},
    {"class_name": "empty", "slot_number": 6, ...}
  ]
  ```

**Xử lý**:
1. Duyệt qua từng detection
2. Lấy `class_name` và `slot_number`
3. Nếu `class_name == "shelf"` → gán `status_by_slot[slot_num] = "shelf"`
4. Nếu `class_name == "empty"` và slot chưa có shelf → gán `"empty"`

**Output**: Dictionary `{slot_number: status}`
```python
{5: "shelf", 6: "empty", 7: "shelf"}
```

**Quy tắc ưu tiên**: `shelf` > `empty` (nếu cùng frame thấy cả 2, ưu tiên shelf)

---

### 4.5 `_update_slot_state()` - Cập nhật state của slot

```python
def _update_slot_state(self, camera_id: str, status_by_slot: Dict[int, str]) -> None:
```

**Input**:
- `camera_id`: Camera ID
- `status_by_slot`: Dictionary slot status từ `_compute_slot_statuses()`

**Logic**:
```python
for slot_num, status in status_by_slot.items():
    key = f"{camera_id}:{slot_num}"  # Ví dụ: "cam-1:5"
    prev = self.slot_state.get(key)
    
    if prev is None:
        # Slot chưa có state → tạo mới
        self.slot_state[key] = {"status": status, "since": now}
    else:
        if prev["status"] != status:
            # Trạng thái thay đổi → reset timer
            self.slot_state[key] = {"status": status, "since": now}
        else:
            # Trạng thái không đổi → giữ nguyên "since" (quan trọng!)
            pass
```

**Ví dụ timeline**:
```
t=0s:  slot "cam-1:5" = empty      → {"status": "empty", "since": 0}
t=5s:  slot "cam-1:5" = empty      → {"status": "empty", "since": 0} (không đổi)
t=10s: slot "cam-1:5" = shelf      → {"status": "shelf", "since": 10} (reset)
t=15s: slot "cam-1:5" = shelf      → {"status": "shelf", "since": 10} (không đổi)
t=20s: slot "cam-1:5" = shelf      → {"status": "shelf", "since": 10} (stable!)
```

---

### 4.6 `_is_slot_stable()` - Kiểm tra slot có stable không

```python
def _is_slot_stable(self, camera_id: str, slot_number: int, expect_status: str) -> Tuple[bool, Optional[float]]:
```

**Input**:
- `camera_id`: Camera ID
- `slot_number`: Slot number
- `expect_status`: Trạng thái mong đợi (`"shelf"` hoặc `"empty"`)

**Output**: Tuple `(is_stable, since_epoch)`
- `is_stable`: `True` nếu slot đã stable đủ thời gian với trạng thái mong đợi
- `since_epoch`: Epoch time khi bắt đầu stable (nếu stable), hoặc `None`

**Logic**:
```python
key = f"{camera_id}:{slot_number}"
st = self.slot_state.get(key)

# Không có state → không stable
if not st:
    return False, None

# State khác với mong đợi → không stable
if st["status"] != expect_status:
    return False, None

# Tính thời gian đã giữ trạng thái
now = time.time()
duration = now - st["since"]

# Kiểm tra đã đủ stable_seconds chưa
stable = duration >= self.stable_seconds
return stable, st["since"] if stable else None
```

**Ví dụ**:
```python
# Giả sử stable_seconds = 10.0
# t=0: slot chuyển sang "shelf"
# t=5: _is_slot_stable() → (False, None) - chưa đủ 10s
# t=10: _is_slot_stable() → (True, 0) - đã stable
# t=15: _is_slot_stable() → (True, 0) - vẫn stable
```

---

### 4.7 Hệ thống Minute-based Deduplication

#### 4.7.1 `_get_minute_key()` - Convert epoch sang minute key

```python
def _get_minute_key(self, epoch_seconds: float) -> str:
```

**Mục đích**: Tạo key theo phút để tracking publish

**Input**: `1705330245.123` (epoch seconds)

**Output**: `"2024-01-15 14:30"` (YYYY-MM-DD HH:MM)

**Ứng dụng**: Tránh publish trùng lặp trong cùng 1 phút

---

#### 4.7.2 `_is_already_published_this_minute()` - Kiểm tra đã publish trong phút này chưa

```python
def _is_already_published_this_minute(self, pair_id: str, stable_since_epoch: float) -> bool:
```

**Logic**:
```python
minute_key = self._get_minute_key(stable_since_epoch)  # "2024-01-15 14:30"

if pair_id not in self.published_by_minute:
    self.published_by_minute[pair_id] = {}

# Check xem minute_key có trong dict không
return minute_key in self.published_by_minute[pair_id]
```

**Ví dụ**:
```python
# pair_id = "101 -> 201"
# published_by_minute["101 -> 201"] = {"2024-01-15 14:30": True}
# 
# Lần 1 (14:30:10): Check → False → Publish
# Lần 2 (14:30:45): Check → True → Skip (đã publish rồi)
# Lần 3 (14:31:05): Check → False → Publish (phút mới)
```

---

#### 4.7.3 `_mark_published_this_minute()` - Đánh dấu đã publish

```python
def _mark_published_this_minute(self, pair_id: str, stable_since_epoch: float) -> None:
```

**Logic**: Ghi nhận pair_id đã được publish trong minute này
```python
minute_key = self._get_minute_key(stable_since_epoch)
self.published_by_minute[pair_id][minute_key] = True
```

---

### 4.8 `_maybe_publish_pair()` - Publish Normal Pair

```python
def _maybe_publish_pair(self, start_qr: int, end_qr: int, stable_since_epoch: float, 
                        all_empty_end_qrs: Optional[List[int]] = None) -> None:
```

**Tham số**:
- `start_qr`: QR code của start slot (đang shelf)
- `end_qr`: QR code của end slot được chọn để publish (đang empty)
- `stable_since_epoch`: Thời điểm stable (epoch seconds)
- `all_empty_end_qrs`: List TẤT CẢ các end_qrs đang empty (optional)

**Logic kiểm tra trước khi publish**:

1. **Check minute-based deduplication**:
```python
if self._is_already_published_this_minute(pair_id, stable_since_epoch):
    return  # Đã publish trong phút này → skip
```

2. **Check cooldown**:
```python
last_pub = self.published_at.get(pair_id, 0.0)
now = time.time()
if now - last_pub < self.cooldown_seconds:
    return  # Chưa đủ cooldown → skip
```

3. **Mark published và update cooldown**:
```python
self._mark_published_this_minute(pair_id, stable_since_epoch)
self.published_at[pair_id] = now
```

**Payload**:
```python
payload = {
    "pair_id": "101 -> 201",
    "start_slot": "101",
    "end_slot": "201",
    "stable_since": "2024-01-15T14:30:35.000000Z"
}

# Nếu có nhiều end_qrs empty:
payload["all_empty_end_slots"] = ["201", "202", "203"]
payload["is_all_empty"] = True
```

**Publish**: `self.queue.publish("stable_pairs", pair_id, payload)`

**Logging**:
```
STABLE_PAIR_PUBLISHED: pair_id=101 -> 201, start_slot=101, end_slot=201, all_empty_end_slots=[201, 202], stable_since=2024-01-15T14:30:35.000000Z
```

---

### 4.9 Dual Pair System - Hệ thống xử lý Dual Pairs

#### 4.9.1 `_evaluate_dual_pairs()` - Logic đánh giá Dual Pairs

**Mục đích**: Quyết định publish 2P hay 4P dựa trên trạng thái của 2 cặp slots

**Logic chi tiết**:

```
BƯỚC 1: Kiểm tra cặp chính (start_qr, end_qrs)
├─ Điều kiện: start_qr == shelf (stable) AND end_qrs == empty (stable)
├─ Nếu KHÔNG đạt → SKIP (không xét tiếp)
└─ Nếu ĐẠT → Chuyển sang BƯỚC 2

BƯỚC 2: Kiểm tra start_qr_2
├─ Nếu start_qr_2 KHÔNG TỒN TẠI trong config
│  └─→ PUBLISH 2P
│
├─ Nếu start_qr_2 == shelf (stable)
│  └─→ PUBLISH 4P
│
└─ Nếu start_qr_2 == empty (stable)
   └─→ PUBLISH 2P
   
└─ Nếu start_qr_2 KHÔNG STABLE (không phải shelf cũng không phải empty stable)
   └─→ KHÔNG PUBLISH
```

**Code implementation**:
```python
for dual_config in self.dual_pairs:
    start_qr = dual_config["start_qr"]
    end_qrs = dual_config["end_qrs"]
    start_qr_2 = dual_config["start_qr_2"]
    end_qrs_2 = dual_config["end_qrs_2"]
    
    # BƯỚC 1: Check cặp chính
    start_ok, start_since = self._is_slot_stable(start_cam, start_slot, "shelf")
    if not start_ok:
        continue  # start_qr không shelf → skip
    
    end_ok, end_since = self._is_slot_stable(end_cam, end_slot, "empty")
    if not end_ok:
        continue  # end_qrs không empty → skip
    
    print(f"[DUAL_LOGIC] Cặp chính OK: start_qr={start_qr} (shelf), end_qrs={end_qrs} (empty)")
    
    # BƯỚC 2: Check start_qr_2
    if not start_cam_slot_2:
        # Không có start_qr_2 → Publish 2P
        self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=False)
        continue
    
    # Check start_qr_2 == shelf?
    start_2_shelf_ok, start_2_shelf_since = self._is_slot_stable(start_cam_2, start_slot_2, "shelf")
    
    if start_2_shelf_ok:
        # start_qr_2 == shelf → PUBLISH 4P
        print(f"[DUAL_LOGIC] start_qr_2={start_qr_2} == shelf → Publish 4P")
        stable_since_epoch = max(start_since, end_since, start_2_shelf_since)
        self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=True)
    else:
        # Check start_qr_2 == empty?
        start_2_empty_ok, start_2_empty_since = self._is_slot_stable(start_cam_2, start_slot_2, "empty")
        
        if start_2_empty_ok:
            # start_qr_2 == empty → PUBLISH 2P
            print(f"[DUAL_LOGIC] start_qr_2={start_qr_2} == empty → Publish 2P")
            stable_since_epoch = max(start_since, end_since, start_2_empty_since)
            self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=False)
        else:
            # start_qr_2 không stable → SKIP
            print(f"[DUAL_LOGIC] start_qr_2={start_qr_2} không stable → Không publish")
```

**Lưu ý quan trọng**:
- `stable_since_epoch` = MAX của tất cả slots tham gia (đảm bảo tất cả đều stable)
- Chỉ publish khi TẤT CẢ slots liên quan đã stable

---

#### 4.9.2 `_maybe_publish_dual()` - Publish Dual Pair

```python
def _maybe_publish_dual(self, dual_config: Dict[str, int], stable_since_epoch: float, 
                        is_four_points: bool) -> None:
```

**Tham số**:
- `dual_config`: Dictionary chứa `{start_qr, end_qrs, start_qr_2, end_qrs_2}`
- `stable_since_epoch`: Thời điểm stable
- `is_four_points`: `True` = 4P, `False` = 2P

**Logic kiểm tra**:
1. Check minute-based deduplication (tương tự normal pair)
2. Check cooldown
3. Mark published và update cooldown

**Payload 4P**:
```python
payload = {
    "dual_id": "101-> 201-> 102-> 202",
    "start_slot": "101",
    "end_slot": "201",
    "start_slot_2": "102",
    "end_slot_2": "202",
    "stable_since": "2024-01-15T14:30:35.000000Z"
}
```

**Payload 2P**:
```python
payload = {
    "dual_id": "101-> 201",
    "start_slot": "101",
    "end_slot": "201",
    "stable_since": "2024-01-15T14:30:35.000000Z"
}
```

**Publish**: `self.queue.publish("stable_dual", dual_id, payload)`

**Sau khi publish**: Tự động gọi `_publish_dual_block()` để block start_qr

---

#### 4.9.3 `_publish_dual_block()` - Block start_qr sau khi publish Dual

**Mục đích**: Sau khi phát hiện dual pair, cần block start_qr để tránh phát hiện lại trong quá trình vận chuyển

**Logic**:
1. Lưu thông tin dual đã block vào `self.dual_blocked_pairs`
2. Publish message vào topic `"dual_block"` để roi_processor biết và block
3. Bắt đầu monitor trạng thái của `end_qrs` để biết khi nào unblock

**Payload**:
```python
block_payload = {
    "dual_id": "101-> 201",
    "start_qr": 101,
    "end_qrs": 201,
    "action": "block",
    "timestamp": "2024-01-15T14:30:35.000000Z"
}
```

**Khởi tạo monitoring end_qrs**:
```python
self.dual_end_states[(end_cam, end_slot)] = {
    "state": "empty",        # Trạng thái hiện tại
    "since": time.time(),    # Thời điểm bắt đầu trạng thái này
    "dual_id": dual_id,      # Liên kết với dual pair
    "stable_time": 10.0      # Thời gian cần stable để unblock
}
```

**Logging**:
```
DUAL_BLOCK_PUBLISHED: dual_id=101-> 201, start_qr=101, end_qrs=201, action=block
[DUAL_BLOCK] Đã block start_qr=101 cho dual 101-> 201, monitoring end_qrs=201
```

---

#### 4.9.4 `_monitor_dual_end_states()` - Monitor end_qrs để unblock

**Mục đích**: Theo dõi trạng thái end_qrs, khi nó stable shelf → unblock start_qr

**State Machine của end_qrs**:
```
┌──────────┐                 ┌──────────┐
│  empty   │────detected────→│  shelf   │
│          │    shelf         │          │
└──────────┘                 └──────────┘
     ↑                              │
     │        detected              │
     └──────────empty───────────────┘
```

**Logic xử lý**:
```python
for (end_cam, end_slot), state_info in list(self.dual_end_states.items()):
    dual_id = state_info["dual_id"]
    
    # Kiểm tra end slot có đang stable shelf không
    current_state_ok, current_since = self._is_slot_stable(end_cam, end_slot, "shelf")
    
    if current_state_ok and current_since is not None:
        # End slot ĐANG stable shelf
        prev_state = state_info["state"]
        
        if prev_state == "empty":
            # empty → shelf: BẮT ĐẦU đếm thời gian
            state_info["state"] = "shelf"
            state_info["since"] = current_since
            print(f"[DUAL_MONITOR] End slot {end_cam}:{end_slot}: empty -> shelf")
            
        elif prev_state == "shelf":
            # Đã ở shelf: KIỂM TRA thời gian
            stable_duration = current_time - state_info["since"]
            
            if stable_duration >= state_info["stable_time"]:
                # ĐỦ THỜI GIAN → UNBLOCK
                self._unblock_dual_start(dual_id)
                del self.dual_end_states[(end_cam, end_slot)]  # Ngừng monitor
    else:
        # End slot KHÔNG phải shelf stable
        if state_info["state"] == "shelf":
            # shelf → empty: RESET
            state_info["state"] = "empty"
            state_info["since"] = current_time
            print(f"[DUAL_MONITOR] End slot: shelf -> empty (reset)")
```

**Timeline ví dụ**:
```
t=0s:   Dual pair published, block start_qr=101
        end_qrs=201 state: empty
        
t=5s:   end_qrs=201 chuyển sang shelf
        → Bắt đầu đếm stable time
        
t=15s:  end_qrs=201 vẫn shelf, đã stable 10s
        → UNBLOCK start_qr=101
        
t=20s:  Ngừng monitor end_qrs=201
```

**Lưu ý**: Hàm này KHÔNG được gọi trong version hiện tại (comment line 705: "Dual end state monitoring is now handled by roi_processor")

---

#### 4.9.5 `_unblock_dual_start()` - Unblock start_qr

**Mục đích**: Gỡ block cho start_qr khi end_qrs đã stable shelf

**Logic**:
1. Lấy thông tin từ `dual_blocked_pairs`
2. Publish message vào topic `"dual_unblock"`
3. Xóa khỏi `dual_blocked_pairs`

**Payload**:
```python
unblock_payload = {
    "dual_id": "101-> 201",
    "start_qr": 101,
    "end_qrs": 201,
    "action": "unblock",
    "reason": "end_qrs_stable_shelf",
    "timestamp": "2024-01-15T14:30:35.000000Z"
}
```

**Publish**: `self.queue.publish("dual_unblock", dual_id, unblock_payload)`

**Logging**:
```
DUAL_UNBLOCK_PUBLISHED: dual_id=101-> 201, start_qr=101, end_qrs=201, reason=end_qrs_stable_shelf
[DUAL_UNBLOCK] Đã unblock start_qr=101 cho dual 101-> 201 (end_qrs=201 stable shelf)
```

---

#### 4.9.6 `_subscribe_dual_unblock_trigger()` - Subscribe trigger từ roi_processor

**Mục đích**: Lắng nghe trigger từ `roi_processor` để unblock start_qr khi cần

**Cơ chế**:
- Chạy trong thread riêng (daemon thread)
- Poll database mỗi 0.2s
- Đọc topic `"dual_unblock_trigger"`

**Logic**:
```python
while True:
    # Đọc messages mới từ topic "dual_unblock_trigger"
    rows = conn.execute("""
        SELECT id, payload FROM messages
        WHERE topic = ? AND id > ?
        ORDER BY id ASC LIMIT 50
    """, ("dual_unblock_trigger", last_trigger_id))
    
    for r in rows:
        payload = json.loads(r[1])
        dual_id = payload.get("dual_id", "")
        
        if dual_id:
            print(f"Nhận dual_unblock_trigger cho {dual_id}")
            self._unblock_dual_start(dual_id)  # Unblock ngay
    
    time.sleep(0.2)
```

**Trigger payload từ roi_processor**:
```python
{
    "dual_id": "101-> 201",
    "reason": "manual_trigger"  # hoặc các lý do khác
}
```

**Ứng dụng**: Cho phép roi_processor chủ động yêu cầu unblock (ví dụ: phát hiện end_qrs đã stable shelf)

---

### 4.10 `run()` - Main loop

**Cấu trúc tổng quan**:
```python
def run(self) -> None:
    # 1. Khởi động dual unblock trigger subscription thread
    dual_trigger_thread = threading.Thread(target=self._subscribe_dual_unblock_trigger, daemon=True)
    dual_trigger_thread.start()
    
    # 2. Khởi tạo tracking cho roi_detection
    last_roi_det_id: Dict[str, int] = {}  # camera_id → last_processed_message_id
    
    # 3. Main loop
    while True:
        # A. Đọc roi_detection messages mới từ mỗi camera
        for cam, last_id in list(last_roi_det_id.items()):
            rows = self.queue.get_after_id("roi_detection", cam, last_id, limit=30)
            for r in rows:
                payload = r["payload"]
                roi_detections = payload.get("roi_detections", [])
                
                # Tính status của các slots
                status_by_slot = self._compute_slot_statuses(cam, roi_detections)
                if status_by_slot:
                    self._update_slot_state(cam, status_by_slot)
        
        # B. Evaluate normal pairs
        for start_qr, end_qrs in self.pairs:
            # Logic chọn end_qr để publish
            ...
            self._maybe_publish_pair(start_qr, end_qr, stable_since_epoch, all_empty_qrs)
        
        # C. Evaluate dual pairs
        self._evaluate_dual_pairs()
        
        time.sleep(0.2)  # Poll interval
```

**Chi tiết xử lý Normal Pairs**:
```python
for start_qr, end_qrs in self.pairs:
    # 1. Check start_qr == shelf (stable)
    start_ok, start_since = self._is_slot_stable(start_cam, start_slot, "shelf")
    if not start_ok:
        continue  # start không shelf → skip
    
    # 2. Thu thập TẤT CẢ end_qrs đang empty & stable
    empty_end_qrs = []
    for end_qr in end_qrs:
        end_ok, end_since = self._is_slot_stable(end_cam, end_slot, "empty")
        if end_ok and end_since is not None:
            empty_end_qrs.append((end_qr, end_since))
    
    # 3. Nếu có ít nhất 1 end_qr empty
    if empty_end_qrs:
        # Chọn end_qr ĐẦU TIÊN trong list (ưu tiên theo config)
        end_qr, end_since = empty_end_qrs[0]
        stable_since_epoch = max(start_since, end_since)
        
        # Tạo list tất cả end_qrs empty (để log và payload)
        all_empty_qrs = [qr for qr, _ in empty_end_qrs]
        
        # Log thông tin
        if len(empty_end_qrs) == len(end_qrs):
            print(f"[PAIR_LOGIC] TẤT CẢ {len(end_qrs)} end_qrs đều empty, chọn {end_qr}")
        else:
            print(f"[PAIR_LOGIC] {len(empty_end_qrs)}/{len(end_qrs)} end_qrs empty, chọn {end_qr}")
        
        # Publish (với thông tin all_empty nếu > 1)
        self._maybe_publish_pair(start_qr, end_qr, stable_since_epoch, 
                                 all_empty_qrs if len(all_empty_qrs) > 1 else None)
```

**Giải thích logic chọn end_qr**:
- Dù có bao nhiêu end_qrs empty, CHỈ publish 1 cặp duy nhất
- Chọn end_qr ĐẦU TIÊN trong danh sách empty (theo thứ tự trong config)
- Nếu TẤT CẢ end_qrs đều empty → thêm field `all_empty_end_slots` vào payload

---

## 5. CƠ CHẾ HOẠT ĐỘNG

### 5.1 Slot State Management

**State Lifecycle**:
```
┌────────────┐
│  Unknown   │ (chưa có dữ liệu)
└─────┬──────┘
      │ first detection
      ↓
┌────────────┐
│   State    │ {"status": "shelf"/"empty", "since": epoch_time}
│  Tracking  │
└─────┬──────┘
      │ status changed
      ↓
┌────────────┐
│   Reset    │ since = current_time
│   Timer    │
└─────┬──────┘
      │ status unchanged for stable_seconds
      ↓
┌────────────┐
│   Stable   │ Ready for pairing
└────────────┘
```

**Ví dụ cụ thể**:
```python
Timeline:
t=0:   Detection: slot 5 = empty
       State: {"status": "empty", "since": 0}
       
t=3:   Detection: slot 5 = empty
       State: {"status": "empty", "since": 0} (không đổi)
       
t=5:   Detection: slot 5 = shelf
       State: {"status": "shelf", "since": 5} (reset timer)
       
t=8:   Detection: slot 5 = shelf
       State: {"status": "shelf", "since": 5} (không đổi)
       
t=15:  Check stable: duration = 15 - 5 = 10s >= stable_seconds(10)
       → STABLE!
       
t=16:  Detection: slot 5 = empty
       State: {"status": "empty", "since": 16} (reset timer)
```

---

### 5.2 Pair Publishing Flow

**Normal Pair (2 điểm)**:
```
START
  │
  ├─→ [Check start_qr == shelf (stable)]
  │   ├─ NO → SKIP
  │   └─ YES ↓
  │
  ├─→ [Thu thập end_qrs đang empty (stable)]
  │   ├─ Không có end_qrs empty → SKIP
  │   └─ Có ít nhất 1 end_qr empty ↓
  │
  ├─→ [Chọn end_qr đầu tiên trong list empty]
  │
  ├─→ [Check minute-based deduplication]
  │   ├─ Đã publish trong phút này → SKIP
  │   └─ Chưa publish ↓
  │
  ├─→ [Check cooldown]
  │   ├─ Chưa đủ cooldown → SKIP
  │   └─ Đủ cooldown ↓
  │
  ├─→ [Publish to queue "stable_pairs"]
  │
  └─→ [Log event]
```

**Dual Pair (2P/4P)**:
```
START
  │
  ├─→ [Check start_qr == shelf (stable) AND end_qrs == empty (stable)]
  │   ├─ NO → SKIP
  │   └─ YES ↓
  │
  ├─→ [Check start_qr_2]
  │   │
  │   ├─→ [start_qr_2 không tồn tại]
  │   │   └─→ PUBLISH 2P
  │   │
  │   ├─→ [start_qr_2 == shelf (stable)]
  │   │   └─→ PUBLISH 4P
  │   │
  │   ├─→ [start_qr_2 == empty (stable)]
  │   │   └─→ PUBLISH 2P
  │   │
  │   └─→ [start_qr_2 không stable]
  │       └─→ SKIP
  │
  ├─→ [Check minute-based deduplication + cooldown]
  │
  ├─→ [Publish to queue "stable_dual"]
  │
  ├─→ [Publish block message to "dual_block"]
  │
  └─→ [Bắt đầu monitor end_qrs để unblock]
```

---

### 5.3 Block/Unblock Mechanism

**Tại sao cần Block?**
- Sau khi phát hiện dual pair, robot sẽ di chuyển kệ từ start_qr → end_qrs
- Trong quá trình di chuyển, start_qr trống → có thể phát hiện nhầm là pair mới
- → Cần block start_qr để tránh phát hiện sai

**Timeline Block/Unblock**:
```
t=0:    Phát hiện Dual Pair: start_qr=101 (shelf), end_qrs=201 (empty)
        → Publish stable_dual
        
t=0:    Block start_qr=101
        → Publish dual_block
        → Bắt đầu monitor end_qrs=201
        
t=5:    Robot bắt đầu di chuyển kệ
        start_qr=101: shelf → empty
        end_qrs=201: empty → (đang di chuyển)
        
t=10:   Kệ đến end_qrs
        end_qrs=201: empty → shelf (bắt đầu đếm stable time)
        
t=20:   end_qrs=201 stable shelf đủ 10s
        → Unblock start_qr=101
        → Publish dual_unblock
        
t=21:   start_qr=101 có thể phát hiện pair mới
```

**2 cách Unblock**:

1. **Passive monitoring** (trong `_monitor_dual_end_states`):
   - StablePairProcessor tự monitor end_qrs
   - Khi end_qrs stable shelf đủ lâu → tự unblock
   - ⚠️ Hiện tại không dùng

2. **Active trigger** (trong `_subscribe_dual_unblock_trigger`):
   - roi_processor monitor end_qrs
   - Khi end_qrs stable shelf → publish trigger
   - StablePairProcessor nhận trigger → unblock
   - ✅ Đang dùng

---

### 5.4 Deduplication Mechanisms

**3 lớp chống duplicate**:

#### Lớp 1: Minute-based Deduplication
```python
# Tránh publish trùng trong CÙNG 1 PHÚT
published_by_minute = {
    "101 -> 201": {
        "2024-01-15 14:30": True,
        "2024-01-15 14:31": True
    }
}
```
**Ứng dụng**: Nếu pair stable liên tục, chỉ publish 1 lần/phút

#### Lớp 2: Cooldown
```python
# Tránh publish quá nhanh
published_at = {
    "101 -> 201": 1705330245.123  # last publish time
}
cooldown_seconds = 5.0
```
**Ứng dụng**: Đảm bảo ít nhất 5s giữa các lần publish cùng pair

#### Lớp 3: Stable Time
```python
# Chỉ publish khi stable đủ lâu
stable_seconds = 10.0
slot_state = {
    "cam-1:5": {"status": "shelf", "since": 1705330235.123}
}
# Chỉ publish khi: current_time - since >= 10s
```
**Ứng dụng**: Tránh phát hiện nhầm do detection không ổn định

---

## 6. LUỒNG XỬ LÝ DỮ LIỆU

### 6.1 Data Flow Overview

```
┌─────────────────┐
│  roi_processor  │ (external)
│  Detect objects │
└────────┬────────┘
         │ publish "roi_detection"
         ↓
┌─────────────────────────────────────────┐
│         SQLite Queue (queues.db)        │
│  topic: "roi_detection"                 │
│  key: camera_id                         │
│  payload: {roi_detections: [...]}      │
└────────┬────────────────────────────────┘
         │ poll every 0.2s
         ↓
┌─────────────────────────────────────────┐
│     StablePairProcessor.run()           │
│  ┌───────────────────────────────────┐  │
│  │ _compute_slot_statuses()          │  │
│  │ → status_by_slot: {5: "shelf"}   │  │
│  └──────────────┬────────────────────┘  │
│                 ↓                        │
│  ┌───────────────────────────────────┐  │
│  │ _update_slot_state()              │  │
│  │ → slot_state["cam-1:5"] = {...}  │  │
│  └──────────────┬────────────────────┘  │
│                 ↓                        │
│  ┌───────────────────────────────────┐  │
│  │ _is_slot_stable()                 │  │
│  │ → Check stable time               │  │
│  └──────────────┬────────────────────┘  │
│                 ↓                        │
│  ┌───────────────────────────────────┐  │
│  │ Evaluate pairs & dual pairs       │  │
│  │ → _maybe_publish_pair()           │  │
│  │ → _evaluate_dual_pairs()          │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼────────────────────────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
┌────────────────┐  ┌──────────────────┐
│ "stable_pairs" │  │  "stable_dual"   │
│ "dual_block"   │  │ "dual_unblock"   │
└────────────────┘  └──────────────────┘
         │                 │
         └────────┬────────┘
                  ↓
         ┌────────────────┐
         │  Downstream    │
         │  consumers     │
         └────────────────┘
```

---

### 6.2 Message Format Chi Tiết

#### Input: `roi_detection`
```json
{
  "topic": "roi_detection",
  "key": "cam-1",
  "payload": {
    "camera_id": "cam-1",
    "timestamp": "2024-01-15T14:30:45.123456Z",
    "roi_detections": [
      {
        "class_name": "shelf",
        "slot_number": 5,
        "confidence": 0.95,
        "bbox": [100, 200, 300, 400]
      },
      {
        "class_name": "empty",
        "slot_number": 6,
        "confidence": 0.92,
        "bbox": [400, 200, 600, 400]
      }
    ]
  }
}
```

#### Output 1: `stable_pairs`
```json
{
  "topic": "stable_pairs",
  "key": "101 -> 201",
  "payload": {
    "pair_id": "101 -> 201",
    "start_slot": "101",
    "end_slot": "201",
    "stable_since": "2024-01-15T14:30:35.000000Z",
    "all_empty_end_slots": ["201", "202"],  // optional
    "is_all_empty": true                     // optional
  }
}
```

#### Output 2: `stable_dual` (2P)
```json
{
  "topic": "stable_dual",
  "key": "101-> 201",
  "payload": {
    "dual_id": "101-> 201",
    "start_slot": "101",
    "end_slot": "201",
    "stable_since": "2024-01-15T14:30:35.000000Z"
  }
}
```

#### Output 3: `stable_dual` (4P)
```json
{
  "topic": "stable_dual",
  "key": "101-> 201-> 102-> 202",
  "payload": {
    "dual_id": "101-> 201-> 102-> 202",
    "start_slot": "101",
    "end_slot": "201",
    "start_slot_2": "102",
    "end_slot_2": "202",
    "stable_since": "2024-01-15T14:30:35.000000Z"
  }
}
```

#### Output 4: `dual_block`
```json
{
  "topic": "dual_block",
  "key": "101-> 201",
  "payload": {
    "dual_id": "101-> 201",
    "start_qr": 101,
    "end_qrs": 201,
    "action": "block",
    "timestamp": "2024-01-15T14:30:35.000000Z"
  }
}
```

#### Output 5: `dual_unblock`
```json
{
  "topic": "dual_unblock",
  "key": "101-> 201",
  "payload": {
    "dual_id": "101-> 201",
    "start_qr": 101,
    "end_qrs": 201,
    "action": "unblock",
    "reason": "end_qrs_stable_shelf",
    "timestamp": "2024-01-15T14:30:35.000000Z"
  }
}
```

#### Input Trigger: `dual_unblock_trigger`
```json
{
  "topic": "dual_unblock_trigger",
  "key": "101-> 201",
  "payload": {
    "dual_id": "101-> 201",
    "reason": "manual_trigger"
  }
}
```

---

## 7. SƠ ĐỒ QUAN HỆ

### 7.1 Configuration Relationship

```
slot_pairing_config.json
├── starts: [QR codes for start positions]
│   └→ qr_to_slot mapping
├── starts_2: [QR codes for secondary start positions]
│   └→ qr_to_slot mapping
├── ends: [QR codes for end positions]
│   └→ qr_to_slot mapping
├── pairs: [Normal pairing rules]
│   └→ (start_qr, [end_qrs])
└── dual: [Dual pairing rules]
    └→ {start_qr, end_qrs, start_qr_2, end_qrs_2}
```

**Ví dụ config thực tế**:
```json
{
  "starts": [
    {"qr_code": 101, "camera_id": "cam-1", "slot_number": 1},
    {"qr_code": 102, "camera_id": "cam-1", "slot_number": 2}
  ],
  "starts_2": [
    {"qr_code": 103, "camera_id": "cam-1", "slot_number": 3}
  ],
  "ends": [
    {"qr_code": 201, "camera_id": "cam-2", "slot_number": 1},
    {"qr_code": 202, "camera_id": "cam-2", "slot_number": 2},
    {"qr_code": 203, "camera_id": "cam-2", "slot_number": 3}
  ],
  "pairs": [
    {"start_qr": 101, "end_qrs": [201, 202]},
    {"start_qr": 102, "end_qrs": [202, 203]}
  ],
  "dual": [
    {
      "start_qr": 101,
      "end_qrs": 201,
      "start_qr_2": 103,
      "end_qrs_2": 202
    }
  ]
}
```

---

### 7.2 State Tracking Structure

```
slot_state
├─ "cam-1:1" → {"status": "shelf", "since": 1705330245.123}
├─ "cam-1:2" → {"status": "empty", "since": 1705330250.456}
├─ "cam-2:1" → {"status": "empty", "since": 1705330255.789}
└─ ...

published_at
├─ "101 -> 201" → 1705330245.123
├─ "102 -> 202" → 1705330250.456
└─ ...

published_by_minute
├─ "101 -> 201"
│   ├─ "2024-01-15 14:30" → True
│   └─ "2024-01-15 14:31" → True
└─ ...

dual_blocked_pairs
├─ "101-> 201" → {"start_qr": 101, "end_qrs": 201}
└─ ...

dual_end_states
├─ ("cam-2", 1)
│   └─ {"state": "empty", "since": ..., "dual_id": "101-> 201", "stable_time": 10.0}
└─ ...
```

---

### 7.3 Thread Architecture

```
┌────────────────────────────────────────────────┐
│           Main Thread                          │
│  ┌──────────────────────────────────────────┐  │
│  │  StablePairProcessor.run()               │  │
│  │  - Poll roi_detection                    │  │
│  │  - Update slot states                    │  │
│  │  - Evaluate pairs                        │  │
│  │  - Publish stable_pairs / stable_dual    │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│         Daemon Thread                          │
│  ┌──────────────────────────────────────────┐  │
│  │  _subscribe_dual_unblock_trigger()       │  │
│  │  - Poll dual_unblock_trigger topic       │  │
│  │  - Call _unblock_dual_start() on trigger │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## 8. THAM SỐ QUAN TRỌNG VÀ TUNING

### 8.1 Timing Parameters

| Tham số | Giá trị mặc định | Tác động | Khuyến nghị |
|---------|------------------|----------|-------------|
| `stable_seconds` | 10.0s | Thời gian cần stable trước khi publish | Tăng nếu detection không ổn định |
| `cooldown_seconds` | 5.0s | Thời gian chờ giữa các publish | Tăng để giảm spam messages |
| `poll_interval` | 0.2s | Tần suất kiểm tra messages mới | Giảm nếu cần realtime hơn |
| `dual_stable_time` | 10.0s | Thời gian end_qrs stable để unblock | Phụ thuộc thời gian robot di chuyển |

**Mối quan hệ**:
```
stable_seconds < cooldown_seconds: Có thể publish nhanh khi vừa stable
stable_seconds > cooldown_seconds: Phải đợi lâu hơn để stable

Ví dụ:
- stable_seconds = 10s, cooldown_seconds = 5s
  → Sau khi stable, có thể publish ngay
  → Lần publish tiếp theo: phải chờ 5s (cooldown)

- stable_seconds = 5s, cooldown_seconds = 10s
  → Sau khi stable 5s, có thể publish
  → Lần publish tiếp theo: phải chờ 10s (cooldown)
```

---

### 8.2 Database Limits

```python
# Số messages đọc mỗi lần poll
roi_detection_limit = 30
dual_unblock_trigger_limit = 50
```

**Tuning**:
- Tăng nếu có nhiều messages bị tụt lại
- Giảm nếu muốn xử lý realtime hơn

---

### 8.3 Logger Configuration

```python
# File size và backup
maxBytes = 5*1024*1024  # 5MB
backupCount = 3         # Giữ 3 files backup

# Total storage: 5MB × 4 files = 20MB per logger
# 2 loggers: pair_publish + block_unblock = 40MB total
```

---

## 9. CASE STUDIES

### Case 1: Normal Pair - Multiple Empty End Slots

**Scenario**:
- Config: `{"start_qr": 101, "end_qrs": [201, 202, 203]}`
- Trạng thái:
  - Slot 101 (start): shelf stable 15s
  - Slot 201 (end): empty stable 12s
  - Slot 202 (end): empty stable 10s
  - Slot 203 (end): có shelf

**Xử lý**:
```python
start_ok, start_since = True, 1705330230  # stable 15s
empty_end_qrs = [
    (201, 1705330233),  # stable 12s
    (202, 1705330235)   # stable 10s
]
# Chọn end_qr = 201 (đầu tiên trong list)
# Publish: pair_id="101 -> 201"
# Payload bổ sung: all_empty_end_slots=["201", "202"], is_all_empty=False
```

---

### Case 2: Dual Pair - Publish 4P

**Scenario**:
- Config: `{"start_qr": 101, "end_qrs": 201, "start_qr_2": 102, "end_qrs_2": 202}`
- Trạng thái:
  - Slot 101: shelf stable 15s
  - Slot 201: empty stable 12s
  - Slot 102: shelf stable 11s
  - Slot 202: empty stable 10s

**Timeline**:
```
t=0:   Cặp chính (101, 201) stable → Check start_qr_2
t=0:   start_qr_2 (102) = shelf stable → PUBLISH 4P
t=0:   Publish: dual_id="101-> 201-> 102-> 202"
t=0:   Block: start_qr=101
t=0:   Bắt đầu monitor: end_qrs=201
```

---

### Case 3: Dual Pair - Publish 2P (start_qr_2 empty)

**Scenario**:
- Config: `{"start_qr": 101, "end_qrs": 201, "start_qr_2": 102, "end_qrs_2": 202}`
- Trạng thái:
  - Slot 101: shelf stable 15s
  - Slot 201: empty stable 12s
  - Slot 102: empty stable 10s

**Timeline**:
```
t=0:   Cặp chính (101, 201) stable → Check start_qr_2
t=0:   start_qr_2 (102) = empty stable → PUBLISH 2P
t=0:   Publish: dual_id="101-> 201"
t=0:   Block: start_qr=101
t=0:   Bắt đầu monitor: end_qrs=201
```

---

### Case 4: Dual Pair - Block và Unblock

**Timeline chi tiết**:
```
t=0s:   [DETECT] start_qr=101 (shelf stable), end_qrs=201 (empty stable)
        [ACTION] Publish dual: "101-> 201"
        [ACTION] Block start_qr=101
        [STATE] dual_blocked_pairs["101-> 201"] = {...}
        [STATE] dual_end_states[("cam-2", 1)] = {state: "empty", since: 0, ...}

t=5s:   [ROBOT] Bắt đầu di chuyển kệ từ 101 → 201
        [DETECT] start_qr=101: shelf → empty
        [DETECT] end_qrs=201: empty (chưa có kệ)

t=10s:  [ROBOT] Kệ đến end_qrs
        [DETECT] end_qrs=201: empty → shelf
        [STATE] dual_end_states[("cam-2", 1)].state = "shelf"
        [STATE] dual_end_states[("cam-2", 1)].since = 10

t=15s:  [DETECT] end_qrs=201: shelf (stable 5s)
        [CHECK] stable_duration = 15 - 10 = 5s < 10s → Chưa unblock

t=20s:  [DETECT] end_qrs=201: shelf (stable 10s)
        [CHECK] stable_duration = 20 - 10 = 10s >= 10s → UNBLOCK!
        [ACTION] Publish dual_unblock: "101-> 201"
        [STATE] del dual_blocked_pairs["101-> 201"]
        [STATE] del dual_end_states[("cam-2", 1)]

t=25s:  [READY] start_qr=101 có thể phát hiện pair mới
```

---

## 10. TROUBLESHOOTING

### 10.1 Pair không được publish dù slot stable

**Nguyên nhân có thể**:

1. **Chưa đủ stable time**:
```python
# Check: slot_state["cam-1:5"]["since"]
# Tính: duration = current_time - since
# Cần: duration >= stable_seconds (10s)
```

2. **Đã publish trong phút này**:
```python
# Check: published_by_minute[pair_id]
# Xóa entry cũ nếu muốn test:
del processor.published_by_minute[pair_id]
```

3. **Cooldown chưa hết**:
```python
# Check: published_at[pair_id]
# Tính: elapsed = current_time - published_at[pair_id]
# Cần: elapsed >= cooldown_seconds (5s)
```

4. **QR code không có trong config**:
```python
# Check: processor.qr_to_slot
# Đảm bảo QR code có trong starts/ends
```

---

### 10.2 Dual pair publish 2P thay vì 4P

**Nguyên nhân**:
- `start_qr_2` không phải shelf stable
- Check log: `[DUAL_LOGIC] start_qr_2={qr} == empty → Publish 2P`

**Debug**:
```python
# Check state của start_qr_2
key = f"{camera_id}:{slot_number}"
print(processor.slot_state.get(key))
# → {"status": "empty", "since": ...}
```

---

### 10.3 Dual start_qr không bao giờ unblock

**Nguyên nhân**:

1. **end_qrs không stable shelf**:
```python
# Check: processor.dual_end_states
# Xem state hiện tại: "empty" hay "shelf"
```

2. **Daemon thread bị lỗi**:
```python
# Check thread status
threading.enumerate()
# Tìm thread có target=_subscribe_dual_unblock_trigger
```

3. **roi_processor không publish trigger**:
```python
# Check database
SELECT * FROM messages 
WHERE topic = 'dual_unblock_trigger' 
ORDER BY id DESC LIMIT 10;
```

**Giải pháp tạm thời**: Manual unblock
```python
processor._unblock_dual_start(dual_id)
```

---

### 10.4 Log file quá lớn

**Hiện tượng**: Log files vượt quá 5MB × 4 = 20MB

**Nguyên nhân**: RotatingFileHandler không hoạt động đúng

**Giải pháp**:
1. Check handler configuration
2. Manual cleanup:
```bash
# Windows
del D:\WORK\ROI_LOGIC\logs\*.log.1
del D:\WORK\ROI_LOGIC\logs\*.log.2
```

---

## 11. PERFORMANCE CONSIDERATIONS

### 11.1 Memory Usage

**Ước tính**:
```python
# slot_state: ~100 bytes × số slots
# Ví dụ: 100 slots × 100 bytes = 10KB

# published_at: ~50 bytes × số pairs
# Ví dụ: 50 pairs × 50 bytes = 2.5KB

# published_by_minute: ~50 bytes × số pairs × số phút
# Ví dụ: 50 pairs × 60 phút × 50 bytes = 150KB

# Total: ~200KB (negligible)
```

**Cleanup**: Không có auto-cleanup cho `published_by_minute`
- Có thể tăng dần theo thời gian
- Khuyến nghị: Thêm cleanup cho entries cũ hơn 1 giờ

---

### 11.2 Database Query Performance

**Queries chính**:
```sql
-- Poll roi_detection (mỗi camera, mỗi 0.2s)
SELECT id, payload FROM messages
WHERE topic = 'roi_detection' AND key = ? AND id > ?
ORDER BY id ASC LIMIT 30;

-- Poll dual_unblock_trigger (mỗi 0.2s)
SELECT id, payload FROM messages
WHERE topic = 'dual_unblock_trigger' AND id > ?
ORDER BY id ASC LIMIT 50;
```

**Optimization**:
- Index trên `(topic, key, id)` - đã có trong SQLiteQueue
- Giới hạn LIMIT để tránh đọc quá nhiều

---

### 11.3 CPU Usage

**Bottlenecks**:
1. JSON parsing: `json.loads(payload)`
2. Slot state updates: O(n) với n = số slots trong frame
3. Pair evaluation: O(m × k) với m = số pairs, k = số end_qrs per pair

**Ước tính**:
- 10 cameras × 30 messages/poll × 5 polls/s = 1500 messages/s
- Mỗi message: ~0.1ms xử lý
- Total CPU: ~15% (single core)

---

## 12. KẾT LUẬN

### 12.1 Điểm mạnh của hệ thống

1. **Robust state tracking**: Theo dõi chính xác trạng thái slot qua thời gian
2. **Multi-layer deduplication**: 3 lớp chống duplicate (minute, cooldown, stable)
3. **Flexible pairing**: Hỗ trợ multi-end, dual pairs 2P/4P
4. **Block mechanism**: Tránh false positive trong quá trình vận chuyển
5. **Comprehensive logging**: Chi tiết mọi sự kiện quan trọng

---

### 12.2 Hạn chế và cải tiến tiềm năng

**Hạn chế**:
1. **Memory leak**: `published_by_minute` không tự cleanup
2. **Single threaded**: Main loop có thể bị block nếu xử lý chậm
3. **No retry mechanism**: Nếu publish fail, không retry
4. **Hard-coded parameters**: Timing parameters không thể thay đổi runtime

**Cải tiến đề xuất**:
1. **Auto cleanup**:
```python
def _cleanup_old_minute_records(self):
    cutoff = time.time() - 3600  # 1 giờ trước
    for pair_id in list(self.published_by_minute.keys()):
        self.published_by_minute[pair_id] = {
            k: v for k, v in self.published_by_minute[pair_id].items()
            if datetime.strptime(k, "%Y-%m-%d %H:%M").timestamp() > cutoff
        }
```

2. **Async processing**:
```python
import asyncio
async def run_async(self):
    # Process multiple cameras in parallel
    tasks = [self._process_camera(cam) for cam in cameras]
    await asyncio.gather(*tasks)
```

3. **Config hot reload**:
```python
def _watch_config_changes(self):
    # Watch config file and reload when changed
    # Use watchdog library
```

4. **Metrics và monitoring**:
```python
def _export_metrics(self):
    return {
        "active_pairs": len(self.published_at),
        "blocked_duals": len(self.dual_blocked_pairs),
        "monitored_slots": len(self.dual_end_states),
        "publish_rate": self._calculate_publish_rate()
    }
```

---

### 12.3 Use Cases thực tế

**Warehouse automation**:
- Phát hiện kệ sẵn sàng di chuyển (start có hàng, end trống)
- Quản lý robot picking/placing
- Tối ưu hóa workflow logistics

**Quality control**:
- Monitor thời gian kệ ở mỗi vị trí
- Phát hiện anomaly (kệ stable quá lâu)
- Tracking performance metrics

**Integration với hệ thống khác**:
- WMS (Warehouse Management System)
- Robot control system
- Analytics dashboard

---

## PHỤ LỤC

### A. Glossary

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| **Slot** | Vị trí có thể chứa kệ hàng, được giám sát bởi camera |
| **QR Code** | Mã định danh duy nhất cho mỗi slot |
| **Pair** | Cặp (start, end) thỏa mãn điều kiện: start có kệ, end trống |
| **Dual Pair** | Cặp đặc biệt có 2 start slots và 2 end slots |
| **Stable** | Trạng thái được giữ ổn định trong khoảng thời gian xác định |
| **Cooldown** | Thời gian chờ tối thiểu giữa các lần publish |
| **Block** | Tạm ngừng phát hiện pair cho một slot cụ thể |
| **ROI** | Region of Interest - vùng quan tâm trong frame |

### B. References

- SQLiteQueue: `queue_store.py`
- ROI Processor: `roi_processor.py`
- Config example: `slot_pairing_config.json`
- Dual logic doc: `DUAL_4P_SUMMARY.txt`

---

**Document version**: 1.0  
**Last updated**: 2024-01-15  
**Author**: AI Assistant  
**Review status**: Draft

