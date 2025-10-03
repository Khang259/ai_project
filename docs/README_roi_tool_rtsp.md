# ROI Tool với RTSP Camera Support - Hướng dẫn sử dụng

## Tổng quan

`roi_tool.py` đã được cập nhật để hỗ trợ vẽ ROI trên video RTSP từ 35 camera thay vì chỉ sử dụng file video MP4. Tool này cho phép bạn vẽ các vùng ROI (Region of Interest) trên video stream từ camera và lưu tọa độ vào config.

## Cấu hình Camera

### File cam_config.json

File `logic/cam_config.json` chứa danh sách 35 camera với RTSP URLs:

```json
{
  "cam_urls": [
    ["cam-1", "rtsp://192.168.1.252:8554/live/cam1"],
    ["cam-2", "rtsp://192.168.1.252:8554/live/cam2"],
    ["cam-3", "rtsp://192.168.1.252:8554/live/cam3"],
    ...
    ["cam-35", "rtsp://192.168.1.252:8554/live/cam35"]
  ]
}
```

## Cách sử dụng

### 1. Xem danh sách camera có sẵn

```bash
python roi_tool.py --list-cameras
```

**Output:**
```
Danh sách camera có sẵn:
  cam-1: rtsp://192.168.1.252:8554/live/cam1
  cam-2: rtsp://192.168.1.252:8554/live/cam2
  cam-3: rtsp://192.168.1.252:8554/live/cam3
  ...
  cam-35: rtsp://192.168.1.252:8554/live/cam35
```

### 2. Vẽ ROI cho camera RTSP

```bash
# Vẽ ROI cho camera-1 và lưu tọa độ vào config
python roi_tool.py --camera-id cam-1 --save-coords

# Vẽ ROI cho camera-2 và lưu tọa độ vào config  
python roi_tool.py --camera-id cam-2 --save-coords

# Vẽ ROI cho camera-35 và lưu tọa độ vào config
python roi_tool.py --camera-id cam-35 --save-coords
```

### 3. Legacy mode (video file)

```bash
# Sử dụng file video MP4
python roi_tool.py --video video/hanam.mp4 --save-coords

# Sử dụng video Vinh Phuc (cam-2)
python roi_tool.py --vinhphuc --save-coords
```

## Các tham số

### Arguments chính (chọn một)

| Argument | Mô tả | Ví dụ |
|----------|-------|-------|
| `--camera-id` | ID camera từ RTSP config | `--camera-id cam-1` |
| `--video` | Đường dẫn file video MP4 | `--video video/hanam.mp4` |
| `--vinhphuc` | Sử dụng video Vinh Phuc | `--vinhphuc` |
| `--list-cameras` | Hiển thị danh sách camera | `--list-cameras` |

### Arguments tùy chọn

| Argument | Mặc định | Mô tả |
|----------|----------|-------|
| `--cam-config-path` | `logic/cam_config.json` | Đường dẫn file config camera |
| `--config-path` | `logic/slot_pairing_config.json` | Đường dẫn file config slot pairing |
| `--save-coords` | `False` | Lưu tọa độ ROI vào file config |

## Giao diện vẽ ROI

Khi chạy tool, cửa sổ video sẽ hiển thị với các điều khiển:

### Điều khiển chuột
- **Kéo-thả chuột trái**: Vẽ hình chữ nhật ROI
- **Preview**: Hình chữ nhật đang vẽ sẽ hiển thị màu cam

### Điều khiển bàn phím
- **z**: Undo ROI cuối cùng
- **r**: Reset tất cả ROI
- **s**: Lưu và thoát
- **ESC**: Thoát không lưu

### Hiển thị
- **ROI đã hoàn thành**: Màu xanh lá
- **ROI đang vẽ**: Màu cam
- **Vertices**: Các điểm góc của polygon

## Output

### 1. Queue roi_config

Tool sẽ publish ROI config vào queue `roi_config`:

```json
{
  "camera_id": "cam-1",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "slots": [
    {
      "slot_id": "slot-1",
      "points": [[100, 200], [300, 200], [300, 400], [100, 400]]
    }
  ],
  "image_wh": [1920, 1080]
}
```

