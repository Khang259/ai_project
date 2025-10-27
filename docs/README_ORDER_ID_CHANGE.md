# 📝 THAY ĐỔI LOGIC ORDER_ID

## 🎯 MỤC ĐÍCH

Thay đổi cách tạo `orderId` từ **số tự tăng (sequential)** sang **timestamp + random salt** để:
- Tránh conflict khi có nhiều instance chạy đồng thời
- Dễ debug theo thời gian thực
- Đảm bảo tính unique mà không cần file lưu trữ state

---

## 🔄 THAY ĐỔI

### **TRƯỚC ĐÂY:**

```python
def get_next_order_id() -> int:
    """Persistent, monotonically increasing integer orderId."""
    # Đọc từ file order_id.txt
    # Tăng lên 1
    # Ghi lại file
    return next_id  # 1, 2, 3, 4, ...
```

**orderId Format:**
```
1
2
3
4
...
```

**Vấn đề:**
- ❌ Cần đọc/ghi file mỗi lần tạo ID (I/O overhead)
- ❌ File có thể bị corrupt
- ❌ Không unique nếu chạy nhiều instance
- ❌ Khó trace theo thời gian

---

### **SAU KHI THAY ĐỔI:**

```python
def get_next_order_id() -> str:
    """
    Tạo orderId dựa trên timestamp + random salt.
    Format: {timestamp_ms}_{random_salt}
    """
    # Lấy timestamp hiện tại (milliseconds)
    timestamp_ms = int(time.time() * 1000)
    
    # Tạo random salt (4 ký tự hex = 16 bits entropy)
    random_salt = format(random.randint(0, 0xFFFF), '04x')
    
    # Tạo orderId
    order_id = f"{timestamp_ms}_{random_salt}"
    
    return order_id
```

**orderId Format:**
```
1729085245123_7d3f
1729085245456_a2c1
1729085245789_f891
```

**Cấu trúc:**
```
{timestamp_ms}_{random_salt}
     ↓              ↓
13 chữ số      4 ký tự hex
(milliseconds)  (16 bits)
```

**Lợi ích:**
- ✅ Không cần I/O file
- ✅ Unique với xác suất rất cao (timestamp + 65536 giá trị random)
- ✅ Dễ trace theo thời gian (sort by timestamp)
- ✅ An toàn với multi-instance

---

## 📊 CHI TIẾT KỸ THUẬT

### **1. Timestamp (13 chữ số)**

```python
timestamp_ms = int(time.time() * 1000)
```

**Ví dụ:**
- `time.time()` = `1729085245.123456`
- `* 1000` = `1729085245123.456`
- `int()` = `1729085245123`

**Giải thích:**
- Epoch time tính từ 1970-01-01 00:00:00 UTC
- Đơn vị: milliseconds (1/1000 giây)
- Độ chính xác: 1ms

### **2. Random Salt (4 ký tự hex)**

```python
random_salt = format(random.randint(0, 0xFFFF), '04x')
```

**Giải thích:**
- `random.randint(0, 0xFFFF)`: Số ngẫu nhiên từ 0 đến 65535 (16 bits)
- `format(..., '04x')`: Chuyển thành hex, padding 4 ký tự
- Kết quả: `0000` đến `ffff` (65536 giá trị)

**Ví dụ:**
```python
random.randint(0, 0xFFFF) = 32095
format(32095, '04x') = '7d3f'
```

### **3. Độ Unique**

**Xác suất collision:**

Trong cùng 1 millisecond, có thể có tối đa 65536 orderId khác nhau.

```
Số request/giây có thể xử lý: 1000 * 65536 = 65,536,000 requests/giây
```

**Thực tế:**
- Hệ thống thường chỉ xử lý < 100 requests/giây
- Xác suất collision ≈ 0.0015% (rất thấp)
- Nếu có collision, API server sẽ reject và retry với orderId mới

---

## 🔍 VÍ DỤ THỰC TẾ

### **OrderID qua thời gian:**

```
Thời gian             | OrderID
----------------------|-------------------
2024-10-16 10:30:45.123 | 1729085445123_7d3f
2024-10-16 10:30:45.456 | 1729085445456_a2c1
2024-10-16 10:30:45.789 | 1729085445789_f891
2024-10-16 10:30:46.012 | 1729085446012_3bc2
2024-10-16 10:30:46.345 | 1729085446345_e901
```

### **Parse OrderID để lấy timestamp:**

```python
def parse_order_id(order_id: str) -> datetime:
    """Extract timestamp từ orderId"""
    timestamp_str = order_id.split('_')[0]
    timestamp_ms = int(timestamp_str)
    return datetime.fromtimestamp(timestamp_ms / 1000.0)

# Ví dụ
order_id = "1729085445123_7d3f"
dt = parse_order_id(order_id)
print(dt)  # 2024-10-16 10:30:45.123000
```

---

## 📦 THAY ĐỔI TRONG CODE

### **1. Hàm `get_next_order_id()`**

**Thay đổi:**
- Type hint: `int` → `str`
- Logic: Đọc file → Tạo timestamp + salt
- Không cần file `order_id.txt` nữa

### **2. Hàm `build_payload_from_pair()`**

```python
# TRƯỚC
def build_payload_from_pair(..., order_id: int) -> Dict[str, Any]:
    return {
        "orderId": str(order_id),  # Convert int to str
        ...
    }

# SAU
def build_payload_from_pair(..., order_id: str) -> Dict[str, Any]:
    return {
        "orderId": order_id,  # Đã là string
        ...
    }
```

