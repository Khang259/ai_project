# ROI Visualizer - Tài liệu hướng dẫn

## Tổng quan

`roi_visualizer.py` là module chuyên dụng được tách ra từ `roi_processor.py` để xử lý tất cả các chức năng vẽ ROI và detections lên video. Việc tách này giúp code dễ quản lý, tái sử dụng và bảo trì hơn.

## Cấu trúc Module

### 1. ROIVisualizer Class

Class chính chứa tất cả các phương thức vẽ ROI và detections.

#### Các phương thức chính:

##### `draw_roi_on_frame(frame, camera_id, roi_slots)`
- **Mục đích**: Vẽ ROI polygons lên frame
- **Tham số**:
  - `frame`: Frame gốc (numpy array)
  - `camera_id`: ID của camera
  - `roi_slots`: Danh sách ROI slots với points
- **Trả về**: Frame đã được vẽ ROI
- **Tính năng**:
  - Vẽ polygon ROI màu xanh lá
  - Vẽ vertices (điểm góc) của polygon
  - Hiển thị label "ROI-1", "ROI-2", etc.

##### `draw_detections_on_frame(frame, detections, camera_id, roi_slots)`
- **Mục đích**: Vẽ detections lên frame với highlight cho ROI detections
- **Tham số**:
  - `frame`: Frame gốc
  - `detections`: Danh sách detections
  - `camera_id`: ID của camera
  - `roi_slots`: Danh sách ROI slots
- **Trả về**: Frame đã được vẽ detections
- **Tính năng**:
  - Vẽ bounding box cho mỗi detection
  - Highlight detections trong ROI (màu đỏ)
  - Detections ngoài ROI (màu xám)
  - Empty detections (màu vàng, đứt nét)
  - Hiển thị label với confidence

##### `draw_info_text(frame, camera_id, roi_detection_data, end_monitoring_count)`
- **Mục đích**: Vẽ thông tin text lên frame
- **Tham số**:
  - `frame`: Frame gốc
  - `camera_id`: ID của camera
  - `roi_detection_data`: Dữ liệu ROI detection
  - `end_monitoring_count`: Số end slots đang được theo dõi
- **Trả về**: Frame đã được vẽ thông tin
- **Thông tin hiển thị**:
  - Camera ID và video source
  - Frame ID
  - Số lượng shelf, empty, total ROI
  - Số end slots đang được theo dõi

#### Các phương thức helper:

##### `_is_detection_in_roi(detection, roi_slots)`
- Kiểm tra detection có nằm trong ROI không
- Sử dụng ray casting algorithm

##### `_is_point_in_polygon(point, polygon)`
- Kiểm tra điểm có nằm trong polygon không
- Ray casting algorithm implementation

##### `_draw_dashed_rectangle(image, pt1, pt2, color, thickness, dash_length)`
- Vẽ hình chữ nhật đứt nét
- Sử dụng cho empty detections

##### `_draw_dashed_line(image, pt1, pt2, color, thickness, dash_length)`
- Vẽ đường thẳng đứt nét
- Helper cho dashed rectangle

### 2. VideoDisplayManager Class

Class quản lý hiển thị video với ROI và detections.

#### Các phương thức chính:

##### `display_video(roi_cache, latest_roi_detections, end_slot_states, video_captures, frame_cache, update_frame_cache_func)`
- **Mục đích**: Hiển thị video real-time với ROI và detections
- **Tham số**:
  - `roi_cache`: Cache ROI theo camera_id
  - `latest_roi_detections`: Latest ROI detection data
  - `end_slot_states`: Trạng thái end slots
  - `video_captures`: Video captures cho mỗi camera
  - `frame_cache`: Frame cache cho mỗi camera
  - `update_frame_cache_func`: Hàm cập nhật frame cache
- **Tính năng**:
  - Cập nhật frame cho tất cả camera
  - Vẽ ROI và detections
  - Hiển thị thông tin text
  - Xử lý phím bấm (q để thoát)
  - ~30 FPS display

##### `stop()`
- Dừng hiển thị video
- Đóng tất cả cửa sổ OpenCV

## Tích hợp với ROIProcessor

### 1. Import và khởi tạo

```python
from roi_visualizer import ROIVisualizer, VideoDisplayManager

class ROIProcessor:
    def __init__(self, db_path: str = "queues.db", show_video: bool = True):
        # ... existing code ...
        
        # ROI Visualizer
        self.roi_visualizer = ROIVisualizer()
        # Video Display Manager
        self.video_display_manager = VideoDisplayManager(show_video)
```

### 2. Delegation Pattern

Các phương thức trong `ROIProcessor` giờ delegate đến `ROIVisualizer`:

```python
def draw_roi_on_frame(self, frame: np.ndarray, camera_id: str) -> np.ndarray:
    """Delegate to roi_visualizer"""
    with self.cache_lock:
        roi_slots = self.roi_cache.get(camera_id, [])
    
    return self.roi_visualizer.draw_roi_on_frame(frame, camera_id, roi_slots)

def draw_detections_on_frame(self, frame: np.ndarray, detections: List[Dict[str, Any]], 
                            camera_id: str) -> np.ndarray:
    """Delegate to roi_visualizer"""
    with self.cache_lock:
        roi_slots = self.roi_cache.get(camera_id, [])
    
    return self.roi_visualizer.draw_detections_on_frame(frame, detections, camera_id, roi_slots)
```

### 3. Video Display Management

```python
def display_video(self) -> None:
    """Delegate to video_display_manager"""
    self.video_display_manager.display_video(
        roi_cache=self.roi_cache,
        latest_roi_detections=self.latest_roi_detections,
        end_slot_states=self.end_slot_states,
        video_captures=self.video_captures,
        frame_cache=self.frame_cache,
        update_frame_cache_func=self.update_frame_cache
    )
```

## Lợi ích của việc tách module

### 1. Separation of Concerns
- **ROIProcessor**: Xử lý logic business (ROI filtering, end monitoring, queue management)
- **ROIVisualizer**: Chuyên về visualization (vẽ ROI, detections, text)

### 2. Code Reusability
- `ROIVisualizer` có thể được sử dụng bởi các module khác
- Dễ dàng tạo các tool visualization khác
- Có thể sử dụng trong testing và debugging

### 3. Maintainability
- Code visualization tập trung ở một nơi
- Dễ dàng thay đổi style, màu sắc, format
- Dễ dàng thêm tính năng visualization mới

### 4. Testing
- Có thể test visualization logic độc lập
- Mock dễ dàng cho unit testing
- Có thể tạo test cases với sample data

### 5. Performance
- Có thể optimize visualization logic riêng biệt
- Dễ dàng thêm caching cho visualization
- Có thể tối ưu hóa OpenCV operations

## Cách sử dụng độc lập

### 1. Sử dụng ROIVisualizer

```python
from roi_visualizer import ROIVisualizer
import cv2
import numpy as np

# Khởi tạo visualizer
visualizer = ROIVisualizer()

# Load frame
frame = cv2.imread("test_image.jpg")

# Định nghĩa ROI slots
roi_slots = [
    {
        "points": [[100, 100], [200, 100], [200, 200], [100, 200]]
    }
]

# Vẽ ROI
frame_with_roi = visualizer.draw_roi_on_frame(frame, "cam-1", roi_slots)

# Hiển thị
cv2.imshow("ROI", frame_with_roi)
cv2.waitKey(0)
cv2.destroyAllWindows()
```

### 2. Sử dụng VideoDisplayManager

```python
from roi_visualizer import VideoDisplayManager

# Khởi tạo display manager
display_manager = VideoDisplayManager(show_video=True)

# Giả lập data
roi_cache = {"cam-1": [{"points": [[100, 100], [200, 100], [200, 200], [100, 200]]}]}
latest_roi_detections = {}
end_slot_states = {}
video_captures = {}
frame_cache = {}

def update_frame_cache(camera_id):
    # Implementation để cập nhật frame
    return True

# Hiển thị video
display_manager.display_video(
    roi_cache=roi_cache,
    latest_roi_detections=latest_roi_detections,
    end_slot_states=end_slot_states,
    video_captures=video_captures,
    frame_cache=frame_cache,
    update_frame_cache_func=update_frame_cache
)
```

## Mở rộng trong tương lai

### 1. Thêm tính năng visualization
- Thêm các style vẽ khác (dotted, solid, etc.)
- Thêm animation cho ROI
- Thêm heatmap visualization
- Thêm 3D visualization

### 2. Tối ưu hóa performance
- Sử dụng GPU acceleration
- Caching cho các operations phức tạp
- Batch processing cho multiple frames

### 3. Customization
- Theme system (dark/light mode)
- Configurable colors và styles
- Custom fonts và text rendering

### 4. Export capabilities
- Export video với annotations
- Export images với ROI overlays
- Export data cho analysis tools

## Troubleshooting

### 1. Import Error
```
ModuleNotFoundError: No module named 'roi_visualizer'
```
**Giải pháp**: Đảm bảo `roi_visualizer.py` ở cùng thư mục với `roi_processor.py`

### 2. OpenCV Error
```
cv2.error: OpenCV(4.x.x) ... 
```
**Giải pháp**: Kiểm tra OpenCV version và dependencies

### 3. Performance Issues
- Giảm frame rate trong `display_video`
- Tối ưu hóa ROI drawing operations
- Sử dụng threading cho video processing

### 4. Memory Issues
- Giải phóng frame cache định kỳ
- Sử dụng generator thay vì list cho large datasets
- Monitor memory usage với profiling tools




ĐƯỜNG DẪN MẶC ĐỊNH
Queue Database:
File: queues.db (trong thư mục gốc project)
Topic: roi_config
Key: camera_id (ví dụ: cam-1, cam-2)
File Config:
File: logic/slot_pairing_config.json
Section: roi_coordinates[]
Format: JSON với array các object ROI