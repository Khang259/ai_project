# 🔄 CẬP NHẬT LOGIC DUAL PAIRS

## 📝 THAY ĐỔI

Logic publish dual pairs đã được **làm rõ và cải tiến** để dễ hiểu hơn.

---

## 🎯 LOGIC MỚI - ĐƠN GIẢN VÀ RÕ RÀNG

### **BƯỚC 1: Luôn xét cặp (start_qr, end_qrs) TRƯỚC**

```python
# Điều kiện BẮT BUỘC
start_qr == shelf (stable ≥ 20s)
AND
end_qrs == empty (stable ≥ 20s)
```

**Nếu KHÔNG thỏa mãn → DỪNG, không kiểm tra tiếp**

---

### **BƯỚC 2: Xét start_qr_2**

Khi cặp chính (start_qr, end_qrs) = (shelf, empty) đã stable:

```
IF start_qr_2 == shelf (stable ≥ 20s)
    → PUBLISH DUAL 4P
    
ELSE IF start_qr_2 == empty (stable ≥ 20s)
    → PUBLISH DUAL 2P
    
ELSE
    → KHÔNG PUBLISH (start_qr_2 không stable)
```

---

## 📊 SƠ ĐỒ QUYẾT ĐỊNH

```
START
  ↓
┌─────────────────────────────────────┐
│ Kiểm tra cặp chính (BƯỚC 1)        │
│ start_qr == shelf (stable)?         │
│ end_qrs == empty (stable)?          │
└─────────────────────────────────────┘
  ↓
  ├─ ❌ KHÔNG → DỪNG (không publish)
  │
  ✅ CÓ
  ↓
┌─────────────────────────────────────┐
│ Cặp chính OK ✅                     │
│ start_qr = shelf, end_qrs = empty   │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Kiểm tra start_qr_2 (BƯỚC 2)       │
└─────────────────────────────────────┘
  ↓
  ├─ start_qr_2 == shelf (stable)?
  │  ↓
  │  ✅ → PUBLISH DUAL 4P 🎉
  │
  ├─ start_qr_2 == empty (stable)?
  │  ↓
  │  ✅ → PUBLISH DUAL 2P ✅
  │
  └─ Không stable
     ↓
     ❌ → KHÔNG PUBLISH
```

---

## 🎬 VÍ DỤ THỰC TẾ

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

### **Case 1: Publish 4P**

```
Trạng thái slots:
  start_qr (10000628)   = shelf (stable 30s) ✅
  end_qrs (10000386)    = empty (stable 25s) ✅
  start_qr_2 (10000374) = shelf (stable 20s) ✅
  end_qrs_2 (10000124)  = [không kiểm tra]

Flow:
  BƯỚC 1: Cặp chính (shelf, empty) ✅
  BƯỚC 2: start_qr_2 = shelf ✅
  
  → 🎉 PUBLISH DUAL 4P
```

**Log:**
```
[DUAL_LOGIC] Cặp chính OK: start_qr=10000628 (shelf), end_qrs=10000386 (empty)
[DUAL_LOGIC] start_qr_2=10000374 == shelf → Publish 4P
STABLE_DUAL_4P_PUBLISHED: dual_id=10000628-> 10000386-> 10000374-> 10000124
```

---

### **Case 2: Publish 2P (start_qr_2 = empty)**

```
Trạng thái slots:
  start_qr (10000628)   = shelf (stable 30s) ✅
  end_qrs (10000386)    = empty (stable 25s) ✅
  start_qr_2 (10000374) = empty (stable 20s) ✅
  end_qrs_2 (10000124)  = [không kiểm tra]

Flow:
  BƯỚC 1: Cặp chính (shelf, empty) ✅
  BƯỚC 2: start_qr_2 = empty ✅
  
  → ✅ PUBLISH DUAL 2P
```