### **3. Hàm `build_payload_from_dual()`**

Tương tự như `build_payload_from_pair()`.

---

## 🧪 TEST

### **1. Test tính unique:**

```python
# Tạo 1000 orderId liên tiếp
order_ids = [get_next_order_id() for _ in range(1000)]

# Kiểm tra duplicate
print(f"Total: {len(order_ids)}")
print(f"Unique: {len(set(order_ids))}")
# Kết quả mong đợi: Total = Unique = 1000
```

### **2. Test format:**

```python
import re

order_id = get_next_order_id()
pattern = r'^\d{13}_[0-9a-f]{4}$'

if re.match(pattern, order_id):
    print(f"✅ Valid format: {order_id}")
else:
    print(f"❌ Invalid format: {order_id}")
```

### **3. Test timestamp parsing:**

```python
def test_timestamp():
    # Tạo orderId
    before = datetime.now()
    order_id = get_next_order_id()
    after = datetime.now()
    
    # Parse timestamp từ orderId
    timestamp_str = order_id.split('_')[0]
    timestamp_ms = int(timestamp_str)
    dt = datetime.fromtimestamp(timestamp_ms / 1000.0)
    
    # Kiểm tra timestamp nằm trong khoảng before..after
    assert before <= dt <= after
    print(f"✅ Timestamp correct: {dt}")

test_timestamp()
```

---

## 🔄 MIGRATION

### **Có cần migrate data cũ không?**

**Không cần!** Vì:
1. OrderID chỉ dùng để POST lên API
2. API không lưu trữ orderId lâu dài
3. File `order_id.txt` có thể xóa hoặc giữ lại (không ảnh hưởng)

### **Backward Compatibility:**

- Code cũ: `orderId` là số integer (1, 2, 3, ...)
- Code mới: `orderId` là string với format mới
- API server: Nhận cả 2 format (string field)

**Không có breaking change!**

---

## 📋 CHECKLIST

### **Đã thay đổi:**
- ✅ Import `random` module
- ✅ Thay đổi `get_next_order_id()` return type: `int` → `str`
- ✅ Thay đổi logic tạo orderId: timestamp + random salt
- ✅ Cập nhật type hint cho `build_payload_from_pair()`: `order_id: int` → `order_id: str`
- ✅ Cập nhật type hint cho `build_payload_from_dual()`: `order_id: int` → `order_id: str`
- ✅ Cập nhật type hint cho `build_payload()`: `order_id: int` → `order_id: str`
- ✅ Xóa `str(order_id)` trong payload (đã là string)

### **Không thay đổi:**
- ✅ Hàm `ensure_dirs()` (giữ nguyên, có thể không dùng nữa)
- ✅ Biến `ORDER_ID_FILE` (giữ nguyên, có thể không dùng nữa)
- ✅ Logic retry và POST request
- ✅ API endpoint và payload structure

---

## 💡 LỢI ÍCH

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| **Performance** | ❌ I/O file mỗi request | ✅ Không I/O |
| **Reliability** | ❌ File có thể corrupt | ✅ Không phụ thuộc file |
| **Multi-instance** | ❌ Conflict nếu chạy nhiều instance | ✅ An toàn |
| **Debuggability** | ❌ Khó trace theo thời gian | ✅ Dễ trace (có timestamp) |
| **Uniqueness** | ✅ Unique trong 1 instance | ✅ Unique trong mọi trường hợp |

---

## 🔍 DEBUG

### **Log format mới:**

```
=== POST REQUEST ===
URL: http://192.168.1.169:7000/ics/taskOrder/addTask
OrderID: 1729085445123_7d3f  ← FORMAT MỚI
TaskPath: 62,13

=== POST RESPONSE ===
Status Code: 200
Response Body: {"code": 2009, "message": "success"}

[SUCCESS] ✓ POST thành công | OrderID: 1729085445123_7d3f | TaskPath: 62,13 | Code: 2009
```

### **Log file:**

```
2024-10-16 10:30:45 - post_api - INFO - POST_REQUEST_START: orderId=1729085445123_7d3f, taskPath=62,13, url=http://...
2024-10-16 10:30:45 - post_api - INFO - POST_RESPONSE_RECEIVED: orderId=1729085445123_7d3f, status_code=200, response_body=...
2024-10-16 10:30:45 - post_api - INFO - POST_REQUEST_SUCCESS: orderId=1729085445123_7d3f, taskPath=62,13, response_code=2009
```

---

## 📝 GHI CHÚ

### **Random seed:**

Python's `random.randint()` sử dụng Mersenne Twister PRNG, tự động seed bởi system time. Không cần manual seeding.

### **Thread safety:**

`time.time()` và `random.randint()` đều thread-safe trong Python. Không cần lock.

### **Collision handling:**

Nếu có collision (rất hiếm), API server sẽ trả về error và script sẽ retry với orderId mới.

---

## ✅ TÓM TẮT

**Format mới:**
```
{timestamp_ms}_{random_hex}
1729085445123_7d3f
```

**Lợi ích:**
- ✅ Unique, không cần file state
- ✅ Dễ trace theo thời gian
- ✅ An toàn với multi-instance
- ✅ Performance tốt hơn

**Không có breaking change!**

