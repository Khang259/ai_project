# 🔄 CẬP NHẬT PAYLOAD FORMAT

## 📝 THAY ĐỔI

Đã cập nhật format payload để phân biệt rõ giữa **2 QR codes** và **4 QR codes**.

---

## 🎯 LOGIC MỚI

### **1. Regular Pair (2 QR codes)**
- `modelProcessCode`: **"lenhDon"**
- `taskOrderDetail`: **1 object** với 2 QR codes

### **2. Dual 2P (2 QR codes)**  
- `modelProcessCode`: **"lenhDon"**
- `taskOrderDetail`: **1 object** với 2 QR codes

### **3. Dual 4P (4 QR codes)**
- `modelProcessCode`: **"lenhDooi"** *(khác!)*
- `taskOrderDetail`: **2 objects**, mỗi object có 2 QR codes

---

## 📦 PAYLOAD FORMAT

### **Case 1: Regular Pair (2 QR codes)**

**Input từ queue:**
```json
{
  "topic": "stable_pairs",
  "payload": {
    "pair_id": "62 -> 13",
    "start_slot": "62",
    "end_slot": "13"
  }
}
```

**Output payload:**
```json
{
  "modelProcessCode": "lenhDon",
  "fromSystem": "ICS",
  "orderId": "1729085400000a1b2",
  "taskOrderDetail": [
    {
      "taskPath": "62,13"
    }
  ]
}
```

**Giải thích:**
- ✅ `modelProcessCode` = **"lenhDon"** (lệnh đơn)
- ✅ `taskOrderDetail` có **1 object**
- ✅ `taskPath` = **"start_slot,end_slot"**

---

### **Case 2: Dual 2P (2 QR codes)**

**Input từ queue:**
```json
{
  "topic": "stable_dual",
  "payload": {
    "dual_id": "10000628-> 10000386",
    "start_slot": "10000628",
    "end_slot": "10000386"
  }
}
```

**Output payload:**
```json
{
  "modelProcessCode": "lenhDon",
  "fromSystem": "ICS",
  "orderId": "1729085400001b2c3",
  "taskOrderDetail": [
    {
      "taskPath": "10000628,10000386"
    }
  ]
}
```

**Giải thích:**
- ✅ `modelProcessCode` = **"lenhDon"** (lệnh đơn)
- ✅ `taskOrderDetail` có **1 object**
- ✅ Giống như regular pair (cả 2 đều 2 QR codes)

---

### **Case 3: Dual 4P (4 QR codes)**

**Input từ queue:**
```json
{
  "topic": "stable_dual",
  "payload": {
    "dual_id": "10000628-> 10000386-> 10000374-> 10000124",
    "start_slot": "10000628",
    "end_slot": "10000386",
    "start_slot_2": "10000374",
    "end_slot_2": "10000124"
  }
}
```

**Output payload:**
```json
{
  "modelProcessCode": "lenhDooi",
  "fromSystem": "ICS",
  "orderId": "1729085400002c3d4",
  "taskOrderDetail": [
    {
      "taskPath": "10000628,10000386"
    },
    {
      "taskPath": "10000374,10000124"
    }
  ]
}
```

**Giải thích:**
- ✅ `modelProcessCode` = **"lenhDooi"** (lệnh đôi - khác!)
- ✅ `taskOrderDetail` có **2 objects**
- ✅ Object 1: `start_qr, end_qrs` (cặp chính)
- ✅ Object 2: `start_qr_2, end_qrs_2` (cặp phụ)

---

## 📊 BẢNG SO SÁNH

| Loại | Số QR | modelProcessCode | taskOrderDetail | taskPath |
|------|-------|------------------|----------------|----------|
| **Regular Pair** | 2 | `"lenhDon"` | 1 object | `"start,end"` |
| **Dual 2P** | 2 | `"lenhDon"` | 1 object | `"start,end"` |
| **Dual 4P** | 4 | `"lenhDooi"` | 2 objects | Object 1: `"start,end"`<br>Object 2: `"start_2,end_2"` |

