# ROI Tool - Multi Camera Support

## Tổng quan

`roi_tool.py` đã được cập nhật để hỗ trợ vẽ ROI cho cả 2 camera với video sources khác nhau.

## Cách sử dụng

### 1. Vẽ ROI cho Camera 1 (hanam.mp4)

```bash
python roi_tool.py
```

Hoặc:

```bash
python roi_tool.py --camera-id cam-1 --video video/hanam.mp4
```

### 2. Vẽ ROI cho Camera 2 (vinhPhuc.mp4)

```bash
python roi_tool.py --vinhphuc
```

Hoặc:

```bash
python roi_tool.py --camera-id cam-2 --video video/vinhPhuc.mp4
```

## Các tham số

| Tham số | Mô tả | Mặc định |
|---------|-------|----------|
| `--camera-id` | ID của camera | `cam-1` |
| `--video` | Đường dẫn file video | `video/hanam.mp4` |
| `--vinhphuc` | Sử dụng video/vinhPhuc.mp4 cho cam-2 | `False` |

## Mapping Video Sources

| Camera ID | Video Source | Mô tả |
|-----------|--------------|-------|
| `cam-1` | `video/hanam.mp4` | Video Hanam |
| `cam-2` | `video/vinhPhuc.mp4` | Video Vinh Phuc |

## Cách vẽ ROI

1. **Kéo thả chuột trái**: Vẽ hình chữ nhật ROI
2. **Phím `z`**: Undo ROI cuối cùng
3. **Phím `r`**: Reset tất cả ROI
4. **Phím `s`**: Lưu cấu hình ROI
5. **Phím `ESC`**: Thoát không lưu

## Kết quả

### Cấu trúc dữ liệu lưu vào queue

```json
{
  "camera_id": "cam-1" hoặc "cam-2",
  "timestamp": "2025-01-01T12:00:00Z",
  "slots": [
    {
      "slot_id": "slot-1",
      "points": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    },
    {
      "slot_id": "slot-2", 
      "points": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    }
  ],
  "image_wh": [width, height]
}
```

### Queue Storage

- **Topic**: `roi_config`
- **Key**: `cam-1` hoặc `cam-2`
- **Database**: `queues.db`

## Workflow hoàn chỉnh

### Bước 1: Vẽ ROI cho Camera 1

```bash
python roi_tool.py
```

### Bước 2: Vẽ ROI cho Camera 2

```bash
python roi_tool.py --vinhphuc
```

### Bước 3: Chạy Multi Camera Detection

```bash
python yolo_detector.py
```

### Bước 4: Chạy ROI Processor

```bash
python roi_processor.py
```

## Kiểm tra kết quả

### Xem ROI config đã lưu

```bash
python view_roi_results.py --camera-id cam-1
python view_roi_results.py --camera-id cam-2
```

### Xem detection results

```bash
python view_roi_results.py --all --limit 0
```

## Troubleshooting

### 1. Video file không tồn tại

```
RuntimeError: Không mở được video source: video/vinhPhuc.mp4
```

**Giải pháp**: Đảm bảo file video tồn tại trong thư mục `video/`

### 2. Không thể vẽ ROI

**Giải pháp**: 
- Đảm bảo cửa sổ ROI tool đang active
- Sử dụng chuột trái để kéo thả
- Kiểm tra kích thước video phù hợp

### 3. ROI không được lưu

**Giải pháp**:
- Nhấn phím `s` để lưu trước khi thoát
- Kiểm tra database `queues.db` có tồn tại
- Xem log output để confirm

## Tips

1. **Vẽ ROI chính xác**: Kéo từ góc trên trái xuống góc dưới phải
2. **Undo nhanh**: Sử dụng phím `z` để undo ROI sai
3. **Reset toàn bộ**: Sử dụng phím `r` để bắt đầu lại
4. **Lưu thường xuyên**: Nhấn `s` để lưu và kiểm tra kết quả

## Log Output

```
🎬 Sử dụng video/vinhPhuc.mp4 cho camera cam-2
✅ Đã lưu roi_config của cam-2 với 3 ROI vào queue.
📁 Video source: video/vinhPhuc.mp4
🆔 Camera ID: cam-2
```