**Log:**
```
[DUAL_LOGIC] Cặp chính OK: start_qr=10000628 (shelf), end_qrs=10000386 (empty)
[DUAL_LOGIC] start_qr_2=10000374 == empty → Publish 2P
STABLE_DUAL_2P_PUBLISHED: dual_id=10000628-> 10000386
```

---

### **Case 3: Không publish (start_qr chưa có hàng)**

```
Trạng thái slots:
  start_qr (10000628)   = empty ❌
  end_qrs (10000386)    = empty
  start_qr_2 (10000374) = shelf
  end_qrs_2 (10000124)  = shelf

Flow:
  BƯỚC 1: start_qr != shelf ❌
  
  → ❌ DỪNG, không kiểm tra tiếp
```

**Log:**
```
(Không có log vì không vào bước 2)
```

---

### **Case 4: Không publish (end_qrs không trống)**

```
Trạng thái slots:
  start_qr (10000628)   = shelf (stable 30s) ✅
  end_qrs (10000386)    = shelf ❌ (không empty)
  start_qr_2 (10000374) = shelf
  end_qrs_2 (10000124)  = shelf

Flow:
  BƯỚC 1: end_qrs != empty ❌
  
  → ❌ DỪNG, không kiểm tra tiếp
```

**Log:**
```
(Không có log vì không vào bước 2)
```

---

### **Case 5: Không publish (start_qr_2 không stable)**

```
Trạng thái slots:
  start_qr (10000628)   = shelf (stable 30s) ✅
  end_qrs (10000386)    = empty (stable 25s) ✅
  start_qr_2 (10000374) = shelf (stable 15s) ❌ (chưa đủ 20s)
  end_qrs_2 (10000124)  = shelf

Flow:
  BƯỚC 1: Cặp chính (shelf, empty) ✅
  BƯỚC 2: start_qr_2 = shelf nhưng chưa stable ❌
  
  → ❌ KHÔNG PUBLISH
```

**Log:**
```
[DUAL_LOGIC] Cặp chính OK: start_qr=10000628 (shelf), end_qrs=10000386 (empty)
[DUAL_LOGIC] start_qr_2=10000374 không stable → Không publish
```

---

## 📋 BẢNG TÓM TẮT

| start_qr | end_qrs | start_qr_2 | Kết quả | Lý do |
|----------|---------|------------|---------|-------|
| ❌ empty | - | - | ❌ Không pub | Cặp chính chưa sẵn sàng |
| ✅ shelf | ❌ shelf | - | ❌ Không pub | Điểm đến chính không trống |
| ✅ shelf | ✅ empty | ❌ Không có | ✅ Pub 2P | Không có start_qr_2 |
| ✅ shelf | ✅ empty | ✅ shelf | 🎉 Pub 4P | Cả 2 điểm xuất phát có hàng |
| ✅ shelf | ✅ empty | ❌ empty | ✅ Pub 2P | Chỉ 1 điểm xuất phát có hàng |
| ✅ shelf | ✅ empty | ⚠️ Không stable | ❌ Không pub | start_qr_2 chưa stable |

**Ghi chú:**
- "stable" = trạng thái ổn định ≥ 20 giây
- "❌ Không có" = không tồn tại trong config

---

## 🔍 CODE THAY ĐỔI

### **Hàm `_evaluate_dual_pairs()` (Dòng 550-618)**

**Cải tiến:**
1. ✅ Comment rõ ràng cho từng bước
2. ✅ Log chi tiết để debug
3. ✅ Tên biến mô tả rõ ràng (start_2_shelf_ok, start_2_empty_ok)
4. ✅ Xử lý case start_qr_2 không stable

