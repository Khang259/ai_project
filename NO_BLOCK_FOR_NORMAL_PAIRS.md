# TÓM TẮT THAY ĐỔI: Không Block cho Normal Pairs

## 🎯 MỤC ĐÍCH
Chỉ block `start_qr` cho **DUAL 2P và DUAL 4P**. **Normal pairs KHÔNG block**.

## 📋 THAY ĐỔI

### Logic Block/Unblock

| Loại | Block? | Unlock khi POST fail? | Lý do |
|------|--------|----------------------|-------|
| **Normal Pairs** | ❌ KHÔNG | ❌ KHÔNG | Normal pairs không cần block vì user control end slot |
| **Dual 2P** | ✅ CÓ | ✅ CÓ | Cần block để tránh false positive trong quá trình vận chuyển |
| **Dual 4P** | ✅ CÓ | ✅ CÓ | Cần block để tránh false positive trong quá trình vận chuyển |

## 📁 FILES THAY ĐỔI

### 1. **roi_processor.py**

#### Hàm `_subscribe_stable_pairs()` - THAY ĐỔI LOGIC

**TRƯỚC**: Block start_qr khi nhận normal pair
```python
# Xử lý start_qr (block ROI)
if start_qr_str:
    start_qr = int(start_qr_str)
    # ... block logic ...
    self.blocked_slots[cam_id][slot_number] = expire_at
    print("[BLOCK] Đã block ROI slot...")
```

**SAU**: KHÔNG block, chỉ track end_slot (nếu cần)
```python
# KHÔNG BLOCK cho normal pairs - CHỈ track end_slot
# Block chỉ áp dụng cho dual 2P và dual 4P

pair_id = payload.get("pair_id", "")
if start_qr_str and end_qr_str:
    print(f"[NORMAL_PAIR] Nhận normal pair {pair_id}: start_qr={start_qr_str} → end_qr={end_qr_str} (KHÔNG block)")

# Xử lý end_qr (bắt đầu theo dõi) - OPTIONAL cho normal pairs
```

**Comment trong docstring**:
```python
def _subscribe_stable_pairs(self) -> None:
    """Subscribe topic stable_pairs để track end slot. KHÔNG block cho normal pairs - chỉ block cho dual."""
    print("Bắt đầu subscribe stable_pairs (KHÔNG block - chỉ track end slot cho normal pairs)...")
```

### 2. **postRq/postAPI.py**

#### Thay đổi unlock logic khi POST fail

**TRƯỚC**: Unlock cho cả normal pairs và dual pairs
```python
if not ok:
    print("[UNLOCK_SCHEDULE] Sẽ unlock start_slot...")
    send_unlock_after_delay(queue, pair_id, start_slot, delay_seconds=60)
```

**SAU**: CHỈ unlock cho dual pairs
```python
if not ok:
    # CHỈ unlock cho dual pairs (blocking required), KHÔNG unlock cho normal pairs
    if topic == "stable_dual":
        unlock_msg = f"[UNLOCK_SCHEDULE] Sẽ unlock start_slot={start_slot} sau 60 giây do POST thất bại (DUAL ONLY)"
        print(unlock_msg)
        send_unlock_after_delay(queue, pair_id, start_slot, delay_seconds=60)
    else:
        # Normal pairs không block → không cần unlock
        no_unlock_msg = f"[NO_UNLOCK] Normal pairs không block → không cần unlock mechanism"
        print(no_unlock_msg)
```

## 📊 SO SÁNH

### Normal Pairs (KHÔNG block)

```
┌──────────────────────────────────────────┐
│ 1. Publish normal pair                   │
│    → stable_pair_processor publishes     │
│    → roi_processor NHẬN (không block)     │
│    → postAPI gửi POST → ICS              │
│    → SUCCESS/FAILED (không unlock)       │
└──────────────────────────────────────────┘
```

### Dual Pairs (CÓ block)

```
┌──────────────────────────────────────────┐
│ 1. Publish dual pair                     │
│    → stable_pair_processor publishes     │
│    → roi_processor NHẬN (BLOCK)         │
│    → postAPI gửi POST → ICS              │
│    → SUCCESS → unblock (tự động)        │
│    → FAILED → unblock (sau 60s)          │
└──────────────────────────────────────────┘
```

## 🔥 LỢI ÍCH

1. **Normal pairs linh hoạt hơn**: Không bị block, có thể phát hiện lại ngay
2. **Dual pairs vẫn an toàn**: Block để tránh false positive trong quá trình di chuyển
3. **Logic rõ ràng**: Phân biệt rõ normal pairs vs dual pairs
4. **Không ảnh hưởng dual logic**: Dual 2P/4P vẫn hoạt động như cũ

## ⚠️ LƯU Ý

1. **Normal pairs không có unlock mechanism**:
   - Không block từ đầu → không cần unlock
   - Có thể phát hiện lại ngay lập tức

2. **Dual pairs vẫn cần blocking**:
   - Block start_qr để tránh false positive
   - Auto unlock khi end_qrs stable shelf
   - Manual unlock sau 60s nếu POST fail

3. **End slot monitoring**:
   - Vẫn track end slots cho normal pairs (optional)
   - Mechanism chính vẫn là user-controlled qua API

## 📝 TESTING

### Test Normal Pair (KHÔNG block):
```bash
# 1. User POST API đánh dấu end slot empty
curl -X POST http://localhost:8001/api/request-end-slot \
  -H "Content-Type: application/json" \
  -d '{"end_qr": 10000004}'

# 2. AI phát hiện start_qr có shelf → publish pair
# 3. roi_processor log sẽ hiển thị:
#    [NORMAL_PAIR] Nhận normal pair X: start_qr=Y → end_qr=Z (KHÔNG block)
# 4. postAPI gửi POST → ICS
# 5. Không có unlock message
```

### Test Dual Pair (CÓ block):
```bash
# 1. Publish dual pair
# 2. roi_processor log sẽ hiển thị:
#    [DUAL_BLOCK] Đã block ROI slot X trên cam-Y cho dual Z
# 3. postAPI gửi POST → ICS
# 4. Nếu SUCCESS: Auto unblock
# 5. Nếu FAILED: Unlock sau 60s
```

## 🎯 LOGS ĐỂ THEO DÕI

### Normal Pairs:
```
[NORMAL_PAIR] Nhận normal pair 10000001 -> 10000004: start_qr=10000001 → end_qr=10000004 (KHÔNG block)
✓ POST thành công → ICS
[NO_UNLOCK] Normal pairs không block → không cần unlock mechanism
```

### Dual Pairs:
```
[DUAL_BLOCK] Đã block ROI slot X trên cam-Y cho dual 100 -> 200
[DUAL_2P] Bắt đầu xử lý 2-point dual: 100 -> 200, orderId=...
✓ POST thành công → ICS
[DUAL_UNBLOCK] Đã unblock ROI slot...
```

---

**Version**: 1.0  
**Ngày thay đổi**: 2024-01-15  
**Files thay đổi**:
- `roi_processor.py` - Bỏ block cho normal pairs
- `postRq/postAPI.py` - Bỏ unlock cho normal pairs

