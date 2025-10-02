# Tài liệu Camera Process Module

## Tổng quan
Module `camera_process.py` cung cấp worker function để quản lý nhiều camera trong một process riêng biệt, sử dụng multiprocessing để tối ưu hiệu suất.

## Cấu trúc Module

### Function camera_process_worker

#### Mô tả
Worker function chính để quản lý một nhóm camera trong một process riêng biệt, tạo và quản lý các camera thread.

#### Signature
```python
def camera_process_worker(process_id, camera_list, shared_dict, max_retry_attempts=5)
```

#### Tham số
- `process_id` (int): ID định danh của process
- `camera_list` (list): Danh sách camera dạng [(name, url), ...]
- `shared_dict` (multiprocessing.Manager().dict()): Dictionary chia sẻ giữa các process
- `max_retry_attempts` (int): Số lần thử kết nối lại tối đa cho mỗi camera (mặc định: 5)

#### Chi tiết tham số

##### process_id
- **Kiểu:** int
- **Mô tả:** ID duy nhất để định danh process
- **Sử dụng:** Logging và debug
- **Ví dụ:** 0, 1, 2, ...

##### camera_list
- **Kiểu:** list of tuples
- **Mô tả:** Danh sách camera được giao cho process này xử lý
- **Format:** `[(cam_name, cam_url), (cam_name2, cam_url2), ...]`
- **Ví dụ:** 
  ```python
  [
      ("camera_1", "rtsp://192.168.1.100:554/stream"),
      ("camera_2", "rtsp://192.168.1.101:554/stream"),
      ("camera_3", 0)  # Webcam index
  ]
  ```

##### shared_dict
- **Kiểu:** multiprocessing.Manager().dict()
- **Mô tả:** Dictionary chia sẻ giữa các process để truyền dữ liệu
- **Cấu trúc dữ liệu:**
  ```python
  {
      "camera_name": {
          "frame": bytes,  # JPEG encoded frame
          "ts": float,     # Timestamp
          "status": str    # 'ok', 'retrying', 'connection_failed', 'no_signal'
      }
  }
  ```

##### max_retry_attempts
- **Kiểu:** int
- **Mặc định:** 5
- **Mô tả:** Số lần thử kết nối lại tối đa cho mỗi camera
- **Sử dụng:** Truyền xuống CameraThread

## Chức năng chính

### 1. Khởi tạo Process
```python
print(f"Process {process_id}: Bắt đầu với {len(camera_list)} camera")
```
- In thông báo khởi tạo với số lượng camera
- Tạo local_dict để quản lý dữ liệu local

### 2. Tạo và Quản lý Camera Threads
```python
# Tạo và khởi động các camera thread
threads = []
for cam_name, cam_url in camera_list:
    thread = CameraThread(cam_name, cam_url, local_dict, max_retry_attempts)
    threads.append(thread)
    thread.start()
    print(f"Process {process_id}: Khởi động thread {cam_name}")
```

**Chi tiết:**
- Duyệt qua từng camera trong camera_list
- Tạo CameraThread cho mỗi camera
- Khởi động thread ngay lập tức
- Lưu reference thread vào danh sách
- Log thông báo khởi động thread

### 3. Vòng lặp Cập nhật Dữ liệu
```python
# Vòng lặp cập nhật từ local_dict lên shared_dict
try:
    while True:
        # Copy dữ liệu từ local_dict lên shared_dict
        for cam_name, data in local_dict.items():
            shared_dict[cam_name] = data
        
        time.sleep(0.1)  # Update mỗi 100ms
```

**Chi tiết:**
- Chạy vô hạn cho đến khi bị interrupt
- Copy tất cả dữ liệu từ local_dict lên shared_dict
- Cập nhật mỗi 100ms (10 FPS update rate)
- Sử dụng try-except để xử lý KeyboardInterrupt

