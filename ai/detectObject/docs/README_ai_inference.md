# Tài liệu AI Inference Module

## Tổng quan
Module `ai_inference.py` cung cấp chức năng xử lý AI inference sử dụng YOLO model để phát hiện đối tượng trong video stream từ camera.

## Cấu trúc Module

### 1. Class YOLOInference

#### Mô tả
Class chính để xử lý inference YOLO, bao gồm các chức năng detect, vẽ kết quả và format dữ liệu.

#### Constructor
```python
def __init__(self, model_path)
```

**Tham số:**
- `model_path` (str): Đường dẫn đến file model YOLO (.pt)

**Chức năng:**
- Khởi tạo YOLO model từ đường dẫn được cung cấp
- In thông báo xác nhận khi load model thành công

#### Methods

##### detect(frame)
```python
def detect(self, frame)
```

**Mô tả:** Thực hiện inference YOLO trên frame đầu vào

**Tham số:**
- `frame` (numpy.ndarray): Frame OpenCV cần xử lý

**Trả về:**
- `results` (YOLO results object): Kết quả detection từ YOLO, hoặc None nếu có lỗi

**Xử lý lỗi:**
- Bắt exception và in thông báo lỗi nếu inference thất bại

##### draw_results(frame, results)
```python
def draw_results(self, frame, results)
```

**Mô tả:** Vẽ bounding box và label lên frame

**Tham số:**
- `frame` (numpy.ndarray): Frame OpenCV gốc
- `results` (YOLO results object): Kết quả detection từ YOLO

**Trả về:**
- `frame` (numpy.ndarray): Frame đã được vẽ bounding box và label

**Chi tiết:**
- Kiểm tra nếu không có detection thì trả về frame gốc
- Vẽ bounding box màu xanh lá (0, 255, 0) với độ dày 2px
- Vẽ label hiển thị tên class và confidence score
- Font: FONT_HERSHEY_SIMPLEX, kích thước 0.5

##### get_detection_info(results, frame_shape)
```python
def get_detection_info(self, results, frame_shape)
```

**Mô tả:** Chuyển đổi kết quả YOLO sang định dạng JSON chuẩn

**Tham số:**
- `results` (YOLO results object): Kết quả detection từ YOLO
- `frame_shape` (tuple): Kích thước frame (height, width, channels)

**Trả về:**
- `dict`: Thông tin detection theo format JSON với cấu trúc:
  ```json
  {
    "detections": [
      {
        "class_id": int,
        "class_name": str,
        "confidence": float,
        "bbox": {
          "x1": float,
          "y1": float,
          "x2": float,
          "y2": float
        },
        "center": {
          "x": float,
          "y": float
        }
      }
    ],
    "detection_count": int
  }
  ```

**Chi tiết:**
- Tính toán center point của bounding box
- Chuyển đổi tất cả giá trị sang float để JSON serializable
- Trả về danh sách rỗng nếu không có detection

### 2. Function ai_inference_worker

#### Mô tả
Worker process chính để xử lý AI inference cho nhiều camera đồng thời.

#### Signature
```python
def ai_inference_worker(shared_dict, result_dict, cam_names=None, model_path="weights/model_vl_0205.pt")
```

#### Tham số
- `shared_dict` (dict): Dictionary chứa frame từ camera processes
- `result_dict` (dict): Dictionary để lưu kết quả detection
- `cam_names` (list, optional): Danh sách tên camera cần xử lý (None = xử lý tất cả)
- `model_path` (str): Đường dẫn model YOLO (mặc định: "weights/model_vl_0205.pt")

#### Chức năng chính

##### 1. Khởi tạo
- Load YOLO model từ đường dẫn được cung cấp
- In thông báo trạng thái khởi tạo
- Xử lý lỗi nếu không load được model

##### 2. Vòng lặp chính
- Lấy danh sách camera từ `shared_dict`
- Lọc camera theo `cam_names` nếu được chỉ định
- Xử lý từng camera một cách tuần tự

##### 3. Xử lý frame
- Kiểm tra frame có hợp lệ không (status='ok', frame không None, age < 2s)
- Decode frame từ JPEG bytes
- Resize frame về kích thước 1280x720
- Thực hiện inference YOLO
- Đo thời gian inference

##### 4. Format kết quả
Tạo JSON result với cấu trúc:
```json
{
  "camera_id": str,
  "frame_id": int,
  "timestamp": str,
  "frame_shape": {
    "height": int,
    "width": int,
    "channels": int
  },
  "detections": [...],
  "detection_count": int
}
```

##### 5. Lưu kết quả
- In kết quả JSON ra console
- Lưu vào `result_dict` với format tương thích:
  ```python
  {
    'frame': None,
    'ts': float,
    'status': str,
    'inference_time': float,
    'detections': int,
    'objects': list
  }
  ```

#### Xử lý lỗi

##### 1. Camera không có tín hiệu
- Kiểm tra `frame_age > 2.0` hoặc `status != 'ok'`
- Cập nhật status thành 'no_signal'

##### 2. Lỗi inference
- Bắt exception trong quá trình inference
- Cập nhật status thành 'inference_error'
- Đặt detections = 0, objects = []

##### 3. Lỗi xử lý camera
- Bắt exception trong quá trình xử lý frame
- Cập nhật status thành 'error'
- Log lỗi với tên camera cụ thể

#### Performance
- Sleep 0.05 giây giữa các vòng lặp (~20 FPS)
- Xử lý frame tuần tự để tránh quá tải GPU
- Chỉ xử lý frame mới (age < 2s)

#### Thread Safety
- Sử dụng multiprocessing.Manager().dict() để chia sẻ dữ liệu
- Mỗi camera được xử lý độc lập
- Kết quả được ghi vào result_dict một cách an toàn

## Dependencies
- `cv2`: OpenCV cho xử lý ảnh
- `numpy`: Xử lý array
- `ultralytics`: YOLO model
- `json`: Serialization
- `datetime`: Timestamp
- `time`: Timing và sleep

## Sử dụng
```python
from ai_inference import ai_inference_worker, YOLOInference

# Sử dụng class trực tiếp
yolo = YOLOInference("path/to/model.pt")
results = yolo.detect(frame)
detection_info = yolo.get_detection_info(results, frame.shape)

# Sử dụng worker process
ai_inference_worker(shared_dict, result_dict, cam_names=["cam1", "cam2"])
```

## Lưu ý
- Model path phải tồn tại và hợp lệ
- Frame input phải là OpenCV format (BGR)
- Kết quả JSON được in ra console để debug
- Worker chạy vô hạn cho đến khi bị interrupt
