# Hướng dẫn sử dụng tính năng lưu tọa độ ROI

## Tổng quan

Tính năng mới cho phép lưu tọa độ ROI vào file `slot_pairing_config.json` khi sử dụng `roi_tool.py`.

## Cách sử dụng

### 1. Vẽ ROI và lưu tọa độ

```bash
# Vẽ ROI cho camera cam-1 và lưu tọa độ vào config
python roi_tool.py --camera-id cam-1 --video video/hanam.mp4 --save-coords

# Vẽ ROI cho camera cam-2 và lưu tọa độ vào config
python roi_tool.py --vinhphuc --save-coords

# Sử dụng file config tùy chỉnh
python roi_tool.py --camera-id cam-1 --config-path my_config.json --save-coords
```

### 2. Chỉ vẽ ROI (không lưu tọa độ)

```bash
# Vẽ ROI như bình thường
python roi_tool.py --camera-id cam-1 --video video/hanam.mp4
```

## Cấu trúc dữ liệu trong config

Khi sử dụng `--save-coords`, file `slot_pairing_config.json` sẽ có thêm section `roi_coordinates`:

```json
{
  "starts": [...],
  "ends": [...],
  "pairs": [...],
  "roi_coordinates": [
    {
      "slot_number": 1,
      "camera_id": "cam-1",
      "top_left": [100, 100],
      "bottom_right": [200, 200],
      "full_polygon": [[100, 100], [200, 100], [200, 200], [100, 200]]
    },
    {
      "slot_number": 2,
      "camera_id": "cam-1",
      "top_left": [300, 150],
      "bottom_right": [400, 250],
      "full_polygon": [[300, 150], [400, 150], [400, 250], [300, 250]]
    }
  ]
}
```

## Các trường dữ liệu

- `slot_number`: Số thứ tự của ROI (bắt đầu từ 1)
- `camera_id`: ID của camera
- `top_left`: Tọa độ góc trên trái [x, y]
- `bottom_right`: Tọa độ góc dưới phải [x, y]
- `full_polygon`: Toàn bộ polygon ROI (4 điểm theo thứ tự clockwise)

## Lưu ý

1. **Ghi đè dữ liệu**: Khi vẽ ROI mới cho cùng một camera, tọa độ cũ sẽ bị ghi đè
2. **Tự động tạo file**: Nếu file config không tồn tại, sẽ được tạo mới
3. **Tương thích ngược**: Các section `starts`, `ends`, `pairs` hiện có sẽ được giữ nguyên
4. **Định dạng tọa độ**: Tọa độ được lưu dưới dạng [x, y] (tuple trong Python)

## Ví dụ sử dụng trong code

```python
import json
from roi_tool import load_config

# Đọc config
config = load_config("logic/slot_pairing_config.json")

# Lấy tọa độ ROI cho camera cụ thể
roi_coords = [
    coord for coord in config.get("roi_coordinates", [])
    if coord["camera_id"] == "cam-1"
]

# Sử dụng tọa độ
for coord in roi_coords:
    print(f"Slot {coord['slot_number']}: {coord['top_left']} -> {coord['bottom_right']}")
```

## Test tính năng

Chạy script test để kiểm tra tính năng:

```bash
python test_roi_coords.py
```
