# Multi Camera YOLO Detection

## Tổng quan

`yolo_detector.py` đã được cập nhật để hỗ trợ detection đồng thời trên nhiều camera sử dụng threading.

## Chức năng mới

### 1. Multi Camera Detection (Mặc định)

Chạy detection đồng thời trên 2 camera:
- **Camera 1**: `video/hanam.mp4` → lưu vào queue với key `cam-1`
- **Camera 2**: `video/vinhPhuc.mp4` → lưu vào queue với key `cam-2`

### 2. Single Camera Detection

Chạy detection cho một camera duy nhất (chế độ cũ).

## Cách sử dụng

### Chạy Multi Camera (Mặc định)

```bash
python yolo_detector.py
```

Hoặc:

```bash
python yolo_detector.py --multi-camera
```

### Chạy Single Camera

```bash
python yolo_detector.py --single-camera --camera-id cam-1 --video-source video/hanam.mp4
```

### Các tham số khác

```bash
python yolo_detector.py --model model/model-hanam_0506.pt --confidence 0.6
```

## Cấu trúc Code

### 1. YOLODetector Class

- **Chức năng**: Detection cho một camera
- **Threading**: Hỗ trợ `running` flag để dừng gracefully
- **Video Display**: Mỗi camera có cửa sổ riêng

### 2. MultiCameraDetector Class

- **Chức năng**: Quản lý nhiều camera
- **Threading**: Mỗi camera chạy trong thread riêng
- **Control**: Có thể dừng từng camera hoặc tất cả

### 3. Threading Architecture

```
Main Thread
├── Camera 1 Thread (video/hanam.mp4 → cam-1)
└── Camera 2 Thread (video/vinhPhuc.mp4 → cam-2)
```

## Dữ liệu Queue

### Raw Detection Queue

```json
{
  "camera_id": "cam-1" hoặc "cam-2",
  "frame_id": 123,
  "timestamp": "2025-01-01T12:00:00Z",
  "frame_shape": {...},
  "detections": [...],
  "detection_count": 5
}
```

### Key Mapping

- `cam-1` → `video/hanam.mp4`
- `cam-2` → `video/vinhPhuc.mp4`

## Hiển thị Video

- Mỗi camera có cửa sổ riêng: `"YOLO Detection - {camera_id}"`
- Thông tin hiển thị: Camera ID, số detections, frame number
- Phím điều khiển:
  - `q`: Thoát camera hiện tại
  - `s`: Lưu ảnh hiện tại
  - `Ctrl+C`: Dừng tất cả camera

## Lợi ích

1. **Parallel Processing**: 2 camera chạy đồng thời
2. **Independent Control**: Có thể dừng từng camera riêng
3. **Resource Efficient**: Sử dụng threading thay vì multiprocessing
4. **Scalable**: Dễ dàng thêm camera mới
5. **Queue Separation**: Dữ liệu được tách biệt theo camera_id

## Monitoring

### Log Output

```
=== Multi Camera Detection ===
Camera 1: video/hanam.mp4
Camera 2: video/vinhPhuc.mp4
Kết quả sẽ được lưu vào queue với key tương ứng
Đã thêm camera cam-1 với video source: video/hanam.mp4
Đã thêm camera cam-2 với video source: video/vinhPhuc.mp4
Đã bắt đầu detection thread cho camera cam-1
Đã bắt đầu detection thread cho camera cam-2
Đã khởi động 2 camera
```

### Queue Monitoring

```bash
# Xem kết quả camera 1
python view_roi_results.py --camera-id cam-1

# Xem kết quả camera 2  
python view_roi_results.py --camera-id cam-2

# Xem tất cả kết quả
python view_roi_results.py --all --limit 0
```

## Troubleshooting

### 1. Video file không tồn tại

```
RuntimeError: Không thể mở video source: video/vinhPhuc.mp4
```

**Giải pháp**: Đảm bảo file video tồn tại trong thư mục `video/`

### 2. Thread không dừng

**Giải pháp**: Sử dụng `Ctrl+C` để dừng tất cả camera

### 3. Performance issues

**Giải pháp**: 
- Giảm confidence threshold
- Tăng interval lưu queue (hiện tại mỗi 5 frame)
- Sử dụng GPU nếu có

## Tùy chỉnh

### Thêm camera mới

Sửa trong `main()`:

```python
camera_configs = {
    "cam-1": "video/hanam.mp4",
    "cam-2": "video/vinhPhuc.mp4",
    "cam-3": "video/new_video.mp4"  # Thêm camera mới
}
```

### Thay đổi video source

Sửa trong `camera_configs` dictionary.

### Thay đổi camera ID

Sửa key trong `camera_configs` dictionary.
