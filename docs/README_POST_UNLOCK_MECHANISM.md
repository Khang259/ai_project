# 🔓 CƠ CHẾ UNLOCK KHI POST REQUEST THẤT BẠI

## 🎯 TỔNG QUAN

Khi POST request đến API **thất bại sau 3 lần thử**, hệ thống sẽ tự động gửi **unlock message** sau **60 giây** để giải phóng `start_slot`.

**Áp dụng cho:**
- ✅ Regular Pairs (`stable_pairs`)
- ✅ Dual Pairs (`stable_dual` - cả 2P và 4P)

---

## 🔍 LOGIC HOÀN CHỈNH

### **BƯỚC 1: Nhận message từ queue**

```python
# Đọc message từ topic "stable_pairs" hoặc "stable_dual"
for topic in ["stable_pairs", "stable_dual"]:
    rows = get_after_id_topic(queue, topic, last_id, limit=200)
    for r in rows:
        payload = r["payload"]
```

---

### **BƯỚC 2: Tạo orderId và build payload**

```python
# Tạo orderId unique
order_id = get_next_order_id()  # Format: {timestamp_ms}{random_salt}

# Build payload tùy theo loại
if topic == "stable_pairs":
    body = build_payload_from_pair(pair_id, start_slot, end_slot, order_id)
elif topic == "stable_dual":
    body = build_payload_from_dual(payload, order_id)
```

---

### **BƯỚC 3: Retry logic - Thử 3 lần**

Dòng 379-394:

```python
ok = False
for attempt in range(3):  # Thử 3 lần (0, 1, 2)
    print(f"\n--- Lần thử {attempt + 1}/3 cho OrderID: {order_id} ---")
    
    if send_post(body, logger):
        ok = True
        print(f"\n✓ HOÀN THÀNH THÀNH CÔNG | Attempt: {attempt + 1}/3")
        break  # Thành công → Dừng retry
    else:
        print(f"⚠ Lần thử {attempt + 1} thất bại")
        
        if attempt < 2:  # Chỉ sleep nếu còn lần thử
            time.sleep(2)  # Đợi 2 giây trước khi thử lại
```

**Timeline:**
```
Attempt 1: POST → Thất bại → Sleep 2s
Attempt 2: POST → Thất bại → Sleep 2s
Attempt 3: POST → Thất bại → Không sleep (đã hết lần thử)
```

---

### **BƯỚC 4: Gửi unlock message nếu tất cả đều thất bại**

Dòng 396-403:

```python
if not ok:
    # TẤT CẢ 3 LẦN ĐỀU THẤT BẠI
    fail_msg = f"\n✗ THẤT BẠI HOÀN TOÀN | {topic}={pair_id} | OrderID: {order_id}"
    print(fail_msg)
    
    # Gửi unlock message sau 60 giây
    unlock_msg = f"[UNLOCK_SCHEDULE] Sẽ unlock start_slot={start_slot} sau 60 giây"
    print(unlock_msg)
    
    send_unlock_after_delay(queue, pair_id, start_slot, delay_seconds=60)
```

---

## 🔓 UNLOCK MECHANISM CHI TIẾT

### **Hàm `send_unlock_after_delay()` (Dòng 179-205)**

```python
def send_unlock_after_delay(queue: SQLiteQueue, pair_id: str, start_slot: str, delay_seconds: int = 60) -> None:
    """
    Gửi unlock message vào queue sau delay_seconds giây
    
    Args:
        queue: SQLiteQueue instance
        pair_id: ID của pair (hoặc dual_id)
        start_slot: QR code của ô start (dạng string)
        delay_seconds: Thời gian delay (mặc định 60s)
    """
    def _delayed_unlock():
        time.sleep(delay_seconds)  # Đợi 60 giây
        
        try:
            unlock_payload = {
                "pair_id": pair_id,
                "start_slot": start_slot,
                "reason": "post_failed_after_retries",
                "timestamp": datetime.now().isoformat()
            }
            
            # Publish vào queue
            queue.publish("unlock_start_slot", start_slot, unlock_payload)
            
            print(f"[UNLOCK_SCHEDULED] Đã gửi unlock message cho start_slot={start_slot}")
        except Exception as e:
            print(f"[ERR] Lỗi khi gửi unlock message: {e}")
    
    # Tạo thread để chạy background (daemon=True)
    thread = threading.Thread(target=_delayed_unlock, daemon=True)
    thread.start()
```

