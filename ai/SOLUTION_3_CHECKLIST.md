# ✅ CHECKLIST: Verify Giải pháp 3 Implementation

## 📋 Pre-Implementation Checklist

- [x] Đã phân tích và hiểu rõ vấn đề race condition
- [x] Đã xác định 4 trường hợp gây lỗi
- [x] Đã chọn Giải pháp 3 (Sync blocking state)
- [x] Đã backup code hiện tại

## 🔧 Implementation Checklist

### File: `optimized_roi_visualizer.py`

- [x] **Bước 1:** Thêm `_blocked_slots_ref` trong `__init__()`
  ```python
  self._blocked_slots_ref: Optional[Dict[str, Dict[int, float]]] = None
  ```

- [x] **Bước 2:** Update `display_video()` signature
  ```python
  def display_video(self, ..., blocked_slots: Optional[Dict] = None):
      self._blocked_slots_ref = blocked_slots
  ```

- [x] **Bước 3:** Implement sync logic trong `_update_local_dict_from_processor()`
  ```python
  if self._blocked_slots_ref:
      self.blocked_rois.clear()
      for camera_id, blocked_slots_dict in self._blocked_slots_ref.items():
          # Sync logic here
  ```

- [x] **Bước 4:** Comment/disable subscribe blocking topics
  ```python
  # KHÔNG CẦN subscribe blocking topics nữa
  # if self.queue:
  #     blocking_thread = ...
  ```

### File: `camera_gui_viewer.py`

- [x] **Bước 5:** Thêm comment giải thích cho standalone app
  ```python
  # LƯU Ý: camera_gui_viewer là standalone app
  # Vẫn cần subscribe blocking topics
  ```

### Documentation

- [x] **Bước 6:** Tạo `SOLUTION_3_IMPLEMENTATION.md`
- [x] **Bước 7:** Tạo `example_solution3_usage.py`
- [x] **Bước 8:** Tạo `SOLUTION_3_SUMMARY.md`
- [x] **Bước 9:** Tạo `SOLUTION_3_CHECKLIST.md` (file này)

## 🧪 Testing Checklist

### Test 1: Dual Block (2P)

- [ ] **Setup:**
  - [ ] Khởi động roi_processor
  - [ ] Khởi động visualizer với `blocked_slots` reference
  - [ ] Mở camera display

- [ ] **Test Steps:**
  1. [ ] Gửi dual_block message cho 2P pair
  2. [ ] Quan sát camera display
  3. [ ] Verify slot hiển thị "Blocked" (màu tím)
  4. [ ] Verify KHÔNG hiển thị "Empty"

- [ ] **Expected Result:**
  - [ ] Label: "Slot{N} Blocked (0.XX)"
  - [ ] Color: Tím (COLOR_ROI_BLOCKED)
  - [ ] ROI border: Tím, thickness=3

### Test 2: Dual Block (4P)

- [ ] **Setup:** (tương tự Test 1)

- [ ] **Test Steps:**
  1. [ ] Gửi dual_block message cho 4P pair
  2. [ ] Quan sát camera display
  3. [ ] Verify cả 2 start slots đều hiển thị "Blocked"

- [ ] **Expected Result:**
  - [ ] Cả 2 slots đều có label "Blocked"
  - [ ] Không có slot nào hiển thị "Empty"

### Test 3: Manual Block via API

- [ ] **Setup:** (tương tự Test 1)

- [ ] **Test Steps:**
  1. [ ] Gửi block_slot message với qr_code
  2. [ ] Quan sát camera display
  3. [ ] Verify slot hiển thị "Blocked"

- [ ] **Expected Result:**
  - [ ] Label: "Slot{N} Blocked (0.XX)"
  - [ ] Blocking ngay lập tức (< 200ms)

### Test 4: Unblock

- [ ] **Setup:**
  - [ ] Đã có slot bị block (từ Test 1, 2, hoặc 3)

- [ ] **Test Steps:**
  1. [ ] Gửi unblock_slot message
  2. [ ] Quan sát camera display
  3. [ ] Verify slot KHÔNG còn hiển thị "Blocked"

- [ ] **Expected Result:**
  - [ ] Nếu có shelf: Label "Slot{N} Shelf (0.XX)", màu đỏ
  - [ ] Nếu empty: Label "Slot{N} Empty (0.XX)", màu xám
  - [ ] ROI border: Xanh lá, thickness=2

### Test 5: Race Condition (Stress Test)

- [ ] **Setup:** (tương tự Test 1)

- [ ] **Test Steps:**
  1. [ ] Gửi liên tục 10 block messages trong 1 giây
  2. [ ] Quan sát camera display
  3. [ ] Verify TẤT CẢ slots đều hiển thị "Blocked"

