# Hệ thống End Slot Monitoring

## Tổng quan

Hệ thống End Slot Monitoring cho phép `roi_processor.py` tự động unlock điểm start khi robot đã chuyển hàng thành công đến điểm end. Hệ thống theo dõi trạng thái của end slot và unlock start slot tương ứng khi điều kiện được thỏa mãn.

## Cách hoạt động

### 1. Luồng hoạt động chính

```
postAPI.py → stable_pairs queue → roi_processor.py
    ↓
1. Block start slot (start_qr)
2. Bắt đầu theo dõi end slot (end_qr)
3. Monitor trạng thái end slot: empty ↔ shelf
4. Khi end slot có shelf stable 20s → unlock start slot
```

### 2. Các thành phần chính

#### A. End-to-Start Mapping
- Được tạo từ `slot_pairing_config.json` phần `pairs`
- Mapping: `(end_camera_id, end_slot_number) → (start_camera_id, start_slot_number)`

#### B. End Slot State Tracking
- Theo dõi trạng thái của mỗi end slot: `empty` hoặc `shelf`
- Lưu thời gian bắt đầu có shelf (`first_shelf_time`)
- Kiểm tra thời gian stable để unlock

#### C. Unlock Mechanism
- Khi end slot có shelf stable ≥ 20s → unlock start slot tương ứng
- Xóa block entry khỏi `blocked_slots`

## Cấu hình

### 1. slot_pairing_config.json

```json
{
  "pairs": [
    {
      "start_qr": 11,    // QR code của start slot
      "end_qrs": 24      // QR code của end slot
    }
  ]
}
```

### 2. Tham số có thể điều chỉnh

```python
# Trong roi_processor.py
self.shelf_stable_time: float = 20.0  # Thời gian shelf stable để unlock (giây)
```

## Sử dụng

### 1. Chạy hệ thống

```bash
# Terminal 1: Chạy roi_processor
python roi_processor.py

# Terminal 2: Chạy postAPI
python postRq/postAPI.py
```

### 2. Test hệ thống

```bash
# Chạy script test
python test_end_monitoring.py
```

### 3. Monitor logs

Hệ thống sẽ hiển thị các log sau:

```
[BLOCK] Đã block ROI slot 1 trên cam-1 đến 2024-01-01 12:00:00 do start_qr=11
[END_MONITOR] Bắt đầu theo dõi end slot 4 trên cam-2 (QR: 24)
[END_MONITOR] End slot 4 trên cam-2: empty -> shelf (bắt đầu đếm)
[UNLOCK] Đã unlock start slot 1 trên cam-1 (do end slot 4 trên cam-2 có shelf stable 20s)
```

## API và Queue

### 1. stable_pairs Queue

**Input từ postAPI.py:**
```json
{
  "pair_id": "pair_001",
  "start_slot": "11",    // QR code của start slot
  "end_slot": "24"       // QR code của end slot
}
```

**Xử lý trong roi_processor.py:**
- `start_slot` → Block ROI tương ứng
- `end_slot` → Bắt đầu theo dõi ROI tương ứng

### 2. roi_detection Queue

**Output từ roi_processor.py:**
```json
{
  "camera_id": "cam-1",
  "frame_id": 12345,
  "timestamp": 1640995200.0,
  "roi_detections": [
    {
      "class_name": "empty",
      "confidence": 1.0,
      "slot_number": 1
    }
  ],
  "roi_detection_count": 1
}
```

## Debug và Troubleshooting

### 1. Kiểm tra trạng thái

```python
# Trong roi_processor.py, thêm debug code:
print(f"End slot states: {self.end_slot_states}")
print(f"End-to-start mapping: {self.end_to_start_mapping}")
print(f"Blocked slots: {self.blocked_slots}")
```

### 2. Các vấn đề thường gặp

#### A. End slot không được theo dõi
- Kiểm tra `slot_pairing_config.json` có đúng mapping không
- Kiểm tra QR code có tồn tại trong config không

#### B. Không unlock được start slot
- Kiểm tra end slot có chuyển từ empty → shelf không
- Kiểm tra thời gian shelf stable có đủ 20s không
- Kiểm tra start slot có bị block không

#### C. Unlock nhiều lần
- Hệ thống tự động reset `first_shelf_time` sau khi unlock
- Không thể unlock cùng một start slot nhiều lần

### 3. Log monitoring

```bash
# Theo dõi logs real-time
tail -f logs/logs_errors/logs_errors_post_request/logs_errors_post_request_*.log
```

## Tích hợp với hệ thống hiện tại

### 1. Không ảnh hưởng đến chức năng cũ
- Hệ thống block/unblock cũ vẫn hoạt động bình thường
- End monitoring chỉ thêm tính năng tự động unlock

### 2. Tương thích với postAPI.py
- postAPI.py không cần thay đổi
- Chỉ cần đảm bảo stable_pairs có đầy đủ start_slot và end_slot

### 3. Video display
- Hiển thị thêm thông tin "End Monitoring: X" trên video
- Không ảnh hưởng đến hiển thị ROI và detections

## Mở rộng trong tương lai

### 1. Cấu hình linh hoạt
- Thời gian shelf stable có thể cấu hình per-pair
- Thêm các điều kiện unlock khác (confidence threshold, etc.)

### 2. Monitoring nâng cao
- Thêm metrics và statistics
- Dashboard hiển thị trạng thái real-time

### 3. Error handling
- Retry mechanism khi unlock fail
- Fallback strategies khi end slot không được detect
