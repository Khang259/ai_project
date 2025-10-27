# ROI Tool - Công Cụ Vẽ Và Cấu Hình ROI

## Tổng Quan

`roi_tool.py` là công cụ **interactive GUI** để:
- **Vẽ ROI (Region of Interest)** trên video/RTSP stream
- **Quản lý ROI configuration** cho từng camera
- **Lưu ROI vào queue** để sử dụng trong hệ thống
- **Export ROI coordinates** vào file JSON để tích hợp với slot pairing

## Tính Năng Chính

### 1. Interactive Drawing
- Kéo chuột để vẽ hình chữ nhật
- Preview real-time khi đang vẽ
- Vẽ nhiều ROI trên cùng một camera

### 2. Undo/Reset
- `z`: Undo ROI cuối cùng
- `r`: Reset tất cả ROI

### 3. Multi-source Support
- RTSP camera stream
- Video file (MP4, AVI, ...)
- Shortcut cho video có sẵn

### 4. Dual Save
- Lưu vào **queue database** (queues.db)
- Export vào **JSON config** (slot_pairing_config.json)

## Kiến Trúc

```
┌──────────────────────────────────────────────────────────┐
│                      ROI Tool                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Video Source Selection                    │ │
│  │  - RTSP camera (from cam_config.json)             │ │
│  │  - Video file                                      │ │
│  │  - Built-in shortcuts (--vinhphuc)                │ │
│  └───────────────────┬────────────────────────────────┘ │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Capture Frame                             │ │
│  │  - Read one frame from video source                │ │
│  │  - Display in CV2 window                           │ │
│  └───────────────────┬────────────────────────────────┘ │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │          RoiDrawer (Interactive GUI)               │ │
│  │                                                     │ │
│  │  Mouse Events:                                     │ │
│  │    - LBUTTONDOWN: Start drag                       │ │
│  │    - MOUSEMOVE: Update preview                     │ │
│  │    - LBUTTONUP: Finish ROI                         │ │
│  │                                                     │ │
│  │  Keyboard Events:                                  │ │
│  │    - z: Undo last ROI                              │ │
│  │    - r: Reset all ROIs                             │ │
│  │    - s: Save and exit                              │ │
│  │    - ESC: Exit without save                        │ │
│  └───────────────────┬────────────────────────────────┘ │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Save ROI Configuration                    │ │
│  │                                                     │ │
│  │  1. Normalize polygons (4 points clockwise)        │ │
│  │  2. Create payload with timestamp                  │ │
│  │  3. Publish to queue (topic: roi_config)           │ │
│  │  4. [Optional] Export to JSON file                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Thành Phần Chi Tiết

### 1. RoiDrawer Class

Class chính để vẽ ROI với interactive GUI.

#### 1.1 Khởi Tạo

```python
drawer = RoiDrawer(
    image=frame,                    # Frame để vẽ ROI
    window_name="ROI Tool - cam-1"  # Tên cửa sổ
)
```

**State Variables:**
```python
self.image: np.ndarray              # Current image (với ROI đã vẽ)
self.clone: np.ndarray              # Original image (backup)
self.rect_polygons: List[List[Point]]  # List các ROI đã vẽ
self.drag_start: Point | None       # Điểm bắt đầu kéo
self.drag_current: Point | None     # Điểm hiện tại khi kéo
```

#### 1.2 Mouse Callback

**Event Flow:**

```
LBUTTONDOWN (Click chuột trái)
    │
    ├─> Save drag_start = (x, y)
    ├─> Set drag_current = (x, y)
    └─> Redraw frame
    
MOUSEMOVE (Di chuyển chuột)
    │
    ├─> If drag_start is not None:
    │   ├─> Update drag_current = (x, y)
    │   └─> Redraw frame with preview rectangle
    └─> Else: Do nothing
    
LBUTTONUP (Thả chuột trái)
    │
    ├─> Get final position (x2, y2)
    ├─> Convert rectangle to polygon (4 points)
    ├─> Add polygon to rect_polygons
    ├─> Reset drag_start and drag_current
    └─> Redraw frame
