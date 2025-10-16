# 🔧 SỬA LỖI LOG - HIỂN thị ĐẦY ĐỦ 4 QR CODES

## 🐛 VẤN ĐỀ

**Trước khi sửa:**
- Dual 4P gửi 4 QR codes trong payload
- Nhưng log chỉ hiển thị 2 QR codes đầu tiên
- Gây khó khăn cho việc debug và tracking

---

## ✅ GIẢI PHÁP

Cập nhật logic log để:
- **2 QR codes** (Regular Pair, Dual 2P): Hiển thị `"A,B"`
- **4 QR codes** (Dual 4P): Hiển thị `"A,B | C,D"`

---

## 🔍 THAY ĐỔI CHI TIẾT

### **1. Hàm `send_post()` (Dòng 259-284)**

**Trước:**
```python
def send_post(payload: Dict[str, Any], logger: logging.Logger) -> bool:
    order_id = payload.get('orderId', 'N/A')
    task_path = payload.get('taskOrderDetail', [{}])[0].get('taskPath', 'N/A')
    # ❌ Chỉ lấy object đầu tiên → Mất thông tin object thứ 2
    
    logger.info(f"POST_REQUEST_START: orderId={order_id}, taskPath={task_path}")
    print(f"TaskPath: {task_path}")
```

**Sau:**
```python
def send_post(payload: Dict[str, Any], logger: logging.Logger) -> bool:
    order_id = payload.get('orderId', 'N/A')
    
    # Xử lý taskPath cho cả 1 object (2 QR) và 2 objects (4 QR)
    task_order_detail = payload.get('taskOrderDetail', [])
    if len(task_order_detail) == 1:
        # Regular Pair hoặc Dual 2P (2 QR codes)
        task_path = task_order_detail[0].get('taskPath', 'N/A')
    elif len(task_order_detail) == 2:
        # Dual 4P (4 QR codes) - Hiển thị cả 2 taskPath
        task_path_1 = task_order_detail[0].get('taskPath', 'N/A')
        task_path_2 = task_order_detail[1].get('taskPath', 'N/A')
        task_path = f"{task_path_1} | {task_path_2}"  # ✅ Hiển thị đầy đủ
    else:
        task_path = 'N/A'
    
    logger.info(f"POST_REQUEST_START: orderId={order_id}, taskPath={task_path}")
    print(f"TaskPath: {task_path}")
```

---

### **2. Main loop - Xử lý Dual (Dòng 414-444)**

**Trước:**
```python
elif topic == "stable_dual":
    dual_type = "4-point" if start_slot_2 and end_slot_2 else "2-point"
    
    order_id = get_next_order_id()
    body = build_payload_from_dual(payload, order_id)
    
    task_path = body["taskOrderDetail"][0]["taskPath"]
    # ❌ Chỉ lấy object đầu tiên
    
    print(f"Bắt đầu xử lý {dual_type} dual: {dual_id}, taskPath={task_path}")
```

**Sau:**
```python
elif topic == "stable_dual":
    dual_type = "4-point" if start_slot_2 and end_slot_2 else "2-point"
    
    order_id = get_next_order_id()
    body = build_payload_from_dual(payload, order_id)
    
    # Lấy taskPath đúng cho cả 2P và 4P
    task_order_detail = body["taskOrderDetail"]
    if len(task_order_detail) == 1:
        # Dual 2P
        task_path = task_order_detail[0]["taskPath"]
    else:
        # Dual 4P - Hiển thị cả 2 taskPath
        task_path = f"{task_order_detail[0]['taskPath']} | {task_order_detail[1]['taskPath']}"
        # ✅ Hiển thị đầy đủ cả 2 cặp
    
    print(f"Bắt đầu xử lý {dual_type} dual: {dual_id}, taskPath={task_path}")
```

---

## 📊 SO SÁNH OUTPUT

### **Case 1: Regular Pair (2 QR)**

