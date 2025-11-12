# Thay đổi Logic xử lý Model "hang"

## Ngày: 2025-11-12

### Vấn đề
Model YOLO trả về:
- `class_id = 0` ứng với `class_name = "hang"` (có hàng)

Logic cũ trong code có comments và giải thích **SAI** (nói model detect "shelf").

### Các thay đổi đã thực hiện

#### 1. File: `roi_checker.py`

**a) Header docstring (dòng 1-6)**
- **Trước**: "Check 2 (Đối tượng): Class có phải là shelf/empty dựa trên confidence"
- **Sau**: "Check 2 (Đối tượng): Model detect class 'hang' (class_id=0) → shelf, không detect → empty"

**b) Hàm `classify_object()` (dòng 181-202)**
- **Thay đổi chính**: Thêm check `class_id == 0` để đảm bảo chỉ xử lý class "hang"
- **Logic cũ**:
  ```python
  if confidence > conf_threshold:
      return "shelf"
  else:
      return "empty"
  ```
- **Logic mới**:
  ```python
  if class_id == 0 and confidence >= conf_threshold:
      return "shelf"  # Có hàng (detection hợp lệ)
  else:
      return "empty"  # Confidence thấp hoặc class không hợp lệ
  ```

**c) Hàm `process_detection_result()` docstring (dòng 257-293)**
- **Trước**: "Model chỉ có 1 class 'shelf', logic..."
- **Sau**: "Model có 1 class 'hang' (class_id = 0), logic..."
- Cập nhật comment để phản ánh đúng tên class

### Logic xử lý tổng thể (KHÔNG ĐỔI)

```
1. AI Inference detect → class_id=0, confidence=0.95
2. ROI Checker nhận detection từ Queue
3. Check vị trí: center detection có trong ROI không?
   ├─ YES → Tiếp tục check object
   └─ NO  → Bỏ qua detection này
4. Check object: classify_object(class_id=0, conf=0.95)
   ├─ class_id == 0 AND conf >= 0.5 → "shelf" (có hàng)
   └─ Else → "empty"
5. Nếu ROI không có detection nào match → "empty" (dòng 343-352)
```

### Kết quả

- ✅ Logic xử lý đúng với model detect class "hang"
- ✅ Comments và docstring đã cập nhật chính xác
- ✅ Thêm validation `class_id == 0` để chắc chắn
- ✅ Không có linter errors

### Files không cần sửa

- `ai_inference.py`: Chỉ lấy `class_name` từ model để log/display, không ảnh hưởng logic
- `roi_visualizer.py`: Chỉ hiển thị kết quả "shelf"/"empty" từ ROI Checker, logic đúng rồi

### Test cần thực hiện

1. Chạy hệ thống với camera có hàng → ROI phải hiển thị "shelf"
2. Chạy với camera không có hàng → ROI phải hiển thị "empty"
3. Kiểm tra log detection để đảm bảo `class_name = "hang"` được detect đúng

