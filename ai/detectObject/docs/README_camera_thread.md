# Tài liệu Camera Thread Module

## Tổng quan
Module `camera_thread.py` cung cấp class `CameraThread` để quản lý kết nối và đọc dữ liệu từ một camera cụ thể trong một thread riêng biệt.

## Cấu trúc Module

### Class CameraThread

#### Mô tả
Thread chuyên dụng để xử lý một camera, bao gồm kết nối, đọc frame, xử lý lỗi và retry logic.

#### Constructor
```python
def __init__(self, cam_name, cam_url, local_dict, max_retry_attempts=5)
```

**Tham số:**
- `cam_name` (str): Tên định danh của camera
- `cam_url` (str): URL hoặc ID camera (có thể là IP, file path, hoặc device index)
- `local_dict` (dict): Dictionary local để lưu dữ liệu frame
- `max_retry_attempts` (int): Số lần thử kết nối lại tối đa (mặc định: 5)

**Thuộc tính khởi tạo:**
- `self.cam_name`: Tên camera
- `self.cam_url`: URL camera
- `self.local_dict`: Dictionary local
- `self.running`: Trạng thái thread (boolean)
- `self.max_retry_attempts`: Số lần retry tối đa
- `self.retry_count`: Số lần đã retry
- `self.last_successful_connection`: Timestamp kết nối thành công cuối

#### Methods

##### _try_connect_camera(timeout=5.0)
```python
def _try_connect_camera(self, timeout=5.0)
```

**Mô tả:** Thử kết nối camera với timeout và retry logic

**Tham số:**
- `timeout` (float): Thời gian timeout kết nối (giây, mặc định: 5.0)

**Trả về:**
- `cv2.VideoCapture`: Đối tượng camera nếu kết nối thành công
- `None`: Nếu kết nối thất bại

**Chi tiết:**
- In thông báo trạng thái kết nối với số lần thử
- Tạo VideoCapture object
- Vòng lặp kiểm tra kết nối trong thời gian timeout
- Reset retry_count khi kết nối thành công
- Cập nhật last_successful_connection timestamp

**Log messages:**
- `"Đang kết nối camera {cam_name}... (lần thử {retry_count}/{max_attempts})"`
- `"✅ Camera {cam_name} đã kết nối thành công"`
- `"❌ Không thể kết nối camera {cam_name} (timeout {timeout}s)"`

##### _handle_connection_failure()
```python
def _handle_connection_failure(self)
```

**Mô tả:** Xử lý khi kết nối camera thất bại với exponential backoff

**Trả về:**
- `bool`: True nếu còn có thể retry, False nếu đã hết số lần thử

**Chi tiết:**
- Tăng retry_count
- Kiểm tra nếu đã vượt quá max_retry_attempts
- Tính toán thời gian chờ với exponential backoff: `min(2^retry_count, 30)`
- Cập nhật local_dict với trạng thái retry
- Sleep trong thời gian chờ

**Trạng thái local_dict khi retry:**
```python
{
    'frame': None,
    'ts': time.time(),
    'status': 'retrying',
    'retry_count': self.retry_count,
    'next_retry_in': wait_time
}
```

**Trạng thái local_dict khi hết retry:**
```python
{
    'frame': None,
    'ts': time.time(),
    'status': 'connection_failed',
    'retry_count': self.retry_count,
    'last_attempt': time.time()
}
```

**Log messages:**
- `"💀 Camera {cam_name} đã thử kết nối {max_attempts} lần nhưng thất bại. Dừng thử lại."`
- `"⏳ Camera {cam_name} sẽ thử kết nối lại sau {wait_time} giây..."`

##### run()
```python
def run(self)
```

**Mô tả:** Vòng lặp chính của thread để đọc frame liên tục

**Chi tiết:**
1. **Khởi tạo:**
   - Set running = True
   - Thử kết nối camera ban đầu
   - Nếu thất bại, thực hiện retry logic