### 2. File config (nếu có --save-coords)

Tọa độ ROI sẽ được lưu vào `logic/slot_pairing_config.json`:

```json
{
  "roi_coordinates": [
    {
      "slot_number": 1,
      "camera_id": "cam-1",
      "points": [[100, 200], [300, 200], [300, 400], [100, 400]]
    }
  ]
}
```

## Ví dụ sử dụng

### Ví dụ 1: Vẽ ROI cho camera-1

```bash
python roi_tool.py --camera-id cam-1 --save-coords
```

**Quá trình:**
1. Tool load RTSP URL cho cam-1: `rtsp://192.168.1.252:8554/live/cam1`
2. Capture frame từ RTSP stream
3. Hiển thị cửa sổ vẽ ROI
4. User vẽ các ROI bằng chuột
5. Nhấn 's' để lưu
6. Publish vào queue roi_config
7. Lưu tọa độ vào slot_pairing_config.json

### Ví dụ 2: Kiểm tra camera có sẵn

```bash
python roi_tool.py --list-cameras
```

**Output:**
```
Danh sách camera có sẵn:
  cam-1: rtsp://192.168.1.252:8554/live/cam1
  cam-2: rtsp://192.168.1.252:8554/live/cam2
  ...
```

### Ví dụ 3: Sử dụng camera không tồn tại

```bash
python roi_tool.py --camera-id cam-999
```

**Output:**
```
Lỗi khi load camera config: Camera cam-999 không tồn tại trong config. 
Các camera có sẵn: ['cam-1', 'cam-2', ..., 'cam-35']
```

## Troubleshooting

### 1. Không kết nối được RTSP

**Lỗi:** `Không mở được video source: rtsp://192.168.1.252:8554/live/cam1`

**Giải pháp:**
- Kiểm tra network connection
- Kiểm tra RTSP server có hoạt động không
- Kiểm tra URL có đúng không

### 2. Camera ID không tồn tại

**Lỗi:** `Camera cam-999 không tồn tại trong config`

**Giải pháp:**
- Chạy `python roi_tool.py --list-cameras` để xem danh sách
- Sử dụng camera ID có trong danh sách

### 3. File config không tồn tại

**Lỗi:** `Không tìm thấy file cam config: logic/cam_config.json`

**Giải pháp:**
- Kiểm tra file `logic/cam_config.json` có tồn tại không
- Sử dụng `--cam-config-path` để chỉ định đường dẫn khác

### 4. Không có quyền ghi file

**Lỗi:** Permission denied khi lưu config

**Giải pháp:**
- Kiểm tra quyền ghi file trong thư mục `logic/`
- Chạy với quyền administrator nếu cần

## Tích hợp với hệ thống

### 1. ROI Processor

ROI config từ tool sẽ được `roi_processor.py` sử dụng để:
- Load ROI coordinates cho mỗi camera
- Filter detections theo ROI
- Hiển thị ROI trên video

### 2. Stable Pair Processor

Tọa độ ROI trong `slot_pairing_config.json` sẽ được `stable_pair_processor.py` sử dụng để:
- Xác định vị trí các slot
- Phát hiện stable pairs
- Monitor trạng thái shelf/empty

### 3. Workflow hoàn chỉnh

```
1. roi_tool.py → Vẽ ROI cho camera
2. roi_processor.py → Sử dụng ROI để filter detections  
3. stable_pair_processor.py → Phát hiện stable pairs
4. postAPI.py → Gửi API khi có stable pair
```

## Performance và Scalability

### 1. RTSP Connection

- Tool chỉ capture 1 frame để vẽ ROI
- Không maintain persistent connection
- Phù hợp cho việc setup ROI ban đầu

### 2. Memory Usage

- Chỉ load 1 frame vào memory
- ROI coordinates được lưu dạng polygon points
- Efficient cho việc lưu trữ và xử lý

### 3. Network

- RTSP stream có thể có latency
- Cần network ổn định để capture frame
- Có thể timeout nếu network chậm