### 4. Xử lý Dừng Process
```python
except KeyboardInterrupt:
    print(f"Process {process_id}: Đang dừng...")
    
    # Dừng tất cả thread
    for thread in threads:
        thread.stop()
    
    # Đợi thread kết thúc
    for thread in threads:
        thread.join(timeout=1.0)
```

**Chi tiết:**
- Bắt KeyboardInterrupt để dừng graceful
- Gọi stop() cho tất cả camera thread
- Đợi thread kết thúc với timeout 1 giây
- Log thông báo dừng process

## Luồng Dữ liệu

### 1. Camera → Local Dict
```
CameraThread → local_dict[cam_name] = {
    'frame': jpeg_bytes,
    'ts': timestamp,
    'status': 'ok'
}
```

### 2. Local Dict → Shared Dict
```
local_dict → shared_dict (mỗi 100ms)
```

### 3. Shared Dict → AI Inference
```
shared_dict → ai_inference_worker → result_dict
```

## Cấu trúc Dữ liệu

### Local Dict (trong process)
```python
local_dict = {
    "camera_1": {
        "frame": b'\xff\xd8\xff\xe0...',  # JPEG bytes
        "ts": 1640995200.123,
        "status": "ok"
    },
    "camera_2": {
        "frame": None,
        "ts": 1640995200.456,
        "status": "retrying",
        "retry_count": 2,
        "next_retry_in": 4
    }
}
```

### Shared Dict (giữa processes)
```python
shared_dict = {
    "camera_1": {
        "frame": b'\xff\xd8\xff\xe0...',
        "ts": 1640995200.123,
        "status": "ok"
    },
    "camera_2": {
        "frame": None,
        "ts": 1640995200.456,
        "status": "retrying"
    }
}
```

## Trạng thái Camera

### 1. 'ok'
- Camera hoạt động bình thường
- Có frame data hợp lệ
- Được cập nhật liên tục

### 2. 'retrying'
- Camera đang thử kết nối lại
- Không có frame data
- Có thông tin retry_count và next_retry_in

### 3. 'connection_failed'
- Camera đã thử hết số lần retry
- Không thể kết nối
- Cần can thiệp thủ công

### 4. 'no_signal'
- Camera mất tín hiệu tạm thời
- Có thể tự phục hồi

## Performance

### Update Rate
- **Local → Shared:** 10 FPS (mỗi 100ms)
- **Camera → Local:** Tùy thuộc vào camera thread
- **Tối ưu:** Giảm overhead của multiprocessing

### Memory Usage
- **Local dict:** Chỉ lưu dữ liệu của camera trong process
- **Shared dict:** Chia sẻ giữa các process
- **Frame data:** JPEG encoded để tiết kiệm băng thông

## Sử dụng

### Khởi tạo Process
```python
from multiprocessing import Process, Manager
from camera_process import camera_process_worker

# Tạo shared dict
manager = Manager()
shared_dict = manager.dict()

# Tạo camera list
camera_list = [
    ("cam1", "rtsp://192.168.1.100:554/stream"),
    ("cam2", "rtsp://192.168.1.101:554/stream")
]

# Tạo và khởi động process
process = Process(
    target=camera_process_worker,
    args=(0, camera_list, shared_dict, 5)
)
process.start()
```

### Kiểm tra Trạng thái
```python
# Kiểm tra dữ liệu camera
for cam_name in shared_dict:
    data = shared_dict[cam_name]
    print(f"Camera {cam_name}: {data['status']}")
```

### Dừng Process
```python
# Dừng process
process.terminate()
process.join()
```

## Dependencies
- `time`: Sleep và timing
- `camera_thread`: CameraThread class

## Lưu ý
- Process chạy độc lập và có thể bị terminate
- Sử dụng multiprocessing.Manager() để chia sẻ dữ liệu
- Camera threads được quản lý trong process
- Cần xử lý KeyboardInterrupt để dừng graceful
- Timeout khi join thread để tránh deadlock