2. **Vòng lặp chính:**
   - Đọc frame từ camera
   - Xử lý khi camera mất tín hiệu
   - Resize frame về 640x360
   - Encode frame thành JPEG (quality=85)
   - Lưu vào local_dict

3. **Xử lý lỗi:**
   - Bắt exception và log lỗi
   - Thử kết nối lại camera
   - Thực hiện retry logic nếu cần

**Trạng thái local_dict khi thành công:**
```python
{
    'frame': jpeg_bytes,
    'ts': time.time(),
    'status': 'ok'
}
```

**Xử lý mất tín hiệu:**
- Phát hiện khi `cap.read()` trả về False
- Release camera hiện tại
- Thử kết nối lại
- Nếu thành công: tiếp tục vòng lặp
- Nếu thất bại: thực hiện retry logic

**Xử lý exception:**
- Log lỗi với tên camera
- Release camera
- Thử kết nối lại
- Thực hiện retry logic nếu cần

**Log messages:**
- `"⚠️ Camera {cam_name} mất tín hiệu, thử kết nối lại..."`
- `"🔄 Camera {cam_name} đã kết nối lại thành công"`
- `"❌ Lỗi camera {cam_name}: {error}"`
- `"🔄 Camera {cam_name} đã kết nối lại sau lỗi"`

##### stop()
```python
def stop(self)
```

**Mô tả:** Dừng thread một cách an toàn

**Chi tiết:**
- Set running = False
- Thread sẽ thoát khỏi vòng lặp chính
- Camera được release trong finally block

## Tính năng chính

### 1. Kết nối camera tự động
- Tự động thử kết nối camera khi khởi động
- Hỗ trợ timeout để tránh treo
- Retry logic với exponential backoff

### 2. Xử lý lỗi robust
- Phát hiện camera mất tín hiệu
- Tự động thử kết nối lại
- Giới hạn số lần retry để tránh vòng lặp vô hạn

### 3. Tối ưu hiệu suất
- Resize frame về 640x360 để giảm băng thông
- Encode JPEG với quality=85 để cân bằng chất lượng/kích thước
- Lưu frame dưới dạng bytes để tiết kiệm memory

### 4. Thread safety
- Sử dụng daemon thread
- Cập nhật local_dict một cách an toàn
- Có thể dừng thread từ bên ngoài

## Cấu hình

### Tham số có thể điều chỉnh
- `max_retry_attempts`: Số lần retry tối đa (mặc định: 5)
- `timeout`: Thời gian timeout kết nối (mặc định: 5.0s)
- `frame_size`: Kích thước frame resize (cố định: 640x360)
- `jpeg_quality`: Chất lượng JPEG (cố định: 85)

### Exponential backoff
- Công thức: `min(2^retry_count, 30)` giây
- Ví dụ: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
- Tối đa 30 giây giữa các lần thử

## Sử dụng

### Khởi tạo thread
```python
from camera_thread import CameraThread

# Tạo thread cho camera
thread = CameraThread(
    cam_name="camera_1",
    cam_url="rtsp://192.168.1.100:554/stream",
    local_dict=local_dict,
    max_retry_attempts=5
)

# Khởi động thread
thread.start()
```

### Dừng thread
```python
# Dừng thread
thread.stop()

# Đợi thread kết thúc
thread.join(timeout=1.0)
```

### Kiểm tra trạng thái
```python
# Kiểm tra trong local_dict
camera_data = local_dict.get("camera_1", {})
status = camera_data.get("status")  # 'ok', 'retrying', 'connection_failed'
```

## Dependencies
- `cv2`: OpenCV cho xử lý camera
- `time`: Timing và sleep
- `threading`: Thread management
- `numpy`: Xử lý array

## Lưu ý
- Thread chạy daemon nên sẽ tự động dừng khi main process kết thúc
- Camera URL có thể là IP, file path, hoặc device index (0, 1, 2...)
- Frame được resize và encode để tối ưu băng thông
- Retry logic ngăn chặn việc thử kết nối vô hạn
- Thread an toàn cho việc sử dụng trong multiprocessing
