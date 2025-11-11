# Debug Guide: ROI Detection với Model 1 Class

## Model & Logic
- **Model**: Chỉ có 1 class duy nhất là "shelf" (class_id = 0)
- **Logic phân loại**:
  - Detection với confidence > 0.4 → **"shelf"** (có hàng)
  - Không có detection hoặc confidence ≤ 0.4 → **"empty"** (trống)

## Phương pháp Match ROI (Kết hợp Center + IoU)

### Bước 1: Center Point Check (Ưu tiên)
```python
center_x = (bbox[0] + bbox[2]) / 2
center_y = (bbox[1] + bbox[3]) / 2
if point_in_roi(center_x, center_y, roi):
    → Match bằng "center"
```

### Bước 2: IoU Check (Fallback)
```python
if IoU >= 0.5:
    → Match bằng "iou"
```

## Thông số hiện tại
- **IoU threshold**: 0.5 (tăng từ 0.3)
- **Confidence threshold**: 0.4 (giảm từ 0.6)
- **Độ phân giải**: 1280x720 (cả camera và AI)

## Debug Steps

### 1. Kiểm tra Model
```bash
# Xem thông tin model
python -c "from ultralytics import YOLO; model = YOLO('weights/yolov8boxdetect.pt'); print(model.model.names)"
# Output mong đợi: {0: 'shelf'} hoặc tương tự
```

### 2. Kiểm tra ROI Config
```bash
# Vẽ lại ROI nếu cần
python roi_tool.py --cam cam-1 --save

# Xem ROI config
cat logic/roi_config.json | jq '.["cam-1"]'
```

### 3. Test Detection
```bash
# Chạy với debug IoU (đã bỏ comment trong code)
cd detectObject
python main_with_logic.py --no-video

# Xem log
tail -f logs/system_*.log | grep -E "(shelf|empty|IoU)"
```

## Các vấn đề thường gặp

### 1. Tất cả ROI đều "empty"
- **Nguyên nhân**: Confidence quá thấp
- **Giải pháp**: Giảm conf_threshold xuống 0.3 hoặc 0.25

### 2. Detection match sai ROI
- **Nguyên nhân**: ROI overlap hoặc quá gần nhau
- **Giải pháp**: Vẽ lại ROI với khoảng cách rõ ràng

### 3. False positive (báo "shelf" khi không có)
- **Nguyên nhân**: Model detect sai hoặc conf_threshold quá thấp
- **Giải pháp**: Tăng conf_threshold lên 0.5 hoặc 0.6

## Điều chỉnh threshold

### Trong code (permanent):
```python
# File: detectObject/main_with_logic.py, dòng 184
args=(self.detection_queue, self.roi_result_queue, "../logic/roi_config.json", 0.5, 0.4)
#                                                                              ^^^  ^^^
#                                                                              IoU  Conf
```

### Test nhanh:
Sửa trực tiếp trong `main_with_logic.py` và chạy lại

## Log format
```
2024-11-11 13:57:14 | INFO | OutputHandler | 3-Point Status:
  s1 (ROI_1): shelf [conf: 0.85]
  e1 (ROI_2): empty [conf: 0.00]
  e2 (ROI_3): shelf [conf: 0.92]
```
