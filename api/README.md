# Point Status API

API để quản lý trạng thái block/unblock của các điểm trong hệ thống ROI Logic.

## Cấu trúc

```
api/
├── __init__.py          # Module exports
├── point_status.py      # Core API logic
├── http_server.py       # FastAPI REST endpoints
├── run_server.py        # Standalone server runner
├── test_api.py          # Test script
└── README.md           # Documentation (file này)
```

## Cài đặt

```bash
pip install fastapi uvicorn
```

## Cách dùng

### 1. Python API (Direct)

```python
from logic.hash_tables import HashTables
from api import PointStatusAPI

# Khởi tạo
hash_tables = HashTables("logic/config.json")
api = PointStatusAPI(hash_tables)

# Block điểm
result = api.block_point("911", blocked_by="manual")
print(result)
# {"success": True, "message": "Đã block điểm 911", "data": {...}}

# Unblock điểm
result = api.unblock_point("911")
print(result)
# {"success": True, "message": "Đã unblock điểm 911", "data": {...}}

# Xem trạng thái
result = api.get_point_status("911")

# Xem tất cả điểm bị block
result = api.get_all_blocked_points()
```

### 2. REST API (HTTP)

**Chạy server:**

```bash
cd D:\WORK\ROI_LOGIC_version2\api
python run_server.py
```

Server sẽ chạy tại: `http://localhost:8000`

**Endpoints:**

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Health check |
| POST | `/api/block` | Block điểm (manual) |
| POST | `/api/unblock` | Unblock điểm (manual) |
| POST | `/api/task-complete` | Unblock sau khi robot hoàn thành task |
| GET | `/api/status/{qr_code}` | Xem trạng thái điểm |
| GET | `/api/blocked` | Danh sách điểm bị block |
| GET | `/docs` | Swagger UI (auto docs) |

### 3. Test với Postman

#### Block điểm

```
POST http://localhost:8000/api/block
Content-Type: application/json

{
  "qr_code": "911",
  "blocked_by": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã block điểm 911",
  "data": {
    "qr_code": "911",
    "status": "blocked",
    "blocked_by": "manual",
    "blocked_at": 1737511234.567
  }
}
```

#### Unblock điểm

```
POST http://localhost:8000/api/unblock
Content-Type: application/json

{
  "qr_code": "911"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã unblock điểm 911",
  "data": {
    "qr_code": "911",
    "status": "available",
    "previous_blocked_by": "manual"
  }
}
```

#### Xem trạng thái

```
GET http://localhost:8000/api/status/911
```

**Response:**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "qr_code": "911",
    "status": "available",
    "object_type": "empty",
    "blocked_by": null,
    "blocked_at": 0
  }
}
```

#### Xem điểm bị block

```
GET http://localhost:8000/api/blocked
```

**Response:**
```json
{
  "success": true,
  "message": "Có 2 điểm đang bị block",
  "data": [
    {
      "qr_code": "911",
      "blocked_by": "logic_2diem",
      "blocked_at": 1737511234.567,
      "object_type": "hang"
    },
    {
      "qr_code": "000",
      "blocked_by": "manual",
      "blocked_at": 1737511240.123,
      "object_type": "shelf"
    }
  ]
}
```

#### Task Complete (Robot hoàn thành)

```
POST http://localhost:8000/api/task-complete
Content-Type: application/json

