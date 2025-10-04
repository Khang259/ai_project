### Tài liệu chi tiết: detectObject/ai_inference.py

Tài liệu này mô tả chi tiết các lớp, hàm và tham số trong file `detectObject/ai_inference.py`. Toàn bộ nội dung được viết dựa trên mã nguồn hiện tại trong dự án.

---

### Tổng quan

- **Mục đích**: Cung cấp lớp tiện ích để chạy YOLO inference trên khung hình (OpenCV frame), vẽ kết quả detection và cung cấp thông tin detections theo định dạng dễ sử dụng; đồng thời triển khai một worker (tiến trình/luồng làm việc) đọc frame từ bộ nhớ chia sẻ, chạy inference, và ghi kết quả trở lại bộ nhớ chia sẻ khác.
- **Phụ thuộc chính**:
  - `ultralytics.YOLO`: Thư viện YOLOv8/YOLO11 từ Ultralytics.
  - `opencv-python` (cv2): Đọc/ghi ảnh, vẽ bounding boxes, encode/decode JPEG.
  - `numpy`: Xử lý mảng ảnh.

---

### Lớp YOLOInference

Lớp bao bọc mô hình YOLO để chạy inference và trực quan hoá kết quả trên frame.

- Khởi tạo: `YOLOInference(model_path)`
  - **Tham số**:
    - `model_path` (str): Đường dẫn đến file model YOLO định dạng `.pt`.
  - **Hành vi**:
    - Tải model YOLO qua `ultralytics.YOLO(model_path)`.
    - In ra log xác nhận model đã được tải: `Đã load model YOLO: {model_path}`.

- `detect(self, frame)`
  - **Mục đích**: Chạy YOLO inference trên một frame.
  - **Tham số**:
    - `frame` (np.ndarray): Ảnh đầu vào ở định dạng BGR (OpenCV).
  - **Trả về**: `results` (Ultralytics Results) hoặc `None` nếu lỗi.
    - Hàm trả `results[0]` (kết quả đầu tiên) sau khi gọi model.
  - **Ghi chú**:
    - Gọi `self.model(frame, device='cuda')` (ưu tiên GPU). Nếu không có CUDA, cần chỉnh về CPU (ví dụ: bỏ `device` hoặc `device='cpu'`).
    - Có khối `try/except` để in lỗi và trả về `None` khi inference gặp sự cố.

- `draw_results(self, frame, results)`
  - **Mục đích**: Vẽ bounding box và label (class, confidence) lên frame.
  - **Tham số**:
    - `frame` (np.ndarray): Ảnh đầu vào (sẽ bị vẽ trực tiếp lên).
    - `results` (Ultralytics Results): Kết quả inference từ YOLO.
  - **Trả về**: `frame` đã được vẽ bbox/label (np.ndarray).
  - **Hành vi**:
    - Nếu không có `results` hoặc `results.boxes` rỗng: trả về `frame` không đổi.
    - Với mỗi `box` trong `results.boxes`:
      - Lấy toạ độ bbox `x1, y1, x2, y2` qua `box.xyxy[0]`.
      - Lấy `confidence` qua `box.conf[0]`.
      - Lấy `class_id` qua `box.cls[0]`, map sang `class_name` qua `results.names[class_id]`.
      - Vẽ bbox (màu xanh lá) qua `cv2.rectangle` và vẽ label qua `cv2.putText`.

- `get_detection_info(self, results)`
  - **Mục đích**: Trả về thông tin detections ở dạng cấu trúc dữ liệu thuần Python (dễ serialize/log).
  - **Tham số**:
    - `results` (Ultralytics Results).
  - **Trả về**: `dict` với cấu trúc:
    - `{"detections": <int>, "objects": List[{"class": str, "confidence": float, "bbox": [x1, y1, x2, y2]}]}`
  - **Hành vi**:
    - Nếu không có boxes: trả `{"detections": 0, "objects": []}`.
    - Duyệt từng box để thu thập `class`, `confidence`, `bbox` (ở định dạng float).

---

### Hàm ai_inference_worker

`ai_inference_worker(shared_dict, result_dict, cam_names=None, model_path="weights/model-hanam_0506.pt")`

- **Mục đích**: Worker loop liên tục đọc frame (được mã hoá JPEG) từ `shared_dict`, chạy YOLO inference, vẽ kết quả và ghi output (ảnh JPEG + metadata) vào `result_dict`.

- **Tham số**:
  - `shared_dict` (dict-like): Nguồn dữ liệu đầu vào cho mỗi camera. Mỗi phần tử có key là `cam_name` (ví dụ: `"cam-1"`) và value là dict:
    - `{
        'frame': <bytes JPEG> | None,
        'ts': <float epoch_seconds>,
        'status': 'ok' | 'no_signal' | 'error' | 'inference_error',
        ... (có thể kèm thông tin khác tuỳ pipeline)
      }`
    - Worker chỉ xử lý khi `'status' == 'ok'`, `'frame'` khác `None`, và `(now - ts) < 2.0` giây (frame còn tươi).
  - `result_dict` (dict-like): Đích ghi kết quả cho mỗi camera, với cùng key là `cam_name`. Mỗi phần tử có dạng:
    - `{
        'frame': <bytes JPEG> | None,
        'ts': <float epoch_seconds>,
        'status': 'ok' | 'no_signal' | 'error' | 'inference_error',
        'inference_time': <float seconds>,
        'detections': <int>,
        'objects': List[ { 'class': str, 'confidence': float, 'bbox': [x1, y1, x2, y2] } ]
      }`
  - `cam_names` (List[str] | None): Danh sách camera cần xử lý. Nếu `None`, xử lý tất cả camera có trong `shared_dict`.
  - `model_path` (str): Đường dẫn file model YOLO; tuy nhiên trong mã hiện tại biến này chưa được dùng, model path đang được cố định trong thân hàm.

- **Luồng hoạt động**:
  1. In ra trạng thái khởi động và phạm vi xử lý camera (tất cả hay một phần).
  2. Tạo đối tượng `YOLOInference` và load model YOLO.
  3. Vòng lặp vô hạn:
     - Lấy danh sách camera từ `shared_dict` và lọc theo `cam_names` nếu được cung cấp.
     - Với từng `cam_name`:
       - Kiểm tra tính hợp lệ của frame: trạng thái, tồn tại frame, tuổi frame < 2 giây.
       - Giải mã JPEG thành OpenCV frame bằng `cv2.imdecode`.
       - Chạy `yolo.detect(frame)` và đo `inference_time`.
       - Nếu có kết quả:
         - Vẽ kết quả lên frame bằng `yolo.draw_results`.
         - Mã hoá lại thành JPEG (`cv2.imencode`) và lưu cùng metadata vào `result_dict[cam_name]` với `status='ok'`.
       - Nếu lỗi inference: ghi `status='inference_error'`.
     - Nếu camera không có tín hiệu hợp lệ: đặt `result_dict[cam_name]['status'] = 'no_signal'` (nếu key đã tồn tại).
     - Ngủ 0.05s (giới hạn ~20 FPS cho worker).
  4. Bắt KeyboardInterrupt để dừng và in log kết thúc.

- **Định dạng dữ liệu vào/ra**
  - Input (per camera, trong `shared_dict[cam_name]`):
    - `'frame'`: bytes ảnh JPEG (bắt buộc để suy diễn frame gốc).
    - `'ts'`: thời gian epoch giây của frame (dùng để lọc frame cũ).
    - `'status'`: chuỗi trạng thái.
  - Output (per camera, trong `result_dict[cam_name]`):
    - `'frame'`: bytes ảnh JPEG sau khi đã vẽ bbox/labels.
    - `'ts'`: thời gian hiện tại (khi ghi kết quả).
    - `'status'`: `'ok' | 'no_signal' | 'error' | 'inference_error'`.
    - `'inference_time'`: thời gian suy luận (giây, float).
    - `'detections'`: số lượng boxes.
    - `'objects'`: danh sách đối tượng (class, confidence, bbox).

---

### Ghi chú triển khai và khuyến nghị

- Thiết bị (device):
  - Mặc định gọi `self.model(frame, device='cuda')`. Nếu không có GPU/CUDA, nên chuyển sang CPU:
    - Cách 1: bỏ tham số `device` để Ultralytics tự chọn.
    - Cách 2: truyền `device='cpu'`.

- Tối ưu hoá:
  - Nếu throughput cao, cân nhắc giảm kích thước input (resize) trước khi detect.
  - Điều chỉnh `time.sleep(0.05)` để cân bằng giữa độ trễ và tải máy.

- Xử lý lỗi:
  - `detect()`: bắt mọi exception và trả `None` để worker không dừng đột ngột.
  - Worker có xử lý ngoại lệ cho từng camera nhằm cô lập lỗi.

- Đồng bộ/Chia sẻ dữ liệu:
  - `shared_dict` và `result_dict` nên là đối tượng an toàn cho đa tiến trình/đa luồng (ví dụ: `multiprocessing.Manager().dict()`).
  - Việc encode/decode JPEG giúp giảm kích thước dữ liệu chia sẻ nhưng tốn CPU; nếu cho phép, có thể truyền frame thô (np.ndarray) để giảm chi phí encode/decode.

- Nhãn lớp (label mapping):
  - Dùng `results.names[class_id]` (map từ model Ultralytics). Đảm bảo model chứa `names` đúng với tập lớp đã huấn luyện.

---

### Ví dụ sử dụng rút gọn

```python
from detectObject.ai_inference import YOLOInference
import cv2

yolo = YOLOInference('weights/model-hanam_0506.pt')
frame = cv2.imread('sample.jpg')

res = yolo.detect(frame)
vis = yolo.draw_results(frame.copy(), res)
info = yolo.get_detection_info(res)

print(info)
cv2.imshow('Detections', vis)
cv2.waitKey(0)
```

---

### Thay đổi/điểm cần lưu ý trong mã hiện tại

- Tham số `model_path` trong `ai_inference_worker()` hiện không được sử dụng (đang hard-code `'weights/model-hanam_0506.pt'` khi khởi tạo `YOLOInference`). Nếu cần linh hoạt, nên thay:
  - `yolo = YOLOInference(model_path)`.

- `device='cuda'` trong `detect()` giả định có GPU. Với môi trường không có GPU, nên chuyển sang CPU để tránh lỗi.

---

### Phiên bản

- Tài liệu áp dụng cho `detectObject/ai_inference.py` trong repo tại thời điểm cập nhật gần nhất.


