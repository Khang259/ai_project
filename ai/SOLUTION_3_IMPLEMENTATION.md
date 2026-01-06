# GIẢI PHÁP 3: Sync Blocking State - Implementation Guide

## 📋 Tổng quan

**Vấn đề:** Ô bị block nhưng hiển thị "Empty" thay vì "Blocked" do race condition giữa 2 luồng dữ liệu:
- Detection data từ `roi_processor.filter_detections_by_roi()`
- Blocking state từ subscribe topics (`dual_block`, `block_slot`, etc.)

**Giải pháp 3:** Sync blocking state trực tiếp từ `roi_processor.blocked_slots` thay vì subscribe topics độc lập.

## ✅ Ưu điểm

1. **Single Source of Truth**: `roi_processor.blocked_slots` là nguồn duy nhất
2. **Không có Race Condition**: Cùng thời điểm update detection + blocking state
3. **Đồng bộ tức thì**: Không có delay giữa 2 luồng
4. **Đơn giản hóa code**: Không cần subscribe nhiều topics

## 🔧 Implementation

### Bước 1: Thêm Reference trong VideoDisplayManager

**File:** `optimized_roi_visualizer.py`

```python
# Trong __init__()
self._blocked_slots_ref: Optional[Dict[str, Dict[int, float]]] = None  # Reference đến roi_processor.blocked_slots
```

### Bước 2: Update display_video() để nhận blocked_slots

```python
def display_video(self, roi_cache: Dict, latest_roi_detections: Dict,
                  end_slot_states: Dict, video_captures: Dict,
                  frame_cache: Dict, update_frame_cache_func,
                  blocked_slots: Optional[Dict] = None):  # ← THÊM THAM SỐ
    """
    Args:
        blocked_slots: Reference đến roi_processor.blocked_slots (GIẢI PHÁP 3)
    """
    # Set shared references
    self._roi_cache_ref = roi_cache
    self._latest_roi_det_ref = latest_roi_detections
    self._end_slot_states_ref = end_slot_states
    self._blocked_slots_ref = blocked_slots  # ← LƯU REFERENCE
```

### Bước 3: Sync trong _update_local_dict_from_processor()

```python
def _update_local_dict_from_processor(self):
    """
    GIẢI PHÁP 3: Sync blocking state trực tiếp từ roi_processor.blocked_slots
    """
    try:
        # Update ROI cache
        if self._roi_cache_ref:
            for camera_id, roi_slots in self._roi_cache_ref.items():
                self.local_dict[f'{camera_id}_roi'] = roi_slots
        
        # Update detection cache
        if self._latest_roi_det_ref:
            for camera_id, roi_det_data in self._latest_roi_det_ref.items():
                self.local_dict[f'{camera_id}_detections'] = roi_det_data
        
        # ← SYNC BLOCKING STATE TỪ SOURCE OF TRUTH
        if self._blocked_slots_ref:
            # Clear và rebuild từ roi_processor.blocked_slots
            self.blocked_rois.clear()
            
            for camera_id, blocked_slots_dict in self._blocked_slots_ref.items():
                if blocked_slots_dict:
                    self.blocked_rois[camera_id] = {}
                    for slot_number, expire_time in blocked_slots_dict.items():
                        self.blocked_rois[camera_id][slot_number] = {
                            "blocked_at": time.time(),
                            "expire_time": expire_time,
                            "source": "roi_processor_sync"
                        }
        
        # Update vào local_dict
        for camera_id, blocked_slots in self.blocked_rois.items():
            self.local_dict[f'{camera_id}_blocked'] = blocked_slots
        
        # Clear blocked state cho cameras không còn bị block
        if self._blocked_slots_ref is not None:
            for camera_id in list(self.local_dict.keys()):
                if camera_id.endswith('_blocked'):
                    cam_id = camera_id.replace('_blocked', '')
                    if cam_id not in self._blocked_slots_ref or not self._blocked_slots_ref[cam_id]:
                        self.local_dict[camera_id] = {}
    
    except Exception as e:
        print(f"[UPDATE] Lỗi update local_dict: {e}")
```

### Bước 4: Disable subscribe blocking topics

```python
# KHÔNG CẦN subscribe blocking topics nữa
# Vì đã sync trực tiếp từ roi_processor.blocked_slots

# # Khởi động blocking subscription thread - KHÔNG CẦN NỮA
# if self.queue:
#     blocking_thread = threading.Thread(target=self._subscribe_all_blocking, daemon=True)
#     blocking_thread.start()

print("[DISPLAY] Sử dụng blocking state sync từ roi_processor (GIẢI PHÁP 3)")
```

