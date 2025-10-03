# Stable Pair Processor - Tài liệu chi tiết

## Tổng quan

`StablePairProcessor` là một hệ thống xử lý và phát hiện các cặp slot ổn định (stable pairs) dựa trên trạng thái shelf/empty của các ROI slots. Hệ thống theo dõi các camera và slot để phát hiện khi nào có sự chuyển đổi trạng thái ổn định giữa start slot và end slot, sau đó publish thông tin này vào queue `stable_pairs`.

## Mục đích chính

- **Phát hiện stable pairs**: Theo dõi trạng thái shelf/empty của các slot
- **Tránh spam**: Có cơ chế cooldown và duplicate prevention
- **Publish stable pairs**: Gửi thông tin cặp ổn định vào queue để các hệ thống khác xử lý
- **Tích hợp với ROI system**: Sử dụng dữ liệu từ `roi_detection` queue

## Cấu trúc lớp và thuộc tính

### Class StablePairProcessor

```python
class StablePairProcessor:
    def __init__(self, db_path: str = "../queues.db", 
                 config_path: str = "slot_pairing_config.json",
                 stable_seconds: float = 20.0, 
                 cooldown_seconds: float = 10.0)
```

#### Tham số khởi tạo

| Tham số | Kiểu | Mặc định | Mô tả |
|---------|------|----------|-------|
| `db_path` | str | "../queues.db" | Đường dẫn đến database SQLite |
| `config_path` | str | "slot_pairing_config.json" | Đường dẫn đến file cấu hình pairing |
| `stable_seconds` | float | 20.0 | Thời gian cần giữ trạng thái để được coi là "stable" (giây) |
| `cooldown_seconds` | float | 10.0 | Thời gian chờ giữa các lần publish cùng một pair (giây) |

#### Thuộc tính chính

| Thuộc tính | Kiểu | Mô tả |
|------------|------|-------|
| `queue` | SQLiteQueue | Kết nối database để đọc/ghi queue |
| `slot_state` | Dict[str, Dict] | Lưu trữ trạng thái của từng slot: `{camera_id:slot_number: {status, since}}` |
| `published_at` | Dict[str, float] | Thời gian publish cuối cùng của mỗi pair |
| `published_by_minute` | Dict[str, Dict[str, bool]] | Track các pair đã publish theo từng phút |
| `qr_to_slot` | Dict[int, Tuple[str, int]] | Mapping QR code → (camera_id, slot_number) |
| `pairs` | List[Tuple[int, List[int]]] | Danh sách các cặp start_qr → [end_qrs] |

## Chi tiết các hàm

### 1. Hàm tiện ích

#### `utc_now_iso() -> str`
- **Mục đích**: Tạo timestamp UTC theo định dạng ISO
- **Trả về**: String timestamp dạng "YYYY-MM-DDTHH:MM:SS.sssZ"
- **Sử dụng**: Tạo timestamp cho stable_since trong payload

#### `is_point_in_polygon(point: Tuple[float, float], polygon: List[List[int]]) -> bool`
- **Mục đích**: Kiểm tra điểm có nằm trong polygon không (Ray casting algorithm)
- **Tham số**:
  - `point`: Điểm cần kiểm tra (x, y)
  - `polygon`: Danh sách các điểm của polygon
- **Trả về**: True nếu điểm nằm trong polygon
- **Lưu ý**: Hiện tại không được sử dụng trong logic chính

### 2. Hàm khởi tạo và cấu hình

#### `_load_pairing_config() -> None`
- **Mục đích**: Load cấu hình pairing từ file JSON
- **Chức năng**:
  - Đọc file `slot_pairing_config.json`
  - Xây dựng mapping `qr_to_slot` từ sections "starts" và "ends"
  - Chuẩn hóa pairs: đảm bảo `end_qrs` là list
- **Cập nhật**:
  - `self.qr_to_slot`: QR code → (camera_id, slot_number)
  - `self.pairs`: List các cặp (start_qr, [end_qrs])

### 3. Hàm xử lý dữ liệu ROI

#### `_iter_roi_detections() -> List[str]`
- **Mục đích**: Lấy danh sách camera IDs có dữ liệu roi_detection
- **Trả về**: List các camera_id từ queue roi_detection
- **Sử dụng**: Để biết camera nào cần theo dõi

#### `_compute_slot_statuses(camera_id: str, roi_detections: List[Dict[str, Any]]) -> Dict[int, str]`
- **Mục đích**: Tính trạng thái slot dựa trên roi_detections
- **Tham số**:
  - `camera_id`: ID của camera
  - `roi_detections`: Danh sách detections từ roi_processor