**Trước và Sau (giống nhau):**
```
TaskPath: 62,13
```

**Log file:**
```
POST_REQUEST_START: orderId=1729085400000a1b2, taskPath=62,13
```

---

### **Case 2: Dual 2P (2 QR)**

**Trước và Sau (giống nhau):**
```
TaskPath: 10000628,10000386
```

**Log file:**
```
POST_REQUEST_START: orderId=1729085400001b2c3, taskPath=10000628,10000386
```

---

### **Case 3: Dual 4P (4 QR)**

**Trước (SAI):**
```
TaskPath: 10000628,10000386
```
❌ Thiếu cặp thứ 2: `10000374,10000124`

**Sau (ĐÚNG):**
```
TaskPath: 10000628,10000386 | 10000374,10000124
```
✅ Hiển thị đầy đủ cả 4 QR codes

**Log file:**
```
POST_REQUEST_START: orderId=1729085400002c3d4, taskPath=10000628,10000386 | 10000374,10000124
POST_REQUEST_SUCCESS: orderId=1729085400002c3d4, taskPath=10000628,10000386 | 10000374,10000124, response_code=1000
```

---

## 🎬 VÍ DỤ LOG HOÀN CHỈNH

### **Dual 4P - Console Output:**

```
============================================================
XỬ LÝ MESSAGE MỚI | Topic: stable_dual | ID: 456
============================================================
Bắt đầu xử lý 4-point dual: 10000628-> 10000386-> 10000374-> 10000124, orderId=1729085400002c3d4, taskPath=10000628,10000386 | 10000374,10000124
Bắt đầu retry logic cho OrderID: 1729085400002c3d4

--- Lần thử 1/3 cho OrderID: 1729085400002c3d4 ---
=== POST REQUEST ===
URL: http://192.168.1.169:7000/ics/taskOrder/addTask
OrderID: 1729085400002c3d4
TaskPath: 10000628,10000386 | 10000374,10000124
Sending JSON (234 bytes)

=== POST RESPONSE ===
Status Code: 200
Response Body: {"code": 1000, "message": "success"}

[SUCCESS] ✓ POST thành công | OrderID: 1729085400002c3d4 | TaskPath: 10000628,10000386 | 10000374,10000124 | Code: 1000

✓ HOÀN THÀNH THÀNH CÔNG | stable_dual | OrderID: 1729085400002c3d4 | Attempt: 1/3
============================================================
KẾT THÚC XỬ LÝ MESSAGE | ID: 456 | Status: SUCCESS
============================================================
```

---

### **Dual 4P - Log File (`post_api.log`):**

```
2024-10-16 14:30:00 - post_api - INFO - POST_REQUEST_START: orderId=1729085400002c3d4, taskPath=10000628,10000386 | 10000374,10000124, url=http://192.168.1.169:7000/ics/taskOrder/addTask
2024-10-16 14:30:01 - post_api - INFO - POST_RESPONSE_RECEIVED: orderId=1729085400002c3d4, status_code=200, response_body={"code": 1000, "message": "success"}
2024-10-16 14:30:01 - post_api - INFO - POST_REQUEST_SUCCESS: orderId=1729085400002c3d4, taskPath=10000628,10000386 | 10000374,10000124, response_code=1000
```

---

## 📝 CÁC ĐIỂM LOG ĐƯỢC CẬP NHẬT

### **1. Console Output:**
- ✅ `print(f"TaskPath: {task_path}")`
- ✅ `print(f"Bắt đầu xử lý {dual_type} dual: ..., taskPath={task_path}")`
- ✅ `print(f"[SUCCESS] ... | TaskPath: {task_path}")`
- ✅ `print(f"[ERROR] ... | TaskPath: {task_path}")`