### **Đặc điểm:**
- ✅ **Non-blocking**: Chạy trong thread riêng, không làm chậm main loop
- ✅ **Daemon thread**: Tự động dừng khi chương trình exit
- ✅ **Delay 60s**: Đợi 1 phút trước khi unlock
- ✅ **Error handling**: Catch exception nếu publish thất bại

---

## 📦 UNLOCK PAYLOAD

### **Topic:**
```
"unlock_start_slot"
```

### **Key:**
```python
start_slot  # Ví dụ: "10000628"
```

### **Payload:**
```json
{
  "pair_id": "62 -> 13",                    // Hoặc dual_id cho dual pairs
  "start_slot": "62",                       // QR code của start slot
  "reason": "post_failed_after_retries",    // Lý do unlock
  "timestamp": "2024-10-16T10:35:45.123456" // Thời điểm gửi unlock
}
```

---

## 🎬 VÍ DỤ THỰC TẾ

### **Case 1: Regular Pair thất bại**

**Input từ queue:**
```json
{
  "topic": "stable_pairs",
  "payload": {
    "pair_id": "62 -> 13",
    "start_slot": "62",
    "end_slot": "13",
    "stable_since": "2024-10-16T10:30:00Z"
  }
}
```

**Timeline:**

```
T=0s:   Nhận message từ queue
        pair_id = "62 -> 13"
        start_slot = "62"
        end_slot = "13"

T=0s:   Tạo orderId = "1729085400000a1b2"

T=0s:   Build payload:
        {
          "modelProcessCode": "checking_camera_work",
          "fromSystem": "ICS",
          "orderId": "1729085400000a1b2",
          "taskOrderDetail": [{
            "taskPath": "62,13"
          }]
        }

T=0s:   Attempt 1: POST to API → FAILED (timeout)
        Sleep 2s

T=2s:   Attempt 2: POST to API → FAILED (connection error)
        Sleep 2s

T=4s:   Attempt 3: POST to API → FAILED (HTTP 500)
        Không sleep (đã hết lần thử)

T=4s:   ✗ THẤT BẠI HOÀN TOÀN sau 3 lần thử
        
        → Start unlock thread:
           Sleep 60s → Publish unlock message

T=64s:  Unlock message được publish vào queue:
        Topic: "unlock_start_slot"
        Key: "62"
        Payload: {
          "pair_id": "62 -> 13",
          "start_slot": "62",
          "reason": "post_failed_after_retries",
          "timestamp": "2024-10-16T10:31:04.123456"
        }
```

**Console log:**
```
============================================================
XỬ LÝ MESSAGE MỚI | Topic: stable_pairs | ID: 123
============================================================
Bắt đầu xử lý regular pair: 62 -> 13, orderId=1729085400000a1b2
Bắt đầu retry logic cho OrderID: 1729085400000a1b2

--- Lần thử 1/3 cho OrderID: 1729085400000a1b2 ---
=== POST REQUEST ===
URL: http://192.168.1.169:7000/ics/taskOrder/addTask
OrderID: 1729085400000a1b2
TaskPath: 62,13
[ERROR] ✗ Request timeout sau 10s | OrderID: 1729085400000a1b2
⚠ Lần thử 1 thất bại, 2 giây trước khi thử lại...

--- Lần thử 2/3 cho OrderID: 1729085400000a1b2 ---
=== POST REQUEST ===
[ERROR] ✗ Connection error | OrderID: 1729085400000a1b2
⚠ Lần thử 2 thất bại, 2 giây trước khi thử lại...

--- Lần thử 3/3 cho OrderID: 1729085400000a1b2 ---
=== POST REQUEST ===
[ERROR] ✗ HTTP 500 | OrderID: 1729085400000a1b2
⚠ Lần thử 3 thất bại, 0 giây trước khi thử lại...

✗ THẤT BẠI HOÀN TOÀN | stable_pairs=62 -> 13 | OrderID: 1729085400000a1b2 | Đã thử 3 lần
[UNLOCK_SCHEDULE] Sẽ unlock start_slot=62 sau 60 giây do POST thất bại
============================================================
KẾT THÚC XỬ LÝ MESSAGE | ID: 123 | Status: FAILED
============================================================

... (60 giây sau) ...

[UNLOCK_SCHEDULED] Đã gửi unlock message cho start_slot=62 sau 60s
```

