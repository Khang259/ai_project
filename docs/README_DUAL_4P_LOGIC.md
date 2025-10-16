# 🚀 CƠ CHẾ LOGIC PUBLISH DUAL 4-POINT (4P)

## 🎯 TỔNG QUAN

**Dual 4-Point** là một loại pair đặc biệt bao gồm **4 QR codes**:
- **2 start slots**: `start_qr` và `start_qr_2`
- **2 end slots**: `end_qrs` và `end_qrs_2`

Được sử dụng cho các tuyến đường phức tạp cần **2 điểm xuất phát** và **2 điểm đến**.

---

## 📋 CẤU HÌNH

### Config trong `slot_pairing_config.json`:

```json
{
  "dual": [
    {
      "start_qr": 10000628,      // Start slot 1 (điểm xuất phát chính)
      "end_qrs": 10000386,       // End slot 1 (điểm đến chính)
      "start_qr_2": 10000374,    // Start slot 2 (điểm xuất phát phụ)
      "end_qrs_2": 10000124      // End slot 2 (điểm đến phụ)
    }
  ]
}
```

### Giải thích:

```
Route 4-Point:

  [start_qr] ──────────> [end_qrs]
      │                       │
      │                       │
      └──> [start_qr_2] ──────┘
                 │
                 └──────────> [end_qrs_2]
```

---

## 🔍 LOGIC PUBLISH DUAL 4-POINT

### **BƯỚC 1: Kiểm tra CẶP ĐẦU TIÊN (BẮT BUỘC)**

Dòng 570-577 trong `_evaluate_dual_pairs()`:

```python
# Check first pair: start_qr == shelf (1) && end_qrs == empty (0)
start_ok, start_since = self._is_slot_stable(start_cam, start_slot, expect_status="shelf")
if not start_ok or start_since is None:
    continue  # ❌ Không đủ điều kiện

end_ok, end_since = self._is_slot_stable(end_cam, end_slot, expect_status="empty")
if not end_ok or end_since is None:
    continue  # ❌ Không đủ điều kiện
```

**✅ Điều kiện BẮT BUỘC:**
- `start_qr` = **shelf** (có hàng) và **stable ≥ 20s**
- `end_qrs` = **empty** (trống) và **stable ≥ 20s**

📌 **Nếu không thỏa mãn → DỪNG, không kiểm tra tiếp**

---

### **BƯỚC 2: Kiểm tra CẶP THỨ HAI (QUY ĐỊNH 4P vs 2P)**

Dòng 579-602:

```python
# First pair is stable, now check second pair
if not start_cam_slot_2 or not end_cam_slot_2:
    # If second pair not configured, publish 2-point dual
    stable_since_epoch = max(start_since, end_since)
    self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=False)
    continue
```

#### **Case 2.1: Không có cặp thứ 2 trong config**

Nếu `start_qr_2` hoặc `end_qrs_2` không tồn tại:

```python
if not start_cam_slot_2 or not end_cam_slot_2:
    # → Publish 2-Point Dual
```

**→ PUBLISH 2-POINT** (chỉ có `start_qr` → `end_qrs`)

---

#### **Case 2.2: Có cặp thứ 2 - Kiểm tra `start_qr_2` status**

Dòng 589-602:

```python
# Check start_qr_2 status
start_2_ok, start_2_since = self._is_slot_stable(start_cam_2, start_slot_2, expect_status="shelf")

if start_2_ok and start_2_since is not None:
    # start_qr_2 == 1 (shelf), publish 4-point dual
    # Chỉ cần start_qr_2 == shelf là đủ, không cần kiểm tra end_qrs_2
    stable_since_epoch = max(start_since, end_since, start_2_since)
    self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=True)
else:
    # start_qr_2 == 0 (empty), publish 2-point dual
    start_2_empty_ok, start_2_empty_since = self._is_slot_stable(start_cam_2, start_slot_2, expect_status="empty")
    if start_2_empty_ok and start_2_empty_since is not None:
        stable_since_epoch = max(start_since, end_since, start_2_empty_since)
        self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=False)
```

---