### **2. File Log:**
- ✅ `logger.info(f"POST_REQUEST_START: ..., taskPath={task_path}")`
- ✅ `logger.info(f"POST_REQUEST_SUCCESS: ..., taskPath={task_path}")`
- ✅ `logger.warning(f"POST_REQUEST_INVALID_CODE: ..., taskPath={task_path}")`
- ✅ `logger.error(f"POST_REQUEST_HTTP_ERROR: ..., taskPath={task_path}")`
- ✅ `logger.error(f"POST_REQUEST_TIMEOUT: ..., taskPath={task_path}")`
- ✅ `logger.error(f"POST_REQUEST_CONNECTION_ERROR: ..., taskPath={task_path}")`

**Tất cả đều tự động hiển thị đúng vì dùng chung biến `task_path`**

---

## 💡 FORMAT HIỂN THỊ

### **Quy ước:**

| Số QR | Format | Ví dụ |
|-------|--------|-------|
| 2 QR | `"A,B"` | `"62,13"` |
| 4 QR | `"A,B \| C,D"` | `"10000628,10000386 \| 10000374,10000124"` |

**Separator:** Dùng ` | ` (space-pipe-space) để phân tách 2 cặp

**Lý do:**
- Dễ đọc
- Dễ parse (nếu cần)
- Rõ ràng là 2 routes riêng biệt

---

## 🔍 DEBUG & TRACKING

### **Trước khi sửa:**

Khi tìm kiếm log cho Dual 4P:
```bash
grep "10000374" post_api.log
```
❌ Không tìm thấy (vì log chỉ có 2 QR đầu)

### **Sau khi sửa:**

```bash
grep "10000374" post_api.log
```
✅ Tìm thấy:
```
POST_REQUEST_START: orderId=1729085400002c3d4, taskPath=10000628,10000386 | 10000374,10000124
POST_REQUEST_SUCCESS: orderId=1729085400002c3d4, taskPath=10000628,10000386 | 10000374,10000124
```

---

## ✅ LỢI ÍCH

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| **Hiển thị đầy đủ** | ❌ Thiếu 2 QR | ✅ Đầy đủ 4 QR |
| **Debug** | ❌ Khó trace | ✅ Dễ trace |
| **Tracking** | ❌ Không tìm được QR phụ | ✅ Tìm được tất cả QR |
| **Consistency** | ❌ Log không khớp payload | ✅ Log khớp payload |

---

## 📝 CHECKLIST

### **Đã sửa:**
- ✅ Hàm `send_post()` - Xử lý taskPath cho 2 và 4 QR
- ✅ Main loop - Xử lý taskPath khi build payload
- ✅ Tất cả console log tự động đúng
- ✅ Tất cả file log tự động đúng
- ✅ Không có lỗi lint

### **Không thay đổi:**
- ✅ Payload structure (không đổi)
- ✅ API request (không đổi)
- ✅ Retry logic (không đổi)
- ✅ Error handling (không đổi)

---

## 🧪 TEST

### **Test Case 1: Regular Pair**
```
Input: pair_id="62 -> 13"
Expected Log: "taskPath=62,13"
Result: ✅ PASS
```

### **Test Case 2: Dual 2P**
```
Input: dual_id="10000628-> 10000386"
Expected Log: "taskPath=10000628,10000386"
Result: ✅ PASS
```

### **Test Case 3: Dual 4P**
```
Input: dual_id="10000628-> 10000386-> 10000374-> 10000124"
Expected Log: "taskPath=10000628,10000386 | 10000374,10000124"
Result: ✅ PASS (Trước: FAIL)
```

---

## ✅ TÓM TẮT

**Vấn đề:**
- Dual 4P gửi 4 QR nhưng log chỉ hiển thị 2 QR

**Giải pháp:**
- Kiểm tra `len(taskOrderDetail)`
- Nếu 1 object → Hiển thị 1 taskPath
- Nếu 2 objects → Hiển thị cả 2 taskPath với separator ` | `

**Kết quả:**
- ✅ Log hiển thị đầy đủ thông tin
- ✅ Dễ debug và tracking
- ✅ Consistency giữa payload và log

