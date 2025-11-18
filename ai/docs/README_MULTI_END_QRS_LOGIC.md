# 📚 LOGIC XỬ LÝ MULTIPLE END_QRS

## 🎯 MỤC ĐÍCH

Xử lý các cặp pair có **nhiều end_qrs** (2 hoặc 3 điểm end) một cách thông minh:
- **Chỉ publish 1 cặp duy nhất** vào queue cho mỗi start_qr
- Tránh spam nhiều message cho cùng 1 start_qr

---

## 📋 CẤU HÌNH

### Config trong `slot_pairing_config.json`:

```json
{
  "pairs": [
    {
      "start_qr": 62,
      "end_qrs": ["13", "32"]        // Có thể có 2 hoặc 3 end_qrs
    },
    {
      "start_qr": 21,
      "end_qrs": ["31", "41", "51"]  // 3 end_qrs
    }
  ]
}
```

---

## 🔍 LOGIC XỬ LÝ

### **BƯỚC 1: Kiểm tra Start Slot**

✅ **Điều kiện**: `start_qr` phải ở trạng thái **shelf** (có hàng) và **stable ≥ 5 giây**

```python
start_ok, start_since = self._is_slot_stable(start_cam, start_slot, expect_status="shelf")
```

---

### **BƯỚC 2: Thu thập tất cả End Slots đang Empty**

Duyệt qua **TẤT CẢ** các `end_qrs` trong config:

```python
empty_end_qrs = []
for end_qr in end_qrs:
    end_ok, end_since = self._is_slot_stable(end_cam, end_slot, expect_status="empty")
    if end_ok and end_since is not None:
        empty_end_qrs.append((end_qr, end_since))
```

---

### **BƯỚC 3: Quyết định Publish**

#### **Case 1: KHÔNG có end_qr nào empty**
```
start_qr = shelf (stable)
end_qrs[0] = shelf
end_qrs[1] = shelf
end_qrs[2] = shelf

➜ KHÔNG PUBLISH (không có điểm đến trống)
```

#### **Case 2: CHỈ 1 end_qr empty**
```
start_qr = shelf (stable)
end_qrs[0] = shelf
end_qrs[1] = empty (stable)    ← CHỈ CÁI NÀY EMPTY
end_qrs[2] = shelf

➜ PUBLISH cặp: start_qr -> end_qrs[1]
➜ Payload: {
    "pair_id": "62 -> 32",
    "start_slot": "62",
    "end_slot": "32",
    "stable_since": "2024-..."
}
```

#### **Case 3: TẤT CẢ end_qrs đều empty**
```
start_qr = shelf (stable)
end_qrs[0] = empty (stable)
end_qrs[1] = empty (stable)
end_qrs[2] = empty (stable)

➜ PUBLISH CHỈ 1 CẶP: start_qr -> end_qrs[0]
➜ Payload: {
    "pair_id": "62 -> 13",
    "start_slot": "62",
    "end_slot": "13",               ← Chọn end_qr ĐẦU TIÊN
    "all_empty_end_slots": ["13", "32"],  ← Thông tin bổ sung
    "is_all_empty": true,
    "stable_since": "2024-..."
}
```

#### **Case 4: MỘT SỐ end_qrs empty (nhưng không phải tất cả)**
```
start_qr = shelf (stable)
end_qrs[0] = empty (stable)
end_qrs[1] = empty (stable)
end_qrs[2] = shelf              ← CÁI NÀY KHÔNG EMPTY

➜ PUBLISH CHỈ 1 CẶP: start_qr -> end_qrs[0]
➜ Payload: {
    "pair_id": "62 -> 13",
    "start_slot": "62",
    "end_slot": "13",
    "stable_since": "2024-..."
}
```

---

## 🎯 NGUYÊN TẮC CHỌN END_QR

### **Ưu tiên theo thứ tự trong config:**