## 🚀 Cách sử dụng

### Nếu có roi_processor instance:

```python
# Trong file main hoặc nơi khởi tạo cả roi_processor và visualizer
from roi_processor import ROIProcessor
from optimized_roi_visualizer import VideoDisplayManager

# Khởi tạo
processor = ROIProcessor(db_path="queues.db")
visualizer = VideoDisplayManager(show_video=True)

# Gọi display_video với blocked_slots reference
visualizer.display_video(
    roi_cache=processor.roi_cache,
    latest_roi_detections=processor.latest_roi_detections,
    end_slot_states=processor.end_slot_states,
    video_captures={},
    frame_cache={},
    update_frame_cache_func=None,
    blocked_slots=processor.blocked_slots  # ← TRUYỀN REFERENCE
)
```

### Nếu chạy standalone (view-cam.py, camera_gui_viewer.py):

Các app standalone vẫn cần subscribe blocking topics vì không có reference đến `roi_processor`:

```python
# Vẫn giữ subscribe blocking topics cho standalone apps
blocking_thread = threading.Thread(target=self._subscribe_all_blocking, daemon=True)
blocking_thread.start()
```

## 📊 So sánh Before/After

### Before (Subscribe Topics - Có Race Condition):

```
Timeline:
T1: roi_processor nhận dual_block → cập nhật blocked_slots
T2: roi_processor xử lý frame → tạo "empty" detection
T3: visualizer copy detection data
T4: visualizer._handle_dual_block() chưa chạy → blocked_rois CHƯA có
T5: Display → thấy "empty" + blocked_rois[slot]=False → Hiển thị "Empty" ❌
```

### After (Sync Direct - Không có Race Condition):

```
Timeline:
T1: roi_processor nhận dual_block → cập nhật blocked_slots
T2: roi_processor xử lý frame → tạo "empty" detection
T3: visualizer._update_local_dict_from_processor():
    - Copy detection data
    - Sync blocked_slots từ roi_processor (cùng lúc)
T4: Display → thấy "empty" + blocked_rois[slot]=True → Hiển thị "Blocked" ✅
```

## 🔍 Test Cases

### Test 1: Dual Block
```python
# Gửi dual_block message
queue.publish("dual_block", dual_id, {
    "dual_id": "123->456",
    "start_qr": 123,
    "end_qrs": 456
})

# Kiểm tra: Slot phải hiển thị "Blocked" ngay lập tức
```

### Test 2: Manual Block via API
```python
# Gửi block_slot message
queue.publish("block_slot", qr_code, {
    "qr_code": 789,
    "reason": "manual_test"
})

# Kiểm tra: Slot phải hiển thị "Blocked" ngay lập tức
```

### Test 3: Unblock
```python
# Gửi unblock message
queue.publish("unblock_slot", qr_code, {
    "qr_code": 789,
    "reason": "manual_test"
})

# Kiểm tra: Slot phải hiển thị "Empty" hoặc "Shelf" (không còn "Blocked")
```

## 📝 Lưu ý

1. **Chỉ áp dụng cho integrated apps**: Apps có cả `roi_processor` và `visualizer` trong cùng process
2. **Standalone apps vẫn dùng subscribe**: `view-cam.py`, `camera_gui_viewer.py` vẫn cần subscribe topics
3. **Thread-safe**: Sử dụng `cache_lock` trong `roi_processor` khi truy cập `blocked_slots`
4. **Performance**: Giảm overhead do không cần subscribe và process nhiều topics

## ✅ Checklist Implementation

- [x] Thêm `_blocked_slots_ref` trong `VideoDisplayManager.__init__()`
- [x] Update `display_video()` signature để nhận `blocked_slots` parameter
- [x] Implement sync logic trong `_update_local_dict_from_processor()`
- [x] Disable subscribe blocking topics trong integrated mode
- [x] Thêm comments giải thích cho standalone apps
- [ ] Test với dual block scenario
- [ ] Test với manual block/unblock API
- [ ] Test với unlock_start_slot
- [ ] Verify không còn hiển thị "Empty" khi slot bị block

## 🎯 Kết quả mong đợi

Sau khi implement Giải pháp 3:
- ✅ Không còn race condition giữa detection data và blocking state
- ✅ Slot bị block luôn hiển thị "Blocked" (không bao giờ hiển thị "Empty")
- ✅ Đồng bộ tức thì khi block/unblock
- ✅ Code đơn giản hơn, dễ maintain hơn