**Code mới:**
```python
def _evaluate_dual_pairs(self) -> None:
    """
    Evaluate dual pairs theo logic:
    1. Luôn xét cặp (start_qr, end_qrs) trước
    2. Nếu start_qr == shelf AND end_qrs == empty (cả 2 stable)
       → Xét tiếp start_qr_2:
         - Nếu start_qr_2 == shelf → Publish 4P
         - Nếu start_qr_2 == empty → Publish 2P
    """
    # BƯỚC 1: Kiểm tra cặp chính
    if not (start_qr == shelf AND end_qrs == empty):
        continue  # Dừng ngay
    
    # BƯỚC 2: Kiểm tra start_qr_2
    if start_qr_2 == shelf:
        publish_4p()
    elif start_qr_2 == empty:
        publish_2p()
    else:
        # Không publish
```

---

## 📊 LOG MẪU

### **Khi publish 4P:**
```
[DUAL_LOGIC] Cặp chính OK: start_qr=10000628 (shelf), end_qrs=10000386 (empty)
[DUAL_LOGIC] start_qr_2=10000374 == shelf → Publish 4P
STABLE_DUAL_4P_PUBLISHED: dual_id=10000628-> 10000386-> 10000374-> 10000124, start_slot=10000628, end_slot=10000386, start_slot_2=10000374, end_slot_2=10000124
DUAL_BLOCK_PUBLISHED: dual_id=10000628-> 10000386-> 10000374-> 10000124, start_qr=10000628
```

### **Khi publish 2P:**
```
[DUAL_LOGIC] Cặp chính OK: start_qr=10000628 (shelf), end_qrs=10000386 (empty)
[DUAL_LOGIC] start_qr_2=10000374 == empty → Publish 2P
STABLE_DUAL_2P_PUBLISHED: dual_id=10000628-> 10000386, start_slot=10000628, end_slot=10000386
DUAL_BLOCK_PUBLISHED: dual_id=10000628-> 10000386, start_qr=10000628
```

### **Khi không publish (start_qr_2 không stable):**
```
[DUAL_LOGIC] Cặp chính OK: start_qr=10000628 (shelf), end_qrs=10000386 (empty)
[DUAL_LOGIC] start_qr_2=10000374 không stable → Không publish
```

---

## ✅ LỢI ÍCH CỦA LOGIC MỚI

| Tiêu chí | Trước | Sau |
|----------|-------|-----|
| **Dễ hiểu** | ⚠️ Có thể gây nhầm lẫn | ✅ Rõ ràng, từng bước |
| **Debug** | ⚠️ Ít log | ✅ Log chi tiết mỗi bước |
| **Maintainability** | ⚠️ Comment ít | ✅ Comment đầy đủ |
| **Logic flow** | ⚠️ Phân nhánh phức tạp | ✅ Tuần tự, dễ theo dõi |

---

## 📝 CHECKLIST

### **Đã thay đổi:**
- ✅ Thêm docstring mô tả logic chi tiết
- ✅ Thêm comment cho từng bước
- ✅ Thêm log debug chi tiết
- ✅ Tên biến rõ ràng hơn
- ✅ Xử lý case start_qr_2 không stable

### **Không thay đổi:**
- ✅ Điều kiện stable (20s)
- ✅ Điều kiện cooldown (10s)
- ✅ Payload format
- ✅ Topic names
- ✅ Blocking system

---

## 🎯 TÓM TẮT

**Logic mới đơn giản:**

```
1. Kiểm tra cặp chính (start_qr, end_qrs)
   ↓
   Nếu KHÔNG phải (shelf, empty) → DỪNG
   ↓
2. Kiểm tra start_qr_2
   ↓
   - shelf → PUBLISH 4P
   - empty → PUBLISH 2P
   - không stable → KHÔNG PUBLISH
```

**Dễ nhớ:**
- ✅ Luôn xét cặp chính TRƯỚC
- ✅ Chỉ xét start_qr_2 KHI cặp chính OK
- ✅ start_qr_2 quyết định 4P hay 2P

---

## 📚 TÀI LIỆU LIÊN QUAN

- `docs/README_DUAL_4P_LOGIC.md` - Logic chi tiết dual 4P
- `logic/DUAL_4P_SUMMARY.txt` - Tóm tắt ngắn gọn
- `logic/stable_pair_processor.py` - Source code

