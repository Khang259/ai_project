# YOLO Object Detection Tool

Tool nhận diện vật thể sử dụng YOLO11s model với khả năng hiển thị video real-time và lưu dữ liệu vào queue.

## Tính năng

- Nhận diện vật thể sử dụng YOLO11s model
- Hiển thị kết quả detection trên video real-time với bounding box và label
- Lưu dữ liệu detection vào raw_queue với key camera_id
- Hỗ trợ nhiều nguồn video: webcam, file video, RTSP stream
- Có thể điều chỉnh ngưỡng tin cậy cho detection
- Lưu ảnh detection khi cần thiết

## Cài đặt

1. Cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

2. Đảm bảo có file model `yolo11s_candy_model.pt` trong thư mục dự án

## Sử dụng

### Chạy với webcam (mặc định):
```bash
python yolo_detector.py --camera-id cam-1
```

### Chạy với file video:
```bash
python yolo_detector.py --camera-id cam-1 --video-source "path/to/video.mp4"
```

### Chạy với RTSP stream:
```bash
python yolo_detector.py --camera-id cam-1 --video-source "rtsp://192.168.1.162:8080/h264_ulaw.sdp"
```

### Chạy với model khác:
```bash
python yolo_detector.py --model "path/to/your_model.pt" --camera-id cam-1
```

### Điều chỉnh ngưỡng tin cậy:
```bash
python yolo_detector.py --camera-id cam-1 --confidence 0.7
```

## Tham số

- `--model`: Đường dẫn đến file model YOLO (mặc định: yolo11s_candy_model.pt)
- `--camera-id`: ID của camera (mặc định: cam-1)
- `--video-source`: Nguồn video (0=webcam, đường dẫn file, hoặc RTSP URL)
- `--confidence`: Ngưỡng tin cậy cho detection từ 0.0 đến 1.0 (mặc định: 0.5)

## Điều khiển

- `q`: Thoát chương trình
- `s`: Lưu ảnh detection hiện tại

## Dữ liệu lưu vào Queue

Dữ liệu detection được lưu vào topic `raw_detection` với key là `camera_id`. Format dữ liệu:

```json
{
    "camera_id": "cam-1",
    "frame_id": 150,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "frame_shape": {
        "height": 480,
        "width": 640,
        "channels": 3
    },
    "detections": [
        {
            "class_id": 0,
            "class_name": "candy",
            "confidence": 0.85,
            "bbox": {
                "x1": 100.0,
                "y1": 150.0,
                "x2": 200.0,
                "y2": 250.0
            },
            "center": {
                "x": 150.0,
                "y": 200.0
            }
        }
    ],
    "detection_count": 1
}
```

## Lưu ý

- Dữ liệu được lưu vào queue mỗi 5 frame để tránh quá tải
- Đảm bảo có đủ quyền truy cập camera hoặc file video
- Model YOLO cần được tải thành công trước khi bắt đầu detection