{
  "blocked_point": "911",
  "rule_type": "2point"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã unblock điểm 911",
  "data": {
    "qr_code": "911",
    "status": "available",
    "previous_blocked_by": "logic_2diem"
  }
}
```

## Cơ chế hoạt động

### 2 loại Block khác nhau

#### 1. **Manual Block (API /api/block)** - TẮT điểm
- Set `manually_disabled = True` 
- Logic sẽ **BỎ QUA HOÀN TOÀN** điểm này trong `_check_stability()`
- Dùng khi user muốn **TẮT** điểm tạm thời, logic không trigger rule liên quan

#### 2. **Auto Block (Logic trigger)** - Block tự động
- Set `status = "blocked"` (manually_disabled vẫn = False)
- Logic vẫn kiểm tra điều kiện, nhưng **không trigger lại** cho đến khi unblock
- Dùng khi logic đã trigger và chờ robot hoàn thành

### Block điểm (Manual - API)

1. Kiểm tra điểm có đang bị manually disabled không
2. Set `manually_disabled = True` ← **QUAN TRỌNG**
3. Set `status = "blocked"`
4. Lưu `blocked_by` (thường là "manual")
5. Lưu `blocked_at` (timestamp)
6. Gửi notification đến visualizer qua queue

**Code:**
```python
# api/point_status.py
self.hash_tables.update_state(qr_code, {
    "manually_disabled": True,  # Logic sẽ BỎ QUA
    "status": "blocked",
    "blocked_by": blocked_by,
    "blocked_at": timestamp
})
```

### Block điểm (Auto - Logic)

**Logic giống 2point.py:**
```python
# 2point.py line 113-120
self.hash_tables.update_state(s_qr, {
    "status": "blocked",
    "blocked_by": self.rule_name,
    "blocked_at": timestamp
})
# manually_disabled vẫn = False → logic vẫn kiểm tra điều kiện
self.hash_tables.send_block_notification(s_qr, self.visualizer_queue)
```

### Unblock điểm

1. Kiểm tra điểm có đang bị block/disabled không
2. Set `manually_disabled = False` ← **QUAN TRỌNG: BẬT lại logic**
3. Set `status = "available"`
4. Clear `blocked_by` và `blocked_at`
5. **QUAN TRỌNG:** Reset `stable_since = current_time`
6. Reset `last_update = current_time`
7. Gửi notification đến visualizer (nếu có)

**Tại sao phải reset `stable_since`?**

Khi điểm bị block rồi unblock, nếu không reset `stable_since`, logic sẽ nghĩ điểm đã ổn định lâu rồi và trigger ngay lập tức. Reset `stable_since` buộc logic phải đếm lại thời gian ổn định từ đầu.

**Logic trong `_check_stability` (base_logic.py):**
```python
# Kiểm tra từng điểm
for qr_code, expected_state in zip(qr_codes, expected_states):
    state = self.hash_tables.get_state(qr_code)
    
    # QUAN TRỌNG: Nếu điểm bị tắt → BỎ QUA
    if state.get("manually_disabled", False):
        all_match = False
        break
    
    # Kiểm tra điều kiện bình thường...
```

### Flow hoàn chỉnh

#### Flow 1: Logic tự động (Auto)
```
1. Logic detect điều kiện → Auto Block điểm (2point.py)
   ├─ update_state() → status = "blocked" (manually_disabled = False)
   ├─ send_block_notification() → visualizer hiển thị
   └─ Thêm "blocked_point" vào output

2. Output gửi đến robot/external system
   └─ Robot nhận lệnh và thực hiện task

3. Robot hoàn thành → Gọi API unblock
   POST /api/task-complete {"blocked_point": "911"}
   ├─ update_state() → status = "available"
   ├─ Reset stable_since → logic đếm lại từ đầu
   └─ Gửi notification → visualizer cập nhật

4. Logic có thể trigger lại khi điều kiện + thời gian ổn định đủ
```

#### Flow 2: User can thiệp thủ công (Manual)
```
1. User muốn TẮT điểm tạm thời
   POST /api/block {"qr_code": "911", "blocked_by": "manual"}
   ├─ update_state() → manually_disabled = True
   ├─ Logic BỎ QUA điểm này trong _check_stability()
   └─ Rule liên quan đến điểm này KHÔNG trigger

2. User muốn BẬT lại điểm
   POST /api/unblock {"qr_code": "911"}
   ├─ update_state() → manually_disabled = False
   ├─ Reset stable_since → logic đếm lại từ đầu
   └─ Logic kiểm tra điểm này trở lại bình thường
```

### So sánh Manual vs Auto Block

| | Manual Block (API) | Auto Block (Logic) |
|---|---|---|
| **Khi nào** | User gọi `/api/block` | Logic trigger rule |
| **manually_disabled** | `True` | `False` |
| **Logic kiểm tra** | ❌ BỎ QUA hoàn toàn | ✅ Vẫn kiểm tra điều kiện |
| **Có thể trigger** | ❌ Không | ❌ Không (cho đến khi unblock) |
| **Mục đích** | TẮT điểm tạm thời | Chờ robot hoàn thành task |

## Test

Chạy test script:

```bash
cd D:\WORK\ROI_LOGIC_version2\api
python test_api.py
```

## Integration với Logic System

Khi logic rule trigger và block điểm:

```python
# Trong 2point.py, dual_logic.py, etc.
self.hash_tables.update_state(s_qr, {
    "status": "blocked",
    "blocked_by": self.rule_name,
    "blocked_at": timestamp
})
```

Sau khi robot hoàn thành, gọi API để unblock:

```python
# Qua HTTP API
POST /api/unblock
{"qr_code": "911"}

# Hoặc trực tiếp
api.unblock_point("911")
```

Khi unblock, điểm sẽ:
- Chuyển về `status = "available"`
- Reset thời gian ổn định
- Logic có thể trigger lại khi điều kiện đạt đủ thời gian ổn định

## Lưu ý

- API không thay đổi `object_type` (shelf/empty) của điểm
- API chỉ quản lý `status` (blocked/available)
- Visualizer sẽ hiển thị màu tím cho điểm bị block
- Điểm bị block sẽ không trigger logic rule mới

