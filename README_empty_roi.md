# Empty ROI Detection

## Tổng quan

Chức năng Empty ROI Detection được thêm vào `roi_processor.py` để xử lý trường hợp các ROI không có phát hiện class "shelf" hoặc confidence của "shelf" < 0.5.

## Cách hoạt động

### 1. Logic xử lý

- **Khi có shelf với confidence >= 0.5 trong ROI**: Giữ nguyên detection "shelf"
- **Khi không có shelf hoặc confidence < 0.5 trong ROI**: Tạo detection "empty" cho ROI đó

### 2. Cấu trúc Empty Detection

```python
empty_detection = {
    "class_name": "empty",
    "confidence": 1.0,  # Confidence cao cho empty
    "class_id": -1,     # ID đặc biệt cho empty
    "bbox": {
        "x1": min_x,    # Bounding box bao quanh toàn bộ ROI
        "y1": min_y,
        "x2": max_x,
        "y2": max_y
    },
    "center": {
        "x": center_x,  # Tâm của ROI
        "y": center_y
    }
}
```

### 3. Hiển thị trực quan

- **Shelf trong ROI**: Màu đỏ, độ dày 3px
- **Empty ROI**: Màu vàng, độ dày 2px
- **Detections ngoài ROI**: Màu xám, độ dày 1px

### 4. Thông tin hiển thị

Video hiển thị sẽ bao gồm:
- Số lượng Shelf detections
- Số lượng Empty detections  
- Tổng số ROI detections

## Sử dụng

### Chạy ROI Processor

```bash
python roi_processor.py
```

### Xem kết quả

```bash
# Xem kết quả mới nhất
python view_roi_results.py

# Xem tất cả kết quả
python view_roi_results.py --all --limit 0

# Test chức năng empty ROI
python test_empty_roi.py
```

## Lợi ích

1. **Đảm bảo coverage**: Mỗi ROI luôn có kết quả (shelf hoặc empty)
2. **Theo dõi trạng thái**: Dễ dàng biết ROI nào đang trống
3. **Phân tích xu hướng**: Có thể phân tích tỷ lệ empty vs shelf theo thời gian
4. **Cảnh báo**: Có thể thiết lập alert khi tỷ lệ empty quá cao

## Cấu hình

### Confidence threshold

Mặc định: 0.5 (có thể thay đổi trong code)

```python
if detection.get("class_name") == "shelf" and detection.get("confidence", 0) >= 0.5:
```

### Màu sắc hiển thị

- Empty ROI: `(0, 255, 255)` - Vàng
- Shelf ROI: `(0, 0, 255)` - Đỏ  
- Ngoài ROI: `(128, 128, 128)` - Xám

## Monitoring

### Log output

```
Camera cam-1 - Frame 123: Shelf: 2, Empty: 1, Total ROI: 3
```

### Database

Dữ liệu được lưu trong `roi_detection` queue với format:

```json
{
  "camera_id": "cam-1",
  "frame_id": 123,
  "timestamp": "2025-01-01T12:00:00Z",
  "roi_detections": [
    {
      "class_name": "shelf",
      "confidence": 0.85,
      "class_id": 0,
      "bbox": {...},
      "center": {...}
    },
    {
      "class_name": "empty", 
      "confidence": 1.0,
      "class_id": -1,
      "bbox": {...},
      "center": {...}
    }
  ],
  "roi_detection_count": 2,
  "original_detection_count": 3
}
```