1. Luôn chọn **end_qr ĐẦU TIÊN** trong danh sách các end_qrs đang empty
2. End_qr đầu tiên = end_qr có thứ tự ưu tiên cao nhất trong config

### **Ví dụ:**

```json
{
  "start_qr": 62,
  "end_qrs": ["13", "32", "41"]  // Thứ tự: 13 > 32 > 41
}
```

**Trường hợp A:**
- `end_qrs[1]` (32) = empty
- `end_qrs[2]` (41) = empty
- ➜ Chọn: **32** (vì 32 xuất hiện trước 41 trong config)

**Trường hợp B:**
- `end_qrs[0]` (13) = empty
- `end_qrs[1]` (32) = empty
- `end_qrs[2]` (41) = empty
- ➜ Chọn: **13** (vì 13 xuất hiện đầu tiên)

---

## 📊 THÔNG TIN TRONG PAYLOAD

### **Payload cơ bản (khi chỉ 1 end_qr empty):**

```json
{
  "pair_id": "62 -> 32",
  "start_slot": "62",
  "end_slot": "32",
  "stable_since": "2024-10-16T10:30:45Z"
}
```

### **Payload mở rộng (khi TẤT CẢ end_qrs empty):**

```json
{
  "pair_id": "62 -> 13",
  "start_slot": "62",
  "end_slot": "13",
  "all_empty_end_slots": ["13", "32", "41"],  ← Tất cả end_qrs đang empty
  "is_all_empty": true,                       ← Flag đặc biệt
  "stable_since": "2024-10-16T10:30:45Z"
}
```

**Lợi ích:**
- Hệ thống tiếp theo có thể biết được có BAO NHIÊU điểm đến trống
- Có thể tối ưu hóa logic routing dựa trên `all_empty_end_slots`

---

## ⏱️ ĐIỀU KIỆN THỜI GIAN

### **Stable Time:**
- Mỗi slot phải stable ở trạng thái cần thiết trong **≥ 5 giây**

### **Cooldown:**
- Sau khi publish, pair đó sẽ bị block trong **10 giây**
- Tránh spam cùng 1 cặp liên tục

### **Duplicate Prevention:**
- Không publish cùng 1 `pair_id` nhiều lần trong **cùng phút** (YYYY-MM-DD HH:MM)

---

## 🎬 FLOW HOÀN CHỈNH

### **Ví dụ thực tế: start_qr=62, end_qrs=[13, 32, 41]**

