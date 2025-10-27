# FPS Control System - Hệ thống điều chỉnh tần suất detection

## Tổng quan

Hệ thống FPS Control cho phép điều chỉnh tần suất detection của camera và AI inference để tối ưu hóa hiệu suất và tài nguyên hệ thống.

## Cấu hình FPS

### 1. Preset FPS có sẵn

| Preset | FPS | CPU Usage | GPU Usage | Detection Rate | Use Case |
|--------|-----|-----------|-----------|----------------|----------|
| `very_low` | 0.5 | Rất thấp | Rất thấp | 2 detections/phút/camera | Monitoring dài hạn, tài nguyên hạn chế |
| `low` | 1.0 | Thấp | Thấp | 4 detections/phút/camera | Monitoring cơ bản |
| `normal` | 2.0 | Trung bình | Trung bình | 8 detections/phút/camera | Sử dụng hàng ngày (mặc định) |
| `high` | 5.0 | Cao | Cao | 20 detections/phút/camera | Monitoring real-time |
| `very_high` | 10.0 | Rất cao | Rất cao | 40 detections/phút/camera | Monitoring real-time cao cấp |

### 2. Cách thay đổi FPS

#### Trong `main.py`:

```python
# Sử dụng preset
FPS_PRESET = "normal"  # Chọn: "very_low", "low", "normal", "high", "very_high"
TARGET_FPS = get_fps_config(preset_name=FPS_PRESET)

# HOẶC sử dụng FPS tùy chỉnh
CUSTOM_FPS = 1.5  # FPS tùy chỉnh
TARGET_FPS = get_fps_config(custom_fps=CUSTOM_FPS)
```

#### Trong `fps_config.py`:

```python
# Thay đổi FPS mặc định
DEFAULT_FPS_CONFIG = {
    "target_fps": 2.0,  # Thay đổi giá trị này
    # ...
}
```

## Cơ chế hoạt động

### 1. Camera Thread FPS Control

Trong `camera_thread.py`:

```python
# Kiểm tra FPS - chỉ xử lý frame nếu đã đủ thời gian
current_time = time.time()
if current_time - self.last_frame_time < self.frame_interval:
    continue  # Bỏ qua frame này để duy trì FPS mục tiêu

self.last_frame_time = current_time
```

### 2. AI Inference FPS Control

Trong `ai_inference.py`:

```python
# Kiểm tra FPS - chỉ inference nếu đã đủ thời gian
current_time = time.time()
if current_time - last_inference_time < inference_interval:
    time.sleep(0.01)  # Sleep ngắn để không chiếm CPU
    continue

last_inference_time = current_time
```

## So sánh hiệu suất

### Trước khi có FPS Control:
- **Tần suất**: 5-10 FPS mỗi camera
- **Detection rate**: 300-600 detections/phút/camera
- **CPU Usage**: 100%
- **GPU Usage**: 1-2%

### Sau khi có FPS Control (preset "normal"):
- **Tần suất**: 2 FPS mỗi camera
- **Detection rate**: 120 detections/phút/camera
- **CPU Usage**: Giảm đáng kể
- **GPU Usage**: Tăng hiệu quả

## Cách sử dụng

### 1. Chạy với preset mặc định:

```bash
cd detectObject
python main.py
```

### 2. Test FPS:

```bash
python test_fps.py
```

### 3. Xem thông tin preset:

```bash
python fps_config.py
```

## Khuyến nghị sử dụng

### Hệ thống có tài nguyên hạn chế:
- Sử dụng preset `very_low` (0.5 FPS) hoặc `low` (1.0 FPS)
- Phù hợp cho monitoring dài hạn

### Hệ thống cân bằng:
- Sử dụng preset `normal` (2.0 FPS) - **khuyến nghị mặc định**
- Phù hợp cho sử dụng hàng ngày

### Hệ thống hiệu suất cao:
- Sử dụng preset `high` (5.0 FPS) hoặc `very_high` (10.0 FPS)
- Phù hợp cho monitoring real-time

## Monitoring và Debug

### 1. Kiểm tra log file:

```bash
# Xem file log detection
tail -f logs/ai_detections_YYYYMMDD.jsonl
```

### 2. Đếm số detection:

```bash
# Đếm số detection trong 1 phút
grep "$(date '+%Y-%m-%dT%H:%M')" logs/ai_detections_YYYYMMDD.jsonl | wc -l
```

### 3. Phân tích hiệu suất:

```bash
# Chạy test FPS
python test_fps.py
```

## Troubleshooting

### Vấn đề: FPS thực tế thấp hơn mục tiêu
- **Nguyên nhân**: Camera chậm hoặc network lag
- **Giải pháp**: Giảm FPS mục tiêu hoặc kiểm tra kết nối camera

### Vấn đề: CPU/GPU usage vẫn cao
- **Nguyên nhân**: FPS quá cao cho hệ thống
- **Giải pháp**: Giảm FPS preset xuống `low` hoặc `very_low`

### Vấn đề: Detection bị miss
- **Nguyên nhân**: FPS quá thấp
- **Giải pháp**: Tăng FPS preset lên `high` hoặc `very_high`

## Tương lai

- [ ] Dynamic FPS adjustment dựa trên tải hệ thống
- [ ] FPS khác nhau cho từng camera
- [ ] Adaptive FPS dựa trên nội dung video
- [ ] FPS scheduling theo thời gian trong ngày
