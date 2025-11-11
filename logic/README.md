# Logic Package - Hệ thống xử lý nghiệp vụ

## 📋 Tổng quan

Package này xử lý logic nghiệp vụ dựa trên kết quả detection từ ROI Checker. Hệ thống sử dụng Hash Tables trong RAM để tra cứu nhanh và các Logic Rules để xử lý nghiệp vụ phức tạp.

## 🏗️ Kiến trúc

```
roi_checker.py (result_queue)
        ↓
    Queue 1 (Input)
        ↓
  Logic Processor  ←→  Hash Tables (RAM)
        ↓                    ↓
    Queue 2 (Output)    Logic Rules
```

## 📦 Cấu trúc File

```
logic/
├── __init__.py              # Package exports
├── config.json              # Configuration file
├── roi_config.json          # ROI configuration
│
├── hash_tables.py           # 4 Hash Tables quản lý data
├── base_logic.py            # Abstract base class cho Logic Rules
├── pairs_logic.py           # Logic 3 điểm (Pairs)
├── dual_logic.py            # Logic 4 điểm (Dual)
├── logic_processor.py       # Core processor (trái tim hệ thống)
│
├── example_usage.py         # Ví dụ sử dụng
└── README.md               # Tài liệu này
```

## 🗄️ Hash Tables (4 bảng trong RAM)

### 1. **key_to_qr_map**: `(camera_id, slot_id) → qr_code`
Tra cứu nhanh qr_code từ thông tin camera và slot.

```python
hash_tables.get_qr_code("cam-1", "1")  # → "000"
```

### 2. **qr_to_key_map**: `qr_code → (camera_id, slot_id)`
Tra cứu ngược lại thông tin camera/slot từ qr_code.

```python
hash_tables.get_point_info("000")  # → ("cam-1", "1")
```

### 3. **trigger_map**: `qr_code → [List Logic Rules]`
Ánh xạ qr_code đến các rules quan tâm đến nó (tối ưu performance).

```python
rules = hash_tables.get_triggered_rules("000")  # → [PairsLogic, ...]
```

### 4. **state_tracker**: `qr_code → state` (Single Source of Truth)
Nguồn chân lý duy nhất, lưu trạng thái hiện tại của mỗi qr_code.

```python
state = hash_tables.get_state("000")
# → {"object_type": "shelf", "confidence": 0.95, "last_update": 1678886400, ...}
```

## 🎯 Logic Rules

### Base Logic Rule
Tất cả logic rules kế thừa từ `LogicRule` abstract class.

Mỗi rule:
- Tự quản lý **internal state** riêng
- Xử lý events từ Queue
- Kiểm tra điều kiện và tính stability
- Trả về output khi trigger

### Pairs Logic (Logic 3 điểm)

**Điều kiện**: `s1=shelf AND e1=empty AND e2=empty` trong X giây

**Config example**:
```json
{
  "rule_name": "logic_3diem",
  "logic_type": "Pairs",
  "config": {
    "s1": "000",
    "e1": "111",
    "e2": "222"
  },
  "params": {
    "stability_time_sec": 10,
    "output_queue": "Queue_A"
  }
}
```

### Dual Logic (Logic 4 điểm)

**Điều kiện**: `(s1=shelf AND e1=empty) OR (s2=shelf AND e2=empty)` trong X giây

**Config example**:
```json
{
  "rule_name": "logic_4diem",
  "logic_type": "Dual",
  "config": {
    "s1": "333",
    "e1": "444",
    "s2": "555",
    "e2": "666"
  },
  "params": {
    "stability_time_sec": 5,
    "output_queue": "Queue_B"
  }
}
```

## 🚀 Cách sử dụng

### 1. Import package

```python
from multiprocessing import Process, Queue
from logic import logic_processor_worker
```

### 2. Tạo Queues

```python
# Queue 1: ROI Checker → Logic Processor
roi_result_queue = Queue(maxsize=1000)

# Queue 2: Logic Processor → Output
logic_output_queue = Queue(maxsize=1000)
```

### 3. Khởi động Logic Processor Worker

```python
logic_process = Process(
    target=logic_processor_worker,
    args=(roi_result_queue, logic_output_queue, "logic/config.json")
)
logic_process.start()
```

### 4. Gửi events vào Queue 1

```python
event = {
    "camera_id": "cam-1",
    "timestamp": time.time(),
    "slot_id": "1",
    "object_type": "shelf",  # hoặc "empty"
    "confidence": 0.95,
    "iou": 0.85,
    "bbox": [10, 15, 50, 60]
}
roi_result_queue.put(event)
```

### 5. Đọc outputs từ Queue 2

```python
output = logic_output_queue.get()
print(f"Trigger: {output['rule_name']}")
print(f"Type: {output['rule_type']}")
print(f"Stable duration: {output['stable_duration']}s")
```