---

## 🔍 CODE THAY ĐỔI

### **Hàm `build_payload_from_pair()` (Dòng 130-156)**

**Trước:**
```python
"modelProcessCode": "checking_camera_work"
```

**Sau:**
```python
"modelProcessCode": "lenhDon"
```

---

### **Hàm `build_payload_from_dual()` (Dòng 159-221)**

**Trước:**
```python
# Cả 2P và 4P đều dùng:
"modelProcessCode": "checking_camera_work"
"taskOrderDetail": [
    {
        "taskPath": "start,end,start_2,end_2"  # 4 QR trong 1 string
    }
]
```

**Sau:**

**Dual 2P:**
```python
"modelProcessCode": "lenhDon"
"taskOrderDetail": [
    {
        "taskPath": "start,end"  # 2 QR
    }
]
```

**Dual 4P:**
```python
"modelProcessCode": "lenhDooi"  # Khác!
"taskOrderDetail": [
    {
        "taskPath": "start,end"  # Cặp 1
    },
    {
        "taskPath": "start_2,end_2"  # Cặp 2
    }
]
```

---

## 🎬 VÍ DỤ THỰC TẾ

### **Ví dụ 1: POST Regular Pair**

**Console log:**
```
=== POST REQUEST ===
URL: http://192.168.1.169:7000/ics/taskOrder/addTask
OrderID: 1729085400000a1b2
TaskPath: 62,13
Sending JSON:
{
  "modelProcessCode": "lenhDon",
  "fromSystem": "ICS",
  "orderId": "1729085400000a1b2",
  "taskOrderDetail": [
    {
      "taskPath": "62,13"
    }
  ]
}

=== POST RESPONSE ===
Status Code: 200
Response Body: {"code": 1000, "message": "success"}
[SUCCESS] ✓ POST thành công | OrderID: 1729085400000a1b2
```

---

### **Ví dụ 2: POST Dual 4P**

**Console log:**
```
=== POST REQUEST ===
URL: http://192.168.1.169:7000/ics/taskOrder/addTask
OrderID: 1729085400002c3d4
TaskPath: 10000628,10000386 | 10000374,10000124
Sending JSON:
{
  "modelProcessCode": "lenhDooi",
  "fromSystem": "ICS",
  "orderId": "1729085400002c3d4",
  "taskOrderDetail": [
    {
      "taskPath": "10000628,10000386"
    },
    {
      "taskPath": "10000374,10000124"
    }
  ]
}

=== POST RESPONSE ===
Status Code: 200
Response Body: {"code": 1000, "message": "success"}
[SUCCESS] ✓ POST thành công | OrderID: 1729085400002c3d4
```

---

## 💡 TẠI SAO THAY ĐỔI NHƯ VẬY?

### **Lý do thiết kế:**

1. **Phân biệt rõ ràng 2 QR vs 4 QR**
   - `"lenhDon"` = Lệnh đơn (2 QR)
   - `"lenhDooi"` = Lệnh đôi (4 QR)
   - API server dễ dàng xử lý khác nhau

2. **Cấu trúc rõ ràng cho Dual 4P**
   - Trước: `"taskPath": "A,B,C,D"` → Khó parse
   - Sau: 2 objects riêng biệt → Dễ hiểu, dễ xử lý

3. **Tương thích với AMR/Robot**
   - Robot có thể nhận 2 routes riêng biệt
   - Dễ dàng xử lý tuần tự hoặc song song

4. **Consistency**
   - Regular Pair và Dual 2P giống nhau (đều 2 QR)
   - Chỉ Dual 4P khác biệt

---

## 🔍 LOGIC KIỂM TRA

### **Code (Dòng 187):**

