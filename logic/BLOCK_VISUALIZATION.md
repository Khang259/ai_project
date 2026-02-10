# Block Visualization - Hiển thị trạng thái BLOCKED trên Visualizer

## Vấn đề ban đầu

Sau khi logic trigger và block điểm "s", visualizer hiển thị điểm đó với màu `roi_normal` (vàng) thay vì hiển thị trạng thái BLOCKED.

**Nguyên nhân:**
- ROI Visualizer chỉ nhận dữ liệu từ `roi_checker` (detection results)
- Logic Processor block điểm nhưng KHÔNG thông báo cho Visualizer
- Khi không có detection update → `match_info = None` → hiển thị màu vàng (roi_normal)

## Giải pháp đã implement

### 1. Thêm màu "blocked" vào Visualizer

```python
# roi_visualizer.py
self.colors = {
    'shelf': (0, 255, 0),      # Xanh lá - có hàng
    'empty': (0, 0, 255),      # Đỏ - trống
    'blocked': (128, 0, 128),  # Tím - điểm bị block  ← MỚI
    'roi_normal': (0, 255, 255),  # Vàng
    ...
}
```

### 2. Cập nhật `update_roi_match()` để nhận trường `status`

```python
def update_roi_match(self, match_result):
    status = match_result.get('status', 'available')  # 'available' hoặc 'blocked'
    
    self.roi_matches[camera_id][slot_id] = {
        'object_type': object_type,
        'status': status,  # ← Thêm trường này
        ...
    }
```

### 3. Logic hiển thị ưu tiên `status` trước

```python
if match_info:
    status = match_info.get('status', 'available')
    if status == 'blocked':
        color = self.colors['blocked']  # Màu tím
        thickness = 2  # Viền dày hơn
        label = f"{slot_id}|{obj_type}|BLOCKED"
    else:
        # Hiển thị bình thường shelf/empty
        color = self.colors.get(object_type, ...)
        label = f"{slot_id}|{obj_type}|{confidence:.2f}"
```

### 4. HashTables: Thêm method gửi thông báo block

```python
# hash_tables.py
def send_block_notification(self, qr_code: str, visualizer_queue=None):
    """Gửi thông báo block đến visualizer"""
    if not visualizer_queue:
        return
    
    point_info = self.qr_to_key_map.get(qr_code)
    camera_id, slot_id = point_info
    state = self.state_tracker.get(qr_code)
    
    # Tạo message giống format của roi_checker
    message = {
        "camera_id": camera_id,
        "slot_id": slot_id,
        "object_type": state.get("object_type", "shelf"),
        "status": "blocked",  # ← Trường đặc biệt
        "confidence": state.get("confidence", 0.0),
        "bbox": []
    }
    
    visualizer_queue.put(message, block=False)
```

### 5. Logic Processor: Pass `visualizer_queue` vào

```python
# logic_processor.py
def __init__(self, config_path, visualizer_queue=None):
    self.visualizer_queue = visualizer_queue
    ...

def logic_processor_worker(input_queue, output_queue, config_path, log_file, visualizer_queue):
    processor = LogicProcessor(config_path, visualizer_queue)
    ...
```

### 6. Base Logic & Rules: Nhận `visualizer_queue`

```python
# base_logic.py
def __init__(self, rule_name, config, params, hash_tables, visualizer_queue=None):
    self.visualizer_queue = visualizer_queue
    ...

# 2point.py, pairs_logic.py, dual_logic.py
if condition_met and stable_duration >= stability_time:
    # Block điểm
    self.hash_tables.update_state(s_qr, {"status": "blocked", ...})
    
    # Gửi thông báo đến visualizer ← QUAN TRỌNG
    self.hash_tables.send_block_notification(s_qr, self.visualizer_queue)
    
    logger.info(f"Đã block điểm s({s_qr})")
```

## Cách sử dụng

### Khởi động với visualizer_queue

```python
from multiprocessing import Queue

roi_result_queue = Queue()  # Queue dùng chung cho detection results VÀ block notifications

# Start Logic Processor với visualizer_queue
logic_process = Process(
    target=logic_processor_worker,
    args=(
        input_queue,
        output_queue,
        config_path,
        log_file,
        roi_result_queue  # ← Pass queue này vào
    )
)

# Start Visualizer (nhận từ cùng queue)
visualizer_process = Process(
    target=roi_visualizer_worker,
    args=(
        shared_dict,
        roi_result_queue,  # ← Cùng queue
        roi_config_path
    )
)
```

## Flow hoạt động

```
1. Logic trigger → Block điểm "s" (status = "blocked")
   ↓
2. hash_tables.send_block_notification(s_qr, visualizer_queue)
   ↓
3. Message gửi vào roi_result_queue:
   {
       "camera_id": "cam-1",
       "slot_id": "ROI_1",
       "object_type": "shelf",
       "status": "blocked",  ← Trường đặc biệt
       "confidence": 0.95,
       "bbox": []
   }
   ↓
4. Visualizer nhận message → update_roi_match()
   ↓
5. Visualizer vẽ điểm với:
   - Màu TÍM (128, 0, 128)
   - Viền DÀY hơn (thickness=2)
   - Label: "ROI_1|shelf|BLOCKED"
```

## Kết quả

✅ **Điểm bị block** → Hiển thị màu **TÍM** + label "BLOCKED"  
✅ **Điểm available** → Hiển thị màu **XANH LÁ** (shelf) hoặc **ĐỎ** (empty)  
✅ **Điểm chưa detect** → Hiển thị màu **VÀNG** (roi_normal)

## Unblock điểm (API callback)

Khi robot hoàn thành task, gọi API unblock:

```python
@app.post("/api/unblock-point")
def unblock_point(qr_code: str):
    # Unblock trong hash_tables
    hash_tables.unblock_point(qr_code)
    
    # Gửi thông báo unblock đến visualizer
    hash_tables.send_block_notification(qr_code, visualizer_queue)
    # (Cần sửa send_block_notification để gửi cả unblock)
    
    return {"status": "success", "unblocked": qr_code}
```

**Lưu ý:** Hiện tại `send_block_notification()` chỉ gửi khi block. Nếu cần hiển thị ngay khi unblock, thêm logic tương tự trong `unblock_point()`.