## 📝 Format dữ liệu

### Input Event (Queue 1)
```python
{
    "camera_id": "cam-1",
    "timestamp": 1678886400.0,
    "slot_id": "1",
    "object_type": "shelf",  # hoặc "empty"
    "confidence": 0.95,
    "iou": 0.85,
    "bbox": [10, 15, 50, 60]
}
```

### Output (Queue 2) - Pairs Logic
```python
{
    "rule_name": "logic_3diem",
    "rule_type": "Pairs",
    "timestamp": 1678886400.0,
    "s1": {"qr_code": "000", "state": "shelf", "confidence": 0.95},
    "e1": {"qr_code": "111", "state": "empty", "confidence": 0.0},
    "e2": {"qr_code": "222", "state": "empty", "confidence": 0.0},
    "stable_duration": 10.5,
    "output_queue": "Queue_A",
    "trigger_count": 1
}
```

### Output (Queue 2) - Dual Logic
```python
{
    "rule_name": "logic_4diem",
    "rule_type": "Dual",
    "pair": "pair1",  # hoặc "pair2"
    "timestamp": 1678886400.0,
    "s": {"qr_code": "333", "state": "shelf", "confidence": 0.92},
    "e": {"qr_code": "444", "state": "empty", "confidence": 0.0},
    "stable_duration": 5.2,
    "output_queue": "Queue_B",
    "trigger_count": 1,
    "pair_trigger_count": 1
}
```

## 🔧 Configuration (config.json)

```json
{
  "points": {
    "000": { "camera_id": "cam-1", "slot_id": 1 },
    "111": { "camera_id": "cam-1", "slot_id": 2 },
    "222": { "camera_id": "cam-1", "slot_id": 3 }
  },
  "rules": [
    {
      "rule_name": "logic_3diem",
      "logic_type": "Pairs",
      "config": {
        "s1": "000",
        "e1": "111",
        "e2": "222"
      },
      "params": {
        "stability_time_sec": 10,
        "output_queue": "Queue_A"
      }
    }
  ]
}
```

## 🎬 Chạy Example

```bash
cd D:\WORK\ROI_LOGIC_version2
python logic/example_usage.py
```

## 🔍 Debugging & Monitoring

### Xem statistics

```python
from logic import LogicProcessor

processor = LogicProcessor("logic/config.json")
processor.print_statistics()
```

Output:
```
============================================================
📊 LOGIC PROCESSOR STATISTICS
============================================================

⏱️  Uptime: 120.5s
📥 Events processed: 1500
📤 Outputs generated: 12
⚡ Events/sec: 12.45

📦 Hash Tables:
   - Total points: 7
   - QR codes with triggers: 6

📋 Rules (2 total):
   - logic_3diem (PairsLogic)
     Events: 750 | Triggers: 8
   - logic_4diem (DualLogic)
     Events: 750 | Triggers: 4
============================================================
```

## ➕ Thêm Logic Rule mới

### Bước 1: Tạo file logic mới (ví dụ: `triple_logic.py`)

```python
from typing import Dict, Any, Optional
from .base_logic import LogicRule

class TripleLogic(LogicRule):
    """Logic mới của bạn"""
    
    def _init_internal_state(self):
        self.internal_state = {
            "condition_met": False,
            "condition_start_time": 0.0
        }
    
    def process_event(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        # Implement logic của bạn ở đây
        pass
```

### Bước 2: Thêm vào `logic_processor.py`

```python
from .triple_logic import TripleLogic

# Trong _create_logic_rule method:
elif logic_type == "Triple":
    return TripleLogic(rule_name, rule_cfg, params, self.hash_tables)
```

### Bước 3: Export trong `__init__.py`

```python
from .triple_logic import TripleLogic

__all__ = [
    # ...
    "TripleLogic",
]
```

## ⚡ Performance

- **Hash Table lookup**: O(1)
- **Rule dispatch**: O(k) với k = số rules liên quan đến qr_code
- **Memory**: Minimal, chỉ lưu state cần thiết trong RAM
- **Throughput**: 10,000+ events/sec trên hardware trung bình

## 🐛 Troubleshooting

### Issue: Rule không trigger

1. Kiểm tra config.json có đúng mapping không
2. Kiểm tra events có đúng camera_id/slot_id không
3. Kiểm tra stability_time_sec có quá cao không
4. Enable debug logs trong rule

### Issue: Memory leak

- Hash Tables có auto-cleanup không cần thiết
- Internal state của rules được reset sau trigger
- Queues có maxsize để tránh overflow

## 📚 Tài liệu liên quan

- `detectObject/roi_checker.py` - Source của events
- `logic/config.json` - Configuration
- `logic/example_usage.py` - Example code

## 📞 Liên hệ

Nếu có vấn đề hoặc câu hỏi, vui lòng liên hệ ROI Logic Team.