### **BẢNG QUYẾT ĐỊNH 4P vs 2P**

| start_qr | end_qrs | start_qr_2 | end_qrs_2 | Kết quả |
|----------|---------|------------|-----------|---------|
| ❌ empty | - | - | - | ❌ KHÔNG publish |
| ✅ shelf | ❌ shelf | - | - | ❌ KHÔNG publish |
| ✅ shelf | ✅ empty | ❌ Không có | - | ✅ Publish **2P** |
| ✅ shelf | ✅ empty | ✅ **shelf** | ⚪ Bất kỳ | ✅ Publish **4P** |
| ✅ shelf | ✅ empty | ❌ empty | - | ✅ Publish **2P** |

**📌 LƯU Ý QUAN TRỌNG:**
- **CHỈ CẦN** `start_qr_2` = **shelf** là đủ để publish 4P
- **KHÔNG CẦN** kiểm tra `end_qrs_2` status!

---

## 🎬 FLOW HOÀN CHỈNH - PUBLISH DUAL 4P

### **Ví dụ cụ thể:**

Config:
```json
{
  "start_qr": 10000628,
  "end_qrs": 10000386,
  "start_qr_2": 10000374,
  "end_qrs_2": 10000124
}
```

---

### **Timeline:**

```
T=0s:   slot 10000628 = empty
        slot 10000386 = shelf
        slot 10000374 = empty
        slot 10000124 = shelf
        ➜ Chưa đủ điều kiện (start_qr chưa có hàng)

T=10s:  Hàng được đặt vào slot 10000628 → shelf
        ➜ start_qr chưa stable (10s < 20s)

T=22s:  slot 10000628 = shelf (stable 12s) ✅ (chưa đủ 20s)
        slot 10000386 = shelf
        ➜ end_qrs không phải empty → Chờ

T=30s:  Hàng bị lấy từ slot 10000386 → empty
        slot 10000628 = shelf (stable 20s) ✅
        slot 10000386 = empty (chưa stable)
        ➜ end_qrs chưa stable → Chờ

T=50s:  slot 10000628 = shelf (stable 40s) ✅
        slot 10000386 = empty (stable 20s) ✅
        slot 10000374 = empty (stable)
        ➜ CẶP ĐẦU TIÊN ĐÃ STABLE!
        ➜ Kiểm tra cặp thứ 2...
        ➜ start_qr_2 = empty → KHÔNG publish 4P
        ➜ start_qr_2 = empty (stable) → PUBLISH 2P
        ➜ 🚀 PUBLISH DUAL 2-POINT

T=60s:  Hàng được đặt vào slot 10000374 → shelf
        ➜ start_qr_2 chưa stable

T=80s:  slot 10000628 = shelf (stable 70s) ✅
        slot 10000386 = empty (stable 50s) ✅
        slot 10000374 = shelf (stable 20s) ✅
        ➜ CẶP ĐẦU TIÊN: stable ✅
        ➜ start_qr_2 = shelf (stable) ✅
        ➜ ✅ TẤT CẢ ĐIỀU KIỆN THỎA MÃN!
        ➜ 🎉 PUBLISH DUAL 4-POINT!
```

---

## 📦 PAYLOAD DUAL 4-POINT

### **Payload được publish vào queue:**

Dòng 302-310 trong `_maybe_publish_dual()`:

```python
if is_four_points:
    payload = {
        "dual_id": dual_id,
        "start_slot": str(start_qr),        # 10000628
        "end_slot": str(end_qrs),           # 10000386
        "start_slot_2": str(start_qr_2),    # 10000374
        "end_slot_2": str(end_qrs_2),       # 10000124
        "stable_since": "2024-10-16T10:30:45.123Z",
    }
```

### **Ví dụ payload thực tế:**

```json
{
  "dual_id": "10000628-> 10000386-> 10000374-> 10000124",
  "start_slot": "10000628",
  "end_slot": "10000386",
  "start_slot_2": "10000374",
  "end_slot_2": "10000124",
  "stable_since": "2024-10-16T10:30:45.123Z"
}
```

### **Topic:**
```
"stable_dual"
```

