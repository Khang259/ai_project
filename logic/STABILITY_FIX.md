# Fix: Tránh trigger ngay khi khởi động

## Vấn đề trước đây

Khi khởi động hệ thống:
1. `stable_since = 0` (khởi tạo)
2. Event đầu tiên đến với `timestamp = 1000` (giả sử)
3. Nếu trạng thái event = "empty" (giống với khởi tạo):
   - `old_object_type = "empty"`, `new_object_type = "empty"` → giống nhau
   - `stable_since = current_state.get("stable_since", timestamp) = 0` ❌
4. Check stability: `stable_duration = 1000 - 0 = 1000 giây` → Vượt 30s → **TRIGGER NGAY!**

## Giải pháp

### 1. Hash Tables - Khởi tạo `stable_since` = thời điểm khởi động

```python
import time
init_timestamp = time.time()  # Lấy timestamp khởi tạo

self.state_tracker[qr_code] = {
    "object_type": "empty",
    "stable_since": init_timestamp,  # Không còn = 0
    "last_update": init_timestamp,
    ...
}
```

### 2. Base Logic - Giữ nguyên `stable_since` khi state không đổi

```python
def _update_state_tracker(self, event, qr_code):
    old_object_type = current_state.get("object_type")
    old_stable_since = current_state.get("stable_since", timestamp)
    
    if old_object_type != object_type:
        stable_since = timestamp  # Reset khi thay đổi
    else:
        stable_since = old_stable_since  # GIỮ NGUYÊN khi không đổi
```

## Flow hoạt động sau khi fix

### Scenario 1: Event đầu tiên KHÁC với khởi tạo
```
Khởi tạo: t=100, object_type="empty", stable_since=100
Event 1:  t=110, object_type="shelf"
  → old != new → stable_since = 110 ✅
  → stable_duration = 110 - 110 = 0s < 30s → KHÔNG TRIGGER ✅

Event 2:  t=120, object_type="shelf"
  → old == new → stable_since = 110 (giữ nguyên)
  → stable_duration = 120 - 110 = 10s < 30s → KHÔNG TRIGGER ✅

Event N:  t=150, object_type="shelf"
  → old == new → stable_since = 110 (giữ nguyên)
  → stable_duration = 150 - 110 = 40s > 30s → TRIGGER ✅
```

### Scenario 2: Event đầu tiên GIỐNG với khởi tạo
```
Khởi tạo: t=100, object_type="empty", stable_since=100
Event 1:  t=110, object_type="empty"
  → old == new → stable_since = 100 (giữ nguyên) ✅
  → stable_duration = 110 - 100 = 10s < 30s → KHÔNG TRIGGER ✅

Event 2:  t=120, object_type="empty"
  → old == new → stable_since = 100 (giữ nguyên)
  → stable_duration = 120 - 100 = 20s < 30s → KHÔNG TRIGGER ✅

Event 3:  t=140, object_type="empty"
  → old == new → stable_since = 100 (giữ nguyên)
  → stable_duration = 140 - 100 = 40s > 30s → TRIGGER ✅
```

### Scenario 3: Trạng thái thay đổi giữa chừng
```
Khởi tạo: t=100, object_type="empty", stable_since=100
Event 1:  t=110, object_type="shelf"
  → old != new → stable_since = 110 ✅

Event 2:  t=120, object_type="shelf"
  → stable_duration = 120 - 110 = 10s < 30s

Event 3:  t=125, object_type="empty"  ← Thay đổi!
  → old != new → stable_since = 125 ✅ (RESET)
  → stable_duration = 125 - 125 = 0s < 30s → KHÔNG TRIGGER ✅

Event 4:  t=135, object_type="empty"
  → stable_duration = 135 - 125 = 10s < 30s

Event 5:  t=160, object_type="empty"
  → stable_duration = 160 - 125 = 35s > 30s → TRIGGER ✅
```

## Kết luận

✅ Không còn trigger ngay khi khởi động  
✅ Phải đợi đủ `stability_time_sec` (30s) thì mới trigger  
✅ Khi state thay đổi → reset lại timer  
✅ Khi state không đổi → giữ nguyên timer để đếm đúng thời gian ổn định

