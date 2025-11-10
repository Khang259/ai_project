# ROI Checker - Kiểm tra vùng ROI với 2 lớp

## 📋 Tổng quan

ROI Checker là module xử lý kiểm tra detection trong vùng ROI với **2 lớp kiểm tra** (2-layer check):
- **Check 1 (Vị trí)**: Kiểm tra detection có nằm trong vùng ROI không (sử dụng IoU)
- **Check 2 (Đối tượng)**: Phân loại object là "shelf" hay "empty" dựa trên confidence

## 🔄 Luồng xử lý

```
Camera Process → Shared Dict → AI Inference → detection_queue
                                                      ↓
                                               ROI Checker
                                                      ↓
                                              roi_result_queue
                                                      ↓
                                            ROI Result Consumer
                                                      ↓
                                                  Display
```

### Chi tiết từng bước:

1. **AI Inference**: Đưa detection vào `detection_queue`
   ```json
   {
     "camera_id": "cam-88",
     "timestamp": 1678886400,
     "detection_results": [
       {"class": 0, "bbox": [x1, y1, x2, y2], "confidence": 0.92}
     ]
   }
   ```

2. **ROI Checker**: Đọc từ `detection_queue`
   - Tra cứu ROI config theo `camera_id`
   - Kiểm tra từng detection với từng ROI
   - Gửi kết quả match vào `roi_result_queue`

3. **ROI Result Consumer**: Hiển thị kết quả
   ```
   📦 ROI Match | cam-88 -> ROI_3 | Type: shelf | Conf: 0.92 | IoU: 0.85
   ```

## 🧮 Thuật toán kiểm tra 2 lớp

### Check 1: Kiểm tra vị trí (IoU)

```python
def calculate_iou(bbox, roi_rect):
    # bbox: [x1, y1, x2, y2] - detection
    # roi_rect: [x, y, w, h] - ROI
    
    # Tính vùng giao (intersection)
    # Tính vùng hợp (union)
    
    iou = intersection / union
    return iou

# Match nếu IoU >= threshold (mặc định: 0.3)
```

### Check 2: Phân loại đối tượng

```python
def classify_object(class_id, confidence, threshold=0.6):
    if class_id == 0:
        if confidence > 0.6:
            return "shelf"  # Có hàng
        else:
            return "empty"  # Trống
    else:
        return f"class_{class_id}"
```

## ⚙️ Cấu hình

### ROI Config File: `logic/roi_config.json`

```json
{
  "Cam_88": [
    {
      "slot_id": "ROI_1",
      "rect": [120, 127, 125, 129]
    },
    {
      "slot_id": "ROI_2",
      "rect": [507, 112, 101, 210]
    }
  ]
}
```

### Tham số ROI Checker

- **iou_threshold**: `0.3` - Ngưỡng IoU để coi detection nằm trong ROI
- **conf_threshold**: `0.6` - Ngưỡng confidence để phân biệt shelf/empty
- **roi_config_path**: `"../logic/roi_config.json"` - Đường dẫn file ROI config

## 🎯 Camera ID Normalization

ROI Checker hỗ trợ **tự động chuẩn hóa** camera ID để linh hoạt:

```python
# Tất cả các format này đều match:
"cam-88"  → "cam88"
"Cam_88"  → "cam88"
"CAM_88"  → "cam88"
"cam88"   → "cam88"
```

## 📊 Output Format

Kết quả match được gửi vào `roi_result_queue`:

```json
{
  "camera_id": "cam-88",
  "timestamp": 1678886400,
  "slot_id": "ROI_3",
  "object_type": "shelf",
  "confidence": 0.92,
  "iou": 0.85,
  "bbox": [710, 118, 928, 335]
}
```

## 🚀 Cách sử dụng

### Tích hợp vào hệ thống chính

ROI Checker đã được tích hợp sẵn vào `main.py`:

```bash
cd detectObject
python main.py
```

Hệ thống sẽ tự động khởi động:
1. Camera processes
2. AI Inference process
3. **ROI Checker process** (mới)
4. **ROI Result Consumer process** (mới)

### Test standalone

```bash
cd detectObject
python roi_checker.py
```

## 📈 Performance

- **Độ trễ**: < 1ms per detection (kiểm tra IoU rất nhanh)
- **Throughput**: Xử lý được hàng nghìn detections/giây
- **Memory**: Hash table lưu ROI config trong RAM (tối ưu tốc độ)

## 🔧 Tuning Parameters

### IoU Threshold

```python
# Giá trị khuyến nghị:
iou_threshold = 0.3  # Chặt (strict)
iou_threshold = 0.2  # Trung bình (moderate)
iou_threshold = 0.1  # Lỏng (loose)
```

### Confidence Threshold

```python
# Giá trị khuyến nghị:
conf_threshold = 0.6  # Mặc định
conf_threshold = 0.7  # Chặt hơn (ít false positive)
conf_threshold = 0.5  # Lỏng hơn (ít false negative)
```

## 📝 Log Output

```
2025-11-04 15:06:26 | INFO | roi_checker | ✓ Match | cam-88 | ROI_3 | Type: shelf | IoU: 0.85 | Conf: 0.92
2025-11-04 15:06:26 | INFO | roi_checker | ✓ Match | cam-88 | ROI_2 | Type: shelf | IoU: 0.76 | Conf: 0.91
2025-11-04 15:06:26 | INFO | roi_checker | ✓ Match | cam-88 | ROI_4 | Type: shelf | IoU: 0.68 | Conf: 0.89
2025-11-04 15:06:26 | INFO | roi_checker | ✓ Match | cam-88 | ROI_1 | Type: empty | IoU: 0.42 | Conf: 0.59
```

## 🐛 Troubleshooting

### Không tìm thấy ROI config

```
Camera cam-88 không có ROI config
```

**Giải pháp**: 
- Kiểm tra file `logic/roi_config.json` có tồn tại không
- Kiểm tra camera_id trong config có khớp không (dùng normalization)

### Không có match

```
Tìm thấy 0 match(es)
```

**Nguyên nhân**:
- IoU threshold quá cao → Giảm xuống (0.2 - 0.3)
- ROI rect không chính xác → Vẽ lại bằng `roi_tool.py`
- Detection bbox ngoài ROI → Kiểm tra lại camera

### IoU = 0

```
IoU: 0.00
```

**Nguyên nhân**:
- Detection và ROI không giao nhau
- Bbox format sai (phải là [x1, y1, x2, y2])
- ROI rect format sai (phải là [x, y, w, h])

## 📚 API Reference

### ROIHashTable

```python
roi_table = ROIHashTable("logic/roi_config.json")
rois = roi_table.get_rois("cam-88")  # Lấy ROI của camera
roi_table.reload()  # Reload config từ file
```

### Functions

```python
# Tính IoU
iou = calculate_iou(bbox, roi_rect)

# Phân loại object
obj_type = classify_object(class_id, confidence, threshold)

# Kiểm tra 2 lớp
is_match, obj_type, iou = check_detection_in_roi(detection, roi)

# Xử lý detection result
matches = process_detection_result(result, roi_table)
```