---

## ⏱️ ĐIỀU KIỆN THỜI GIAN

### **1. Stable Time (Mặc định: 20s)**

Dòng 111:
```python
stable_seconds: float = 20.0
```

**Tất cả các slots phải stable:**
- `start_qr`: shelf ≥ 20s
- `end_qrs`: empty ≥ 20s
- `start_qr_2`: shelf ≥ 20s (cho 4P)

### **2. Cooldown Time (Mặc định: 10s)**

Dòng 111:
```python
cooldown_seconds: float = 10.0
```

Sau khi publish, dual_id này sẽ bị block trong 10s.

### **3. Duplicate Prevention (Theo phút)**

Dòng 289-290:
```python
if self._is_dual_already_published_this_minute(dual_id, stable_since_epoch):
    return
```

Không publish cùng `dual_id` nhiều lần trong cùng phút (YYYY-MM-DD HH:MM).

---

## 🔐 DUAL BLOCKING SYSTEM

### **Block sau khi publish:**

Dòng 328-329:
```python
# Block start_qr sau khi publish dual
self._publish_dual_block(dual_config, dual_id)
```

### **Block message:**

Dòng 361-369:
```python
block_payload = {
    "dual_id": dual_id,
    "start_qr": start_qr,
    "end_qrs": end_qrs,
    "action": "block",
    "timestamp": datetime.utcnow().isoformat()
}

self.queue.publish("dual_block", dual_id, block_payload)
```

**Mục đích:**
- Block `start_qr` để tránh phát hiện lại cặp này
- `roi_processor` sẽ nhận message và bỏ qua detection ở `start_qr`

### **Unblock khi nào?**

Khi `end_qrs` **stable shelf ≥ 20s** (hàng đã được đặt vào điểm đến):

Dòng 424-452 trong `_unblock_dual_start()`:
```python
unblock_payload = {
    "dual_id": dual_id,
    "start_qr": start_qr,
    "end_qrs": end_qrs,
    "action": "unblock",
    "reason": "end_qrs_stable_shelf",
    "timestamp": datetime.utcnow().isoformat()
}

self.queue.publish("dual_unblock", dual_id, unblock_payload)
```

---

## 📊 SO SÁNH DUAL 2P vs 4P

| Tiêu chí | Dual 2-Point | Dual 4-Point |
|----------|--------------|--------------|
| **Số QR codes** | 2 (start, end) | 4 (start, end, start_2, end_2) |
| **Điều kiện start_qr** | shelf (stable 20s) | shelf (stable 20s) |
| **Điều kiện end_qrs** | empty (stable 20s) | empty (stable 20s) |
| **Điều kiện start_qr_2** | empty (stable 20s) | **shelf (stable 20s)** |
| **Điều kiện end_qrs_2** | - | ⚪ **Không kiểm tra** |
| **Payload fields** | dual_id, start_slot, end_slot | dual_id, start_slot, end_slot, start_slot_2, end_slot_2 |
| **dual_id format** | "A-> B" | "A-> B-> C-> D" |

---

## 💡 TẠI SAO KHÔNG KIỂM TRA `end_qrs_2`?

### **Lý do thiết kế:**

1. **Giả định về route:**
   - `end_qrs_2` là điểm đến cuối cùng chung cho nhiều route
   - Không cần thiết phải trống ngay lập tức

2. **Tính linh hoạt:**
   - Cho phép nhiều route cùng đến `end_qrs_2`
   - Không bị block nếu `end_qrs_2` đang bận

3. **Logic đơn giản:**
   - Chỉ cần quan tâm đến 2 điểm xuất phát có hàng hay không
   - `start_qr_2` = shelf → Có hàng ở điểm phụ → Route 4P

---

## 🔍 DEBUG & LOG

### **Console log khi publish 4P:**

```
[PAIR_LOGIC] Evaluating dual: 10000628-> 10000386-> 10000374-> 10000124
[PAIR_LOGIC] start_qr=10000628 stable shelf ✅
[PAIR_LOGIC] end_qrs=10000386 stable empty ✅
[PAIR_LOGIC] start_qr_2=10000374 stable shelf ✅
[PAIR_LOGIC] → Publishing 4-POINT dual
```