- [ ] **Expected Result:**
  - [ ] 100% slots hiển thị "Blocked"
  - [ ] KHÔNG có slot nào hiển thị "Empty" tạm thời

### Test 6: Unlock Start Slot (POST Failed)

- [ ] **Setup:** (tương tự Test 1)

- [ ] **Test Steps:**
  1. [ ] Gửi unlock_start_slot message (simulate POST failed)
  2. [ ] Quan sát camera display
  3. [ ] Verify slot được unlock

- [ ] **Expected Result:**
  - [ ] Slot không còn "Blocked"
  - [ ] Hiển thị đúng trạng thái (Empty/Shelf)

## 🔍 Verification Checklist

### Code Review

- [ ] **Kiểm tra `_blocked_slots_ref` được set đúng:**
  ```python
  # Trong display_video()
  assert self._blocked_slots_ref is not None
  ```

- [ ] **Kiểm tra sync logic chạy đúng:**
  ```python
  # Trong _update_local_dict_from_processor()
  # Thêm log để verify
  print(f"[SYNC] Synced {len(self.blocked_rois)} cameras")
  ```

- [ ] **Kiểm tra subscribe topics đã disable:**
  ```python
  # Verify không có blocking_thread.start()
  # hoặc đã comment lại
  ```

### Runtime Verification

- [ ] **Check console logs:**
  ```
  [DISPLAY] Sử dụng blocking state sync từ roi_processor (GIẢI PHÁP 3)
  ```

- [ ] **Check blocking info trong local_dict:**
  ```python
  # Thêm debug log
  for cam_id in self.local_dict:
      if cam_id.endswith('_blocked'):
          print(f"[DEBUG] {cam_id}: {self.local_dict[cam_id]}")
  ```

- [ ] **Check performance:**
  - [ ] CPU usage không tăng
  - [ ] Memory usage ổn định
  - [ ] FPS không giảm

## 📊 Performance Checklist

### Before Implementation

- [ ] **Đo baseline metrics:**
  - [ ] CPU usage: ____%
  - [ ] Memory usage: ____MB
  - [ ] Display FPS: ____
  - [ ] Blocking latency: ____ms

### After Implementation

- [ ] **Đo metrics sau khi implement:**
  - [ ] CPU usage: ____% (expect: giảm hoặc không đổi)
  - [ ] Memory usage: ____MB (expect: không đổi)
  - [ ] Display FPS: ____ (expect: không đổi)
  - [ ] Blocking latency: ____ms (expect: giảm đáng kể)

- [ ] **So sánh:**
  - [ ] CPU: Giảm ít nhất 5% (do không subscribe)
  - [ ] Latency: Giảm từ ~500ms xuống ~50ms

## 🐛 Bug Checklist

### Known Issues to Verify Fixed

- [x] **Issue 1:** Slot bị block nhưng hiển thị "Empty"
  - [ ] Tested: ✅ Fixed
  - [ ] Notes: _________________

- [x] **Issue 2:** Race condition khi dual block
  - [ ] Tested: ✅ Fixed
  - [ ] Notes: _________________

- [x] **Issue 3:** Delay khi manual block via API
  - [ ] Tested: ✅ Fixed
  - [ ] Notes: _________________

- [x] **Issue 4:** Unblock không cập nhật display
  - [ ] Tested: ✅ Fixed
  - [ ] Notes: _________________

## 📝 Documentation Checklist

- [x] Code có comments đầy đủ
- [x] Có file IMPLEMENTATION.md
- [x] Có file SUMMARY.md
- [x] Có example code
- [x] Có checklist này

## ✅ Final Sign-off

- [ ] **All tests passed**
- [ ] **No regressions found**
- [ ] **Performance improved or same**
- [ ] **Code reviewed**
- [ ] **Documentation complete**

---

**Người test:** _________________  
**Ngày test:** _________________  
**Kết quả:** ⬜ PASS / ⬜ FAIL  
**Notes:** _________________

---

## 🚨 Rollback Plan (Nếu cần)

Nếu implementation gặp vấn đề:

1. [ ] Revert changes trong `optimized_roi_visualizer.py`:
   - [ ] Xóa `_blocked_slots_ref`
   - [ ] Remove `blocked_slots` parameter từ `display_video()`
   - [ ] Restore subscribe blocking topics

2. [ ] Test lại với code cũ

3. [ ] Phân tích lỗi và fix

4. [ ] Re-implement với fix

---

**Version:** 1.0  
**Last Updated:** 2025-01-24