---

### **Case 2: Dual 4P thất bại**

**Input từ queue:**
```json
{
  "topic": "stable_dual",
  "payload": {
    "dual_id": "10000628-> 10000386-> 10000374-> 10000124",
    "start_slot": "10000628",
    "end_slot": "10000386",
    "start_slot_2": "10000374",
    "end_slot_2": "10000124",
    "stable_since": "2024-10-16T10:30:00Z"
  }
}
```

**Timeline:**

```
T=0s:   Nhận dual 4P message
        dual_id = "10000628-> 10000386-> 10000374-> 10000124"
        start_slot = "10000628"

T=0s:   Build payload:
        taskPath = "10000628,10000386,10000374,10000124"

T=0-4s: Retry 3 lần → Tất cả thất bại

T=4s:   Start unlock thread cho start_slot="10000628"

T=64s:  Unlock message published:
        {
          "pair_id": "10000628-> 10000386-> 10000374-> 10000124",
          "start_slot": "10000628",
          "reason": "post_failed_after_retries",
          "timestamp": "2024-10-16T10:31:04.789012"
        }
```

**Lưu ý quan trọng:**
- ✅ Dual 4P chỉ unlock **start_slot** (điểm xuất phát chính)
- ✅ **KHÔNG** unlock start_slot_2 (điểm xuất phát phụ)

---

## 📊 BẢNG TÓM TẮT

| Trường hợp | Retry | Kết quả | Hành động |
|------------|-------|---------|-----------|
| **Attempt 1 thành công** | 1/3 | ✅ Success | Dừng, không retry, không unlock |
| **Attempt 2 thành công** | 2/3 | ✅ Success | Dừng, không unlock |
| **Attempt 3 thành công** | 3/3 | ✅ Success | Dừng, không unlock |
| **Tất cả thất bại** | 3/3 | ❌ Failed | 🔓 Unlock sau 60s |

---

## ⏱️ TIMELINE CHI TIẾT

```
T=0s:    Nhận message từ queue
         ↓
T=0s:    Attempt 1: POST
         ↓
         ├─ ✅ Success → DỪNG (không unlock)
         │
         ├─ ❌ Failed → Sleep 2s
         ↓
T=2s:    Attempt 2: POST
         ↓
         ├─ ✅ Success → DỪNG (không unlock)
         │
         ├─ ❌ Failed → Sleep 2s
         ↓
T=4s:    Attempt 3: POST
         ↓
         ├─ ✅ Success → DỪNG (không unlock)
         │
         ├─ ❌ Failed → Start unlock thread
         ↓
T=4s:    Background thread: Sleep 60s
         ↓
T=64s:   Publish unlock message vào queue
```

---

## 🔍 DEBUG & LOG

### **Log file (`post_api.log`):**

**Khi POST thất bại:**
```
2024-10-16 10:30:00 - post_api - INFO - POST_REQUEST_START: orderId=1729085400000a1b2, taskPath=62,13
2024-10-16 10:30:10 - post_api - ERROR - POST_REQUEST_TIMEOUT: orderId=1729085400000a1b2, taskPath=62,13, timeout=10s
2024-10-16 10:30:12 - post_api - ERROR - POST_REQUEST_CONNECTION_ERROR: orderId=1729085400000a1b2, taskPath=62,13
2024-10-16 10:30:14 - post_api - ERROR - POST_REQUEST_HTTP_ERROR: orderId=1729085400000a1b2, taskPath=62,13, status_code=500
```