- **Trả về**: Dict mapping slot_number → status ("shelf" hoặc "empty")
- **Logic**:
  - Nếu có detection "shelf" ở slot X → slot X = "shelf"
  - Nếu có detection "empty" ở slot X và chưa có "shelf" → slot X = "empty"
  - Các slot khác không được cập nhật

#### `_update_slot_state(camera_id: str, status_by_slot: Dict[int, str]) -> None`
- **Mục đích**: Cập nhật trạng thái slot vào store
- **Tham số**:
  - `camera_id`: ID của camera
  - `status_by_slot`: Dict slot_number → status
- **Logic**:
  - Tạo key dạng "camera_id:slot_number"
  - Nếu slot chưa có state → tạo mới với timestamp hiện tại
  - Nếu status thay đổi → cập nhật status và timestamp
  - Nếu status không đổi → giữ nguyên timestamp "since"

### 4. Hàm kiểm tra stable

#### `_is_slot_stable(camera_id: str, slot_number: int, expect_status: str) -> Tuple[bool, Optional[float]]`
- **Mục đích**: Kiểm tra slot có stable với trạng thái mong đợi không
- **Tham số**:
  - `camera_id`: ID của camera
  - `slot_number`: Số slot
  - `expect_status`: Trạng thái mong đợi ("shelf" hoặc "empty")
- **Trả về**: 
  - `(True, stable_since_timestamp)` nếu stable
  - `(False, None)` nếu không stable
- **Logic**:
  - Kiểm tra slot có tồn tại trong state không
  - Kiểm tra status hiện tại có khớp với expect_status không
  - Kiểm tra thời gian stable có >= `stable_seconds` không

### 5. Hàm quản lý publish

#### `_get_minute_key(epoch_seconds: float) -> str`
- **Mục đích**: Chuyển epoch seconds thành key theo phút
- **Tham số**: `epoch_seconds` - timestamp dạng epoch
- **Trả về**: String dạng "YYYY-MM-DD HH:MM"
- **Sử dụng**: Để track duplicate trong cùng phút

#### `_is_already_published_this_minute(pair_id: str, stable_since_epoch: float) -> bool`
- **Mục đích**: Kiểm tra pair đã được publish trong phút này chưa
- **Tham số**:
  - `pair_id`: ID của pair
  - `stable_since_epoch`: Timestamp khi stable
- **Trả về**: True nếu đã publish trong phút này
- **Logic**: Sử dụng minute_key để kiểm tra duplicate

#### `_mark_published_this_minute(pair_id: str, stable_since_epoch: float) -> None`
- **Mục đích**: Đánh dấu pair đã được publish trong phút này
- **Tham số**:
  - `pair_id`: ID của pair
  - `stable_since_epoch`: Timestamp khi stable
- **Cập nhật**: `self.published_by_minute[pair_id][minute_key] = True`

#### `_maybe_publish_pair(start_qr: int, end_qr: int, stable_since_epoch: float) -> None`
- **Mục đích**: Publish pair nếu thỏa mãn điều kiện
- **Tham số**:
  - `start_qr`: QR code của start slot
  - `end_qr`: QR code của end slot
  - `stable_since_epoch`: Timestamp khi stable
- **Logic**:
  1. Tạo `pair_id` dạng "start_qr -> end_qr"
  2. Kiểm tra đã publish trong phút này chưa
  3. Kiểm tra cooldown period
  4. Nếu OK → publish vào queue `stable_pairs`
- **Payload**:
  ```json
  {
    "pair_id": "11 -> 24",
    "start_slot": "11",
    "end_slot": "24", 
    "stable_since": "2024-01-01T12:00:00.000Z"
  }
  ```

### 6. Hàm chính

#### `run() -> None`
- **Mục đích**: Vòng lặp chính của processor
- **Logic**:
  1. **Khởi tạo**: Lấy danh sách camera và last_id cho mỗi camera
  2. **Vòng lặp chính**:
     - Đọc roi_detection mới từ tất cả camera
     - Cập nhật slot states
     - Đánh giá tất cả pairs trong config
     - Publish các pair stable
  3. **Xử lý pairs**:
     - Với mỗi pair (start_qr, [end_qrs]):
       - Kiểm tra start slot có stable "shelf" không
       - Kiểm tra end slot có stable "empty" không
       - Nếu cả hai stable → publish pair

## Cấu hình file

### slot_pairing_config.json

```json
{
  "starts": [
    {
      "slot_number": 1,
      "camera_id": "cam-1", 
      "qr_code": 11
    }
  ],
  "ends": [
    {
      "slot_number": 4,
      "camera_id": "cam-2",
      "qr_code": 24
    }
  ],
  "pairs": [
    {
      "start_qr": 11,
      "end_qrs": 24
    }
  ]
}
```