### **File log:**

```
2024-10-16 10:30:45 - pair_publish - INFO - STABLE_DUAL_4P_PUBLISHED: dual_id=10000628-> 10000386-> 10000374-> 10000124, start_slot=10000628, end_slot=10000386, start_slot_2=10000374, end_slot_2=10000124, stable_since=2024-10-16T10:30:45.123Z
```

### **Block log:**

```
2024-10-16 10:30:45 - block_unblock - INFO - DUAL_BLOCK_PUBLISHED: dual_id=10000628-> 10000386-> 10000374-> 10000124, start_qr=10000628, end_qrs=10000386, action=block
```

### **Unblock log:**

```
2024-10-16 10:32:15 - block_unblock - INFO - DUAL_UNBLOCK_PUBLISHED: dual_id=10000628-> 10000386-> 10000374-> 10000124, start_qr=10000628, end_qrs=10000386, reason=end_qrs_stable_shelf
```

---

## 🎯 TÓM TẮT ĐIỀU KIỆN PUBLISH DUAL 4P

### ✅ **Điều kiện BẮT BUỘC:**

1. ✅ `start_qr` = **shelf** (stable ≥ 20s)
2. ✅ `end_qrs` = **empty** (stable ≥ 20s)
3. ✅ `start_qr_2` = **shelf** (stable ≥ 20s)
4. ✅ Chưa publish trong **10s** gần nhất (cooldown)
5. ✅ Chưa publish trong **phút hiện tại**

### ⚪ **KHÔNG cần kiểm tra:**

- ❌ `end_qrs_2` status (có thể shelf hoặc empty)

### 📝 **Công thức:**

```
IF (start_qr == shelf AND stable >= 20s)
AND (end_qrs == empty AND stable >= 20s)
AND (start_qr_2 == shelf AND stable >= 20s)
AND (NOT published in last 10s)
AND (NOT published in current minute)
THEN
    → PUBLISH DUAL 4-POINT
```

---

## 🚀 LUỒNG XỬ LÝ SAU KHI PUBLISH

```
1. Publish "stable_dual" topic
   ↓
2. postAPI.py nhận message
   ↓
3. Tạo orderId (timestamp + random)
   ↓
4. Build payload với 4 QR codes
   ↓
5. POST to API: taskPath = "start,end,start_2,end_2"
   ↓
6. Nếu POST thành công:
   - AMR/Robot nhận nhiệm vụ
   - Di chuyển theo route 4-point
   ↓
7. Nếu POST thất bại:
   - Retry 3 lần
   - Sau đó unlock start_qr sau 60s
```

---

## 📚 CÁC HÀM LIÊN QUAN

| Hàm | Dòng | Chức năng |
|-----|------|-----------|
| `_evaluate_dual_pairs()` | 550-602 | Logic chính kiểm tra điều kiện 4P |
| `_maybe_publish_dual()` | 276-329 | Publish dual (2P hoặc 4P) vào queue |
| `_publish_dual_block()` | 349-386 | Block start_qr sau khi publish |
| `_unblock_dual_start()` | 424-452 | Unblock start_qr khi end_qrs stable shelf |
| `_is_slot_stable()` | 242-251 | Kiểm tra slot stable theo status |

---

## ✅ KẾT LUẬN

**Dual 4-Point** được publish khi:
- ✅ Cặp đầu tiên (start → end) **cả 2 đều stable**
- ✅ `start_qr_2` **có hàng** (shelf) và **stable**
- ✅ Các điều kiện cooldown & duplicate thỏa mãn

**Điểm đặc biệt:**
- 🎯 **Không cần** kiểm tra `end_qrs_2`
- 🎯 Tự động **block** `start_qr` sau khi publish
- 🎯 Tự động **unblock** khi `end_qrs` stable shelf

**Mục đích:**
- Hỗ trợ route phức tạp với 2 điểm xuất phát
- Tối ưu hóa vận chuyển với nhiều nguồn hàng