```python
if start_slot_2 and end_slot_2:
    # Dual 4P: Có cả start_slot_2 và end_slot_2
    return {
        "modelProcessCode": "lenhDooi",
        "taskOrderDetail": [
            {"taskPath": f"{start_slot},{end_slot}"},
            {"taskPath": f"{start_slot_2},{end_slot_2}"}
        ]
    }
else:
    # Dual 2P: Không có start_slot_2 hoặc end_slot_2
    return {
        "modelProcessCode": "lenhDon",
        "taskOrderDetail": [
            {"taskPath": f"{start_slot},{end_slot}"}
        ]
    }
```

**Điều kiện:**
- Nếu **CÓ** `start_slot_2` **VÀ** `end_slot_2` → Dual 4P
- Nếu **KHÔNG** → Dual 2P

---

## 📝 CHECKLIST THAY ĐỔI

### **build_payload_from_pair():**
- ✅ Đổi `modelProcessCode` từ `"checking_camera_work"` → `"lenhDon"`
- ✅ Giữ nguyên cấu trúc `taskOrderDetail` (1 object)

### **build_payload_from_dual():**
- ✅ Dual 2P: `modelProcessCode` = `"lenhDon"`, 1 object
- ✅ Dual 4P: `modelProcessCode` = `"lenhDooi"`, 2 objects
- ✅ Tách taskPath thành 2 objects riêng biệt cho Dual 4P

---

## ⚠️ BREAKING CHANGES

### **API Server cần cập nhật:**

1. **Chấp nhận modelProcessCode mới:**
   - `"lenhDon"` (thay vì `"checking_camera_work"`)
   - `"lenhDooi"` (cho Dual 4P)

2. **Xử lý taskOrderDetail với 2 objects:**
   - Dual 4P có 2 taskPath
   - Cần parse và xử lý riêng từng cặp

### **Không ảnh hưởng:**
- ✅ Queue message format (không đổi)
- ✅ Database schema (không đổi)
- ✅ Retry logic (không đổi)
- ✅ Unlock mechanism (không đổi)

---

## 🧪 TEST

### **Test Case 1: Regular Pair**
```python
payload = build_payload_from_pair("62 -> 13", "62", "13", "1729085400000a1b2")

assert payload["modelProcessCode"] == "lenhDon"
assert len(payload["taskOrderDetail"]) == 1
assert payload["taskOrderDetail"][0]["taskPath"] == "62,13"
```

### **Test Case 2: Dual 2P**
```python
dual_payload = {
    "start_slot": "10000628",
    "end_slot": "10000386"
}
payload = build_payload_from_dual(dual_payload, "1729085400001b2c3")

assert payload["modelProcessCode"] == "lenhDon"
assert len(payload["taskOrderDetail"]) == 1
assert payload["taskOrderDetail"][0]["taskPath"] == "10000628,10000386"
```

### **Test Case 3: Dual 4P**
```python
dual_payload = {
    "start_slot": "10000628",
    "end_slot": "10000386",
    "start_slot_2": "10000374",
    "end_slot_2": "10000124"
}
payload = build_payload_from_dual(dual_payload, "1729085400002c3d4")

assert payload["modelProcessCode"] == "lenhDooi"
assert len(payload["taskOrderDetail"]) == 2
assert payload["taskOrderDetail"][0]["taskPath"] == "10000628,10000386"
assert payload["taskOrderDetail"][1]["taskPath"] == "10000374,10000124"
```

---

## ✅ TÓM TẮT

| Thay đổi | Trước | Sau |
|----------|-------|-----|
| **Regular Pair modelProcessCode** | `"checking_camera_work"` | `"lenhDon"` |
| **Dual 2P modelProcessCode** | `"checking_camera_work"` | `"lenhDon"` |
| **Dual 4P modelProcessCode** | `"checking_camera_work"` | `"lenhDooi"` |
| **Dual 4P taskOrderDetail** | 1 object với 4 QR | 2 objects, mỗi object 2 QR |

**Lợi ích:**
- ✅ Phân biệt rõ 2 QR vs 4 QR
- ✅ Cấu trúc dễ hiểu, dễ parse
- ✅ Tương thích AMR/Robot
- ✅ API server dễ xử lý logic riêng