## Luồng hoạt động

### 1. Khởi tạo
```
Load config → Build qr_to_slot mapping → Build pairs list
```

### 2. Vòng lặp chính
```
Read roi_detection → Update slot states → Evaluate pairs → Publish stable pairs
```

### 3. Logic phát hiện stable pair
```
Start slot stable "shelf" + End slot stable "empty" → Publish pair
```

## Queue Integration

### Input Queue: `roi_detection`
- **Topic**: `roi_detection`
- **Key**: `camera_id` (ví dụ: "cam-1", "cam-2")
- **Payload**: 
  ```json
  {
    "camera_id": "cam-1",
    "frame_id": 12345,
    "roi_detections": [
      {
        "class_name": "shelf",
        "slot_number": 1,
        "confidence": 0.95
      }
    ]
  }
  ```

### Output Queue: `stable_pairs`
- **Topic**: `stable_pairs`
- **Key**: `pair_id` (ví dụ: "11 -> 24")
- **Payload**:
  ```json
  {
    "pair_id": "11 -> 24",
    "start_slot": "11",
    "end_slot": "24",
    "stable_since": "2024-01-01T12:00:00.000Z"
  }
  ```

## Tham số có thể điều chỉnh

### 1. Thời gian stable
```python
stable_seconds = 20.0  # Giây
```
- **Ý nghĩa**: Thời gian cần giữ trạng thái để được coi là stable
- **Ảnh hưởng**: 
  - Giá trị cao → Ít false positive, nhưng chậm phản ứng
  - Giá trị thấp → Nhanh phản ứng, nhưng có thể false positive

### 2. Cooldown period
```python
cooldown_seconds = 10.0  # Giây
```
- **Ý nghĩa**: Thời gian chờ giữa các lần publish cùng một pair
- **Ảnh hưởng**: Tránh spam khi trạng thái dao động

### 3. Duplicate prevention
- **Cơ chế**: Track theo phút để tránh duplicate
- **Logic**: Mỗi pair chỉ publish một lần trong cùng phút

## Debug và Monitoring

### 1. Log messages
```
StablePairProcessor started. Watching cameras: ['cam-1', 'cam-2']
```

### 2. Debug state
```python
# Thêm vào code để debug
print(f"Slot states: {self.slot_state}")
print(f"Published pairs: {self.published_at}")
```

### 3. Kiểm tra queue
```python
# Kiểm tra roi_detection queue
queue.get_latest("roi_detection", "cam-1")

# Kiểm tra stable_pairs queue  
queue.get_latest("stable_pairs", "11 -> 24")
```

## Troubleshooting

### 1. Không phát hiện stable pairs
- **Nguyên nhân**: 
  - Config không đúng
  - ROI detection không có slot_number
  - Thời gian stable quá cao
- **Giải pháp**:
  - Kiểm tra config file
  - Kiểm tra roi_detection payload
  - Giảm stable_seconds

### 2. Publish quá nhiều
- **Nguyên nhân**: 
  - Cooldown quá thấp
  - Trạng thái dao động
- **Giải pháp**:
  - Tăng cooldown_seconds
  - Tăng stable_seconds

### 3. Không có roi_detection data
- **Nguyên nhân**: 
  - roi_processor không chạy
  - Camera không có ROI config
- **Giải pháp**:
  - Kiểm tra roi_processor
  - Kiểm tra roi_config queue

## Tích hợp với hệ thống

### 1. Dependencies
- `queue_store.SQLiteQueue`: Để đọc/ghi queue
- `roi_processor.py`: Cung cấp roi_detection data
- `slot_pairing_config.json`: Cấu hình pairing

### 2. Downstream consumers
- `postAPI.py`: Consume stable_pairs để gửi API
- `roi_processor.py`: Consume stable_pairs để block/unlock slots

### 3. Chạy hệ thống
```bash
# Terminal 1: ROI Processor
python roi_processor.py

# Terminal 2: Stable Pair Processor  
python logic/stable_pair_processor.py

# Terminal 3: Post API
python postRq/postAPI.py
```

## Performance và Scalability

### 1. Memory usage
- `slot_state`: O(n_slots) - lưu trữ state của tất cả slots
- `published_at`: O(n_pairs) - lưu trữ thời gian publish
- `published_by_minute`: O(n_pairs * n_minutes) - có thể cleanup theo thời gian

### 2. CPU usage
- Vòng lặp chính: 0.2s interval
- Xử lý pairs: O(n_pairs * n_end_slots)
- Database queries: Batch read để tối ưu

### 3. Scalability
- Có thể chạy multiple instances với different config
- Database có thể scale với proper indexing
- Memory cleanup có thể implement để tránh memory leak