```
T=0s:   Slot 62 = empty
        Slot 13 = shelf
        Slot 32 = shelf
        Slot 41 = shelf
        ➜ Chưa đủ điều kiện (start chưa có hàng)

T=3s:   Hàng được đặt vào slot 62 → shelf
        ➜ Start slot chưa stable (3s < 5s)

T=8s:   Slot 62 = shelf (stable 5s) ✅
        Slot 13 = shelf
        Slot 32 = shelf
        Slot 41 = shelf
        ➜ Không có end_qr nào empty → KHÔNG publish

T=15s:  Hàng bị lấy từ slot 32 → empty
        Slot 62 = shelf (stable 12s) ✅
        Slot 13 = shelf
        Slot 32 = empty (chưa stable)
        Slot 41 = shelf
        ➜ End slot 32 chưa stable → Chờ

T=20s:  Slot 62 = shelf (stable 17s) ✅
        Slot 13 = shelf
        Slot 32 = empty (stable 5s) ✅
        Slot 41 = shelf
        ➜ CẢ HAI STABLE!
        ➜ Chỉ có 1 end_qr empty (32)
        ➜ 🚀 PUBLISH pair "62 -> 32"

T=25s:  Hàng bị lấy từ slot 13 → empty
        Slot 62 = shelf (stable 22s) ✅
        Slot 13 = empty (chưa stable)
        Slot 32 = empty (stable 10s) ✅
        Slot 41 = shelf
        ➜ Cooldown chưa hết (25-20=5s < 10s)
        ➜ KHÔNG publish

T=35s:  Slot 62 = shelf (stable 32s) ✅
        Slot 13 = empty (stable 10s) ✅
        Slot 32 = empty (stable 20s) ✅
        Slot 41 = shelf
        ➜ Cooldown hết (35-20=15s > 10s) ✅
        ➜ Có 2 end_qr empty: [13, 32]
        ➜ Chọn 13 (vì 13 đứng trước 32 trong config)
        ➜ 🚀 PUBLISH pair "62 -> 13" với flag is_all_empty=false

T=45s:  Hàng bị lấy từ slot 41 → empty
        Slot 62 = shelf (stable 42s) ✅
        Slot 13 = empty (stable 20s) ✅
        Slot 32 = empty (stable 30s) ✅
        Slot 41 = empty (chưa stable)
        ➜ Cooldown chưa hết (45-35=10s)

T=50s:  Slot 62 = shelf (stable 47s) ✅
        Slot 13 = empty (stable 25s) ✅
        Slot 32 = empty (stable 35s) ✅
        Slot 41 = empty (stable 5s) ✅
        ➜ Cooldown hết (50-35=15s > 10s) ✅
        ➜ TẤT CẢ 3 end_qr đều empty: [13, 32, 41]
        ➜ Chọn 13 (vì 13 đứng đầu tiên)
        ➜ 🚀 PUBLISH pair "62 -> 13" với:
            - is_all_empty = true
            - all_empty_end_slots = ["13", "32", "41"]
```

---

## 💡 LỢI ÍCH

### ✅ **Tránh Spam:**
- Chỉ publish 1 message thay vì 2-3 messages cho cùng start_qr
- Giảm tải cho hệ thống queue

### ✅ **Thông tin đầy đủ:**
- Payload chứa thông tin về TẤT CẢ các điểm đến trống
- Hệ thống tiếp theo có thể tối ưu hóa routing

### ✅ **Ưu tiên thông minh:**
- Chọn điểm đến theo thứ tự ưu tiên trong config
- Linh hoạt điều chỉnh ưu tiên bằng cách thay đổi thứ tự trong config

---

## 🔧 THAM SỐ

```python
StablePairProcessor(
    db_path="../queues.db",
    config_path="slot_pairing_config.json",
    stable_seconds=5.0,      # Thời gian stable tối thiểu
    cooldown_seconds=10.0    # Thời gian cooldown giữa 2 lần publish
)
```

---

## 📝 GHI CHÚ

### **Log Debug:**

```python
# Khi TẤT CẢ end_qrs empty:
[PAIR_LOGIC] TẤT CẢ 3 end_qrs đều empty cho start_qr=62, chọn end_qr=13, all_empty=[13, 32, 41]

# Khi CHỈ MỘT SỐ end_qrs empty:
[PAIR_LOGIC] 2/3 end_qrs empty cho start_qr=62, chọn end_qr=13
```

### **Log Publish:**

```python
STABLE_PAIR_PUBLISHED: pair_id=62 -> 13, start_slot=62, end_slot=13, all_empty_end_slots=[13, 32, 41], stable_since=2024-10-16T10:30:45Z
```

---

## 🎯 TÓM TẮT

| Tình huống | Số end_qrs empty | Hành động |
|------------|------------------|-----------|
| Không có end_qr nào empty | 0 | ❌ Không publish |
| Chỉ 1 end_qr empty | 1 | ✅ Publish cặp đó |
| Một số end_qrs empty | 2/3 | ✅ Publish end_qr đầu tiên trong danh sách empty |
| TẤT CẢ end_qrs empty | 3/3 | ✅ Publish end_qr đầu tiên + thêm flag `is_all_empty` |

**Nguyên tắc vàng:** 
- **1 start_qr = 1 message duy nhất** mỗi lần publish
- Luôn chọn end_qr có thứ tự ưu tiên cao nhất trong config