### **Console output:**
```
[UNLOCK_SCHEDULE] Sẽ unlock start_slot=62 sau 60 giây do POST thất bại

... (60 giây sau) ...

[UNLOCK_SCHEDULED] Đã gửi unlock message cho start_slot=62 sau 60s
```

---

## 💡 TẠI SAO 60 GIÂY?

### **Lý do thiết kế:**

1. **Tránh spam unlock ngay lập tức**
   - Nếu unlock ngay → Có thể phát hiện lại pair ngay lập tức
   - Tạo vòng lặp vô hạn: detect → publish → POST fail → unlock → detect lại

2. **Cho phép can thiệp thủ công**
   - 60 giây là thời gian đủ để admin kiểm tra
   - Có thể restart service hoặc fix lỗi trong thời gian này

3. **Tránh overload hệ thống**
   - API server có thể đang quá tải
   - 60s là buffer time để hệ thống recover

4. **Phù hợp với stable time**
   - Stable time = 20s
   - Unlock sau 60s → Cần thêm 20s nữa mới có thể publish lại
   - Tổng: 80s giữa 2 lần publish cho cùng pair

---

## 🔄 FLOW HOÀN CHỈNH

```
┌─────────────────────────────────────────┐
│ stable_pair_processor.py                │
│ Phát hiện pair stable                   │
│ → Publish "stable_pairs"                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ postAPI.py                              │
│ Subscribe "stable_pairs"                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Retry 3 lần POST to API                │
│ Attempt 1 → Failed                      │
│ Attempt 2 → Failed                      │
│ Attempt 3 → Failed                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Start unlock thread                     │
│ Sleep 60s                               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Publish "unlock_start_slot"             │
│ {                                       │
│   "start_slot": "62",                   │
│   "reason": "post_failed_after_retries" │
│ }                                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ roi_processor.py (hoặc component khác)  │
│ Subscribe "unlock_start_slot"           │
│ → Xử lý unlock logic                    │
└─────────────────────────────────────────┘
```

---

## 📝 CHECKLIST

### **Điều kiện gửi unlock:**
- ✅ POST request thất bại sau **3 lần thử**
- ✅ Áp dụng cho cả **stable_pairs** và **stable_dual**
- ✅ Unlock sau **60 giây**
- ✅ Chỉ unlock **start_slot** (không unlock end_slot)

### **Thông tin trong unlock message:**
- ✅ `pair_id` hoặc `dual_id`
- ✅ `start_slot` (QR code)
- ✅ `reason`: "post_failed_after_retries"
- ✅ `timestamp`: Thời điểm gửi unlock

### **Đặc điểm kỹ thuật:**
- ✅ Non-blocking (background thread)
- ✅ Daemon thread (tự động dừng khi exit)
- ✅ Error handling
- ✅ Log chi tiết

---

## ✅ TÓM TẮT

**Cơ chế unlock khi POST thất bại:**

```
1. Nhận message từ queue (stable_pairs hoặc stable_dual)
   ↓
2. Retry POST 3 lần (với 2s delay giữa các lần)
   ↓
3. Nếu TẤT CẢ thất bại:
   - Start background thread
   - Sleep 60 giây
   - Publish unlock message vào queue
   ↓
4. Component khác subscribe và xử lý unlock
```

**Tham số:**
- Số lần retry: **3**
- Delay giữa các retry: **2 giây**
- Delay trước khi unlock: **60 giây**
- Topic unlock: **"unlock_start_slot"**

**Mục đích:**
- Tránh pair bị "stuck" khi API down
- Cho phép hệ thống tự phục hồi
- Tránh spam detect lại ngay lập tức