```

**Code:**
```python
def _mouse_cb(self, event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        self.drag_start = (x, y)
        self.drag_current = (x, y)
        self._redraw()
        
    elif event == cv2.EVENT_MOUSEMOVE and self.drag_start is not None:
        self.drag_current = (x, y)
        self._redraw()
        
    elif event == cv2.EVENT_LBUTTONUP and self.drag_start is not None:
        x1, y1 = self.drag_start
        x2, y2 = x, y
        poly = self._rect_to_polygon(x1, y1, x2, y2)
        if poly is not None:
            self.rect_polygons.append(poly)
        self.drag_start = None
        self.drag_current = None
        self._redraw()
```

#### 1.3 Rectangle to Polygon Conversion

**Chuẩn hóa rectangle thành polygon 4 điểm:**

```python
def _rect_to_polygon(x1, y1, x2, y2):
    # Clamp to frame bounds
    x1 = max(0, min(width - 1, x1))
    y1 = max(0, min(height - 1, y1))
    x2 = max(0, min(width - 1, x2))
    y2 = max(0, min(height - 1, y2))
    
    # Skip tiny rectangles
    if abs(x2 - x1) < 2 or abs(y2 - y1) < 2:
        return None
    
    # Normalize to (left, top, right, bottom)
    left = min(x1, x2)
    right = max(x1, x2)
    top = min(y1, y2)
    bottom = max(y1, y2)
    
    # Return 4 points clockwise: TL -> TR -> BR -> BL
    return [
        (left, top),      # Top-Left
        (right, top),     # Top-Right
        (right, bottom),  # Bottom-Right
        (left, bottom)    # Bottom-Left
    ]
```

**Polygon Format:**
- 4 điểm theo chiều kim đồng hồ
- Bắt đầu từ góc trên-trái (Top-Left)
- Format: `[(x1, y1), (x2, y2), (x3, y3), (x4, y4)]`

#### 1.4 Redraw Frame

**Rendering Pipeline:**

```python
def _redraw():
    # Start with clean clone
    self.image = self.clone.copy()
    
    # Draw completed ROIs (green)
    for polygon in rect_polygons:
        ├─> Draw polygon outline (cv2.polylines)
        └─> Draw vertices (cv2.circle)
    
    # Draw preview ROI (orange)
    if drag_start and drag_current:
        preview_polygon = _rect_to_polygon(...)
        ├─> Draw polygon outline (cv2.polylines)
        └─> Draw vertices (cv2.circle)
    
    # Draw help text
    _put_help()
    
    # Show window
    cv2.imshow(window_name, image)
```

**Colors:**
- **Green (0, 255, 0)**: ROI đã hoàn thành
- **Orange (0, 200, 255)**: ROI đang vẽ (preview)

**Vertex Markers:**
- Circle radius: 4 pixels
- Filled: True

#### 1.5 Help Text Overlay

```
┌─────────────────────────────────────────────────┐
│ z: undo ROI | r: reset | s: save | ESC: exit   │
└─────────────────────────────────────────────────┘
```

**Drawing với shadow effect:**
```python
# Black shadow (thick)
cv2.putText(image, text, (x, y), FONT, 0.7, (0, 0, 0), 3)

# White text (thin)
cv2.putText(image, text, (x, y), FONT, 0.7, (255, 255, 255), 1)
```

#### 1.6 Main Loop

```python
def run() -> List[List[Point]]:
    self._redraw()
    
    while True:
        key = cv2.waitKey(20) & 0xFF
        
        if key == 27:  # ESC - Exit without save
            break
            
        elif key == ord('z'):  # Undo last ROI
            if len(rect_polygons) > 0:
                rect_polygons.pop()
            self._redraw()
            
        elif key == ord('r'):  # Reset all ROIs
            rect_polygons.clear()
            drag_start = None
            drag_current = None
            self._redraw()
            
        elif key == ord('s'):  # Save and exit
            break
    
    cv2.destroyWindow(window_name)
    return rect_polygons
```

### 2. Video Source Management

#### 2.1 Capture Frame

```python
def capture_one_frame(video_source: str) -> np.ndarray:
    cap = cv2.VideoCapture(video_source)
    
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được: {video_source}")
    
    ok, frame = cap.read()
    cap.release()
    
    if not ok:
        raise RuntimeError("Không đọc được frame")
    
    return frame
```

**Supported Sources:**
- RTSP URL: `rtsp://192.168.1.100:554/stream`
- Video file: `video/hanam.mp4`
- Webcam: `0` (camera index)

#### 2.2 Camera Config Loader

**Load RTSP URLs từ cam_config.json:**

```python
def load_cam_config(cam_config_path: str) -> Dict[str, str]:
    with open(cam_config_path, 'r') as f:
        config = json.load(f)
    
    cam_urls = config.get("cam_urls", [])
    cam_dict = {}
    
    for cam_entry in cam_urls:
        if isinstance(cam_entry, list) and len(cam_entry) == 2:
            cam_id, rtsp_url = cam_entry
            cam_dict[cam_id] = rtsp_url
    
    return cam_dict
```

**Example cam_config.json:**
```json
{
  "cam_urls": [
    ["cam-1", "rtsp://192.168.1.100:554/stream"],
    ["cam-2", "rtsp://192.168.1.101:554/stream"],
    ["cam-3", "rtsp://192.168.1.102:554/stream"]
  ]
}
```

**Result:**
```python
{
    "cam-1": "rtsp://192.168.1.100:554/stream",
    "cam-2": "rtsp://192.168.1.101:554/stream",
    "cam-3": "rtsp://192.168.1.102:554/stream"
}
```

### 3. Configuration Management

#### 3.1 Load Config

```python
def load_config(config_path: str) -> Dict[str, Any]:
    if not os.path.exists(config_path):
        # Tạo config mới
        return {
            "starts": [],
            "ends": [],
            "pairs": [],
            "roi_coordinates": []
        }
    
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)
```

#### 3.2 Save Config

```python
def save_config(config: Dict[str, Any], config_path: str):
    # Tạo thư mục nếu chưa tồn tại
    dir_path = os.path.dirname(config_path)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)
    
    # Lưu JSON với indent
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
```

#### 3.3 Update ROI Coordinates

```python
def update_roi_coordinates(config, camera_id, polygons):
    # Khởi tạo roi_coordinates nếu chưa có
    if "roi_coordinates" not in config:
        config["roi_coordinates"] = []
    
    # Xóa ROI cũ của camera này
    config["roi_coordinates"] = [
        coord for coord in config["roi_coordinates"]
        if coord.get("camera_id") != camera_id
    ]
    
    # Thêm ROI mới
    for idx, poly in enumerate(polygons):
        if len(poly) >= 3:  # Validate polygon
            roi_coord = {
                "slot_number": idx + 1,
                "camera_id": camera_id,
                "points": [[int(x), int(y)] for (x, y) in poly]
            }
            config["roi_coordinates"].append(roi_coord)
```

**Example Output:**
```json
{
  "roi_coordinates": [
    {
      "slot_number": 1,
      "camera_id": "cam-1",
      "points": [[100, 200], [300, 200], [300, 400], [100, 400]]
    },
    {
      "slot_number": 2,
      "camera_id": "cam-1",
      "points": [[350, 200], [550, 200], [550, 400], [350, 400]]
    }
  ]
}
```

### 4. Queue Publishing

#### 4.1 Payload Format

```python
payload = {
    "camera_id": "cam-1",
    "timestamp": "2025-01-01T00:00:00.123456Z",
    "slots": [
        {
            "slot_id": "slot-1",
            "points": [[100, 200], [300, 200], [300, 400], [100, 400]]
        },
        {
            "slot_id": "slot-2",
            "points": [[350, 200], [550, 200], [550, 400], [350, 400]]
        }
    ],
    "image_wh": [1920, 1080]  # [width, height]
}
```

#### 4.2 Publish to Queue

```python
queue = SQLiteQueue("queues.db")
queue.publish(
    topic="roi_config",
    key=camera_id,
    payload=payload
)
```

**Queue Schema:**
```
Topic: roi_config
Key: camera_id (e.g., "cam-1")
Payload: JSON object (see above)
```

## Command Line Interface

### Arguments

```bash
python roi_tool.py [OPTIONS]
```

**Camera Selection (mutually exclusive):**

| Option | Type | Description |
|--------|------|-------------|
| `--camera-id` | str | Camera ID từ cam_config.json |
| `--video` | str | Đường dẫn file video |
| `--vinhphuc` | flag | Shortcut cho video/vinhPhuc.mp4 (cam-2) |
| `--list-cameras` | flag | Hiển thị danh sách camera và thoát |

**Configuration:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--cam-config-path` | str | `logic/cam_config.json` | Path to camera config |
| `--config-path` | str | `logic/slot_pairing_config.json` | Path to slot pairing config |
| `--save-coords` | flag | False | Lưu ROI vào JSON config |

### Usage Examples

#### 1. List Available Cameras

```bash
python roi_tool.py --list-cameras
```

**Output:**
```
Danh sách camera có sẵn:
  cam-1: rtsp://192.168.1.100:554/stream
  cam-2: rtsp://192.168.1.101:554/stream
  cam-3: rtsp://192.168.1.102:554/stream
```

#### 2. Draw ROI cho RTSP Camera

```bash
python roi_tool.py --camera-id cam-1
```

**Flow:**
1. Load RTSP URL từ cam_config.json
2. Capture một frame từ RTSP stream
3. Mở GUI để vẽ ROI
4. Lưu vào queue database

#### 3. Draw ROI cho Video File

```bash
python roi_tool.py --video video/hanam.mp4
```

**Note:** Camera ID mặc định là `cam-1` khi dùng `--video`

#### 4. Shortcut cho Video Có Sẵn

```bash
python roi_tool.py --vinhphuc
```

**Equivalent to:**
```bash
python roi_tool.py --video video/vinhPhuc.mp4 --camera-id cam-2
```

#### 5. Lưu ROI vào JSON Config

```bash
python roi_tool.py --camera-id cam-1 --save-coords
```

**Output:**
1. Lưu vào queue database
2. Export vào `logic/slot_pairing_config.json`

**Console:**
```
Đã lưu roi_config của cam-1 với 2 ROI vào queue.
Video source: rtsp://192.168.1.100:554/stream
Camera ID: cam-1

Đang lưu tọa độ ROI vào logic/slot_pairing_config.json...
Đã lưu tọa độ ROI vào file config thành công!
Tổng số ROI coordinates: 2

Tọa độ ROI đã lưu:
  Slot 1: points=[[100, 200], [300, 200], [300, 400], [100, 400]]
  Slot 2: points=[[350, 200], [550, 200], [550, 400], [350, 400]]
```

#### 6. Custom Config Path

```bash
python roi_tool.py --camera-id cam-2 \
  --cam-config-path custom/cam.json \
  --config-path custom/pairing.json \
  --save-coords
```

## Interactive GUI Guide

### Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| **Mouse Drag** | Draw ROI | Click and drag để vẽ rectangle |
| `z` | Undo | Xóa ROI vừa vẽ |
| `r` | Reset | Xóa tất cả ROI |
| `s` | Save | Lưu và thoát |
| `ESC` | Exit | Thoát không lưu |

### Workflow

```
1. Launch tool
   ↓
2. Frame hiển thị với help text
   ↓
3. Click và kéo chuột để vẽ ROI
   │
   ├─> Preview rectangle (orange) hiển thị real-time
   │
   └─> Thả chuột → ROI hoàn thành (green)
   ↓
4. Vẽ thêm ROI (lặp lại bước 3)
   │
   ├─> Nhấn 'z' để undo ROI cuối
   ├─> Nhấn 'r' để reset tất cả
   │
5. Nhấn 's' để lưu
   ↓
6. Tool tự động:
   ├─> Normalize polygons
   ├─> Create payload
   ├─> Publish to queue
   └─> [Optional] Export to JSON
```

### Visual Feedback

**ROI States:**

| State | Color | Line Thickness | Vertices |
|-------|-------|----------------|----------|
| Completed | Green (0, 255, 0) | 2 | Filled circle (radius 4) |
| Preview | Orange (0, 200, 255) | 2 | Filled circle (radius 4) |

**Help Text:**
- Position: Top-left (15, 25)
- Font: HERSHEY_SIMPLEX
- Scale: 0.7
- Black shadow + white text

## Data Flow

```
┌──────────────┐
│ Video Source │
└──────┬───────┘
       │
       ├─> Capture one frame
       │
       ▼
┌──────────────┐
│  RoiDrawer   │  <-- User draws ROI
└──────┬───────┘
       │
       ├─> User presses 's'
       │
       ▼
┌──────────────────────────────────┐
│ Normalize polygons (4 points)    │
│ Create payload with timestamp    │
└──────┬───────────────────────────┘
       │
       ├─> Publish to queue
       │   └─> Topic: roi_config
       │       Key: camera_id
       │
       └─> [Optional] Export to JSON
           └─> logic/slot_pairing_config.json
```

### Queue Integration

**Consumer:** `roi_processor.py`

```python
# roi_processor.py subscribes to roi_config
for camera_id in camera_ids:
    roi_data = queue.get_latest("roi_config", camera_id)
    if roi_data:
        self.update_roi_cache(camera_id, roi_data)
```

### JSON Config Integration

**Consumer:** `stable_pair_processor.py`, pairing scripts

```python
# Load ROI coordinates from JSON
with open("logic/slot_pairing_config.json", "r") as f:
    config = json.load(f)

roi_coords = config.get("roi_coordinates", [])
for coord in roi_coords:
    camera_id = coord["camera_id"]
    slot_number = coord["slot_number"]
    points = coord["points"]
    # Use for pairing logic
```

## Best Practices

### 1. ROI Drawing Guidelines

**Good Practices:**
- Vẽ ROI bao quát toàn bộ vùng cần monitor
- Tránh overlap giữa các ROI
- Để margin ~10-20 pixels từ cạnh object
- Slot numbering từ trái sang phải, trên xuống dưới

**Bad Practices:**
- ❌ ROI quá nhỏ → miss detections
- ❌ ROI quá lớn → false positives
- ❌ ROI overlap → ambiguous slot assignment

### 2. Camera Setup

**Before Drawing ROI:**
1. Đảm bảo camera đã cố định (không di chuyển)
2. Lighting conditions ổn định
3. Test RTSP stream trước: `ffplay rtsp://...`

### 3. Naming Convention

**Camera IDs:**
- Format: `cam-1`, `cam-2`, `cam-3`, ...
- Consistent với cam_config.json
- Dễ nhớ và có ý nghĩa (e.g., `cam-warehouse-1`)

### 4. Configuration Management

**Version Control:**
```bash
# Backup before changes
cp logic/slot_pairing_config.json logic/slot_pairing_config.json.backup

# Draw ROI
python roi_tool.py --camera-id cam-1 --save-coords

# Verify changes
git diff logic/slot_pairing_config.json
```

**Multiple Cameras:**
```bash
# Draw ROI cho tất cả cameras
for cam in cam-1 cam-2 cam-3; do
    python roi_tool.py --camera-id $cam --save-coords
done
```

### 5. Validation

**After Drawing ROI:**

```python
# Check queue
from queue_store import SQLiteQueue

queue = SQLiteQueue("queues.db")
roi_data = queue.get_latest("roi_config", "cam-1")
print(f"Slots: {len(roi_data['slots'])}")
print(f"Image WH: {roi_data['image_wh']}")
```

**Visualize ROI:**
```bash
# Use roi_visualizer to verify
python -c "
from roi_visualizer import ROIVisualizer
from queue_store import SQLiteQueue
import cv2

queue = SQLiteQueue('queues.db')
roi_data = queue.get_latest('roi_config', 'cam-1')

cap = cv2.VideoCapture('rtsp://...')
ret, frame = cap.read()

viz = ROIVisualizer()
frame_with_roi = viz.draw_roi_on_frame(frame, 'cam-1', roi_data['slots'])

cv2.imshow('Verify ROI', frame_with_roi)
cv2.waitKey(0)
"
```

## Troubleshooting

### Issue: Không capture được frame

**Symptoms:**
```
RuntimeError: Không mở được video source: rtsp://...
```

**Nguyên nhân:**
- RTSP URL sai
- Network không kết nối
- Camera offline

**Giải pháp:**
```bash
# Test với ffplay
ffplay rtsp://192.168.1.100:554/stream

# Test với VLC
vlc rtsp://192.168.1.100:554/stream

# Check network
ping 192.168.1.100
```

### Issue: Camera không có trong config

**Symptoms:**
```
ValueError: Camera cam-5 không tồn tại trong config.
Các camera có sẵn: ['cam-1', 'cam-2', 'cam-3']
```

**Giải pháp:**
```bash
# List cameras
python roi_tool.py --list-cameras

# Add camera to cam_config.json
vim logic/cam_config.json
```

### Issue: ROI bị crop khi resize

**Nguyên nhân:** Frame resolution khác khi draw vs khi detect

**Giải pháp:**
- Luôn draw ROI ở resolution gốc
- Không resize frame trước khi draw
- ROI coordinates sẽ được scale tự động bởi visualizer

### Issue: JSON config bị corrupt

**Symptoms:**
```
json.decoder.JSONDecodeError: Expecting value: line 1 column 1
```

**Giải pháp:**
```bash
# Restore from backup
cp logic/slot_pairing_config.json.backup logic/slot_pairing_config.json

# Or create new
python roi_tool.py --camera-id cam-1 --save-coords
```

## Advanced Usage

### Batch Processing

```bash
#!/bin/bash
# draw_all_rois.sh

CAMERAS=("cam-1" "cam-2" "cam-3" "cam-4")

for cam in "${CAMERAS[@]}"; do
    echo "Drawing ROI for $cam..."
    python roi_tool.py --camera-id $cam --save-coords
    
    if [ $? -eq 0 ]; then
        echo "✓ $cam completed"
    else
        echo "✗ $cam failed"
    fi
done

echo "All cameras processed!"
```

### Custom Frame Extraction

```python
from roi_tool import capture_one_frame
import cv2

# Capture from specific timestamp
cap = cv2.VideoCapture("video.mp4")
cap.set(cv2.CAP_PROP_POS_MSEC, 5000)  # 5 seconds
ret, frame = cap.read()
cap.release()

# Use frame for ROI drawing
from roi_tool import RoiDrawer

drawer = RoiDrawer(frame, "Custom ROI")
polygons = drawer.run()
```

### Programmatic ROI Creation

```python
from roi_tool import update_roi_coordinates, save_config
import json

# Load existing config
with open("logic/slot_pairing_config.json", "r") as f:
    config = json.load(f)

# Define ROI programmatically
polygons = [
    [(100, 200), (300, 200), (300, 400), (100, 400)],  # Slot 1
    [(350, 200), (550, 200), (550, 400), (350, 400)],  # Slot 2
]

# Update and save
update_roi_coordinates(config, "cam-1", polygons)
save_config(config, "logic/slot_pairing_config.json")
```

## Tích Hợp Với Các Module Khác

### Với roi_processor.py
```
roi_tool → roi_config queue → roi_processor.subscribe_roi_config()
                                ↓
                         Update roi_cache
                                ↓
                         Filter detections by ROI
```

### Với stable_pair_processor.py
```
roi_tool → slot_pairing_config.json → stable_pair_processor
              (roi_coordinates)              ↓
                                      Assign QR codes to slots
```

## Tham Khảo

- `roi_processor.py`: Consumer of ROI config
- `roi_visualizer.py`: Visualization utilities
- `queue_store.py`: Queue database operations
- `stable_pair_processor.py`: Slot pairing logic

