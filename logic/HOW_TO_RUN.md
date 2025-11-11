# Hướng dẫn chạy Logic Processor

## 📋 Tổng quan

Logic Processor đọc `roi_result_queue` từ ROI Checker (output của `main.py`) và xử lý logic nghiệp vụ.

```
main.py:
  Camera → AI Inference → ROI Checker → roi_result_queue
  
logic processor:
  roi_result_queue → Logic Processor → logic_output_queue → Output Handler
```

---

## 🎯 Cách 1: Chạy tích hợp với main.py

### Sử dụng `main_with_logic.py` (đã có Logic Processor tích hợp sẵn)

```bash
cd D:\WORK\ROI_LOGIC_version2\detectObject

# Chạy đầy đủ với Logic Processor
python main_with_logic.py

# Tắt visualization (chỉ xem log)
python main_with_logic.py --no-video

# Tắt Logic Processor (chỉ chạy detection)
python main_with_logic.py --no-logic

# Tùy chỉnh FPS
python main_with_logic.py --fps 2.0
```

### Kiến trúc:
```
┌─────────────────────────────────────────────────────────┐
│                    main_with_logic.py                   │
│                                                         │
│  Camera Workers → AI Inference → ROI Checker            │
│                          ↓                              │
│                   roi_result_queue (Queue 1)            │
│                          ↓                              │
│                   Logic Processor                       │
│                          ↓                              │
│                   logic_output_queue (Queue 2)          │
│                          ↓                              │
│                   Output Handler                        │
│                   (API/DB/Notification)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Cách 2: Chạy Logic Processor độc lập (để test)

### Simulation Mode

```bash
cd D:\WORK\ROI_LOGIC_version2\logic

# Chạy với test events simulation
python standalone_with_main.py
```

**Chức năng:**
- Tự tạo test events giống ROI Checker output
- Xem Logic Processor hoạt động như thế nào
- Không cần chạy `main.py`

---

## 📊 Output Format

### Input (từ ROI Checker - roi_result_queue):
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

### Output (từ Logic Processor - logic_output_queue):

**Pairs Logic (3 điểm):**
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

**Dual Logic (4 điểm):**
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
    "trigger_count": 1
}
```

---

## ⚙️ Configuration

### 1. `config.json` - Logic Configuration

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

**Giải thích:**
- `points`: Mapping `qr_code` ↔ `(camera_id, slot_id)`
- `rules`: Danh sách các logic rules
- `stability_time_sec`: Thời gian ổn định tối thiểu (giây)

### 2. Hash Tables Usage

Logic Processor sử dụng 4 Hash Tables để xác định stability:

1. **key_to_qr_map**: `(camera_id, slot_id) → qr_code`
   - Tra cứu qr_code từ thông tin ROI
   
2. **qr_to_key_map**: `qr_code → (camera_id, slot_id)`
   - Tra cứu ngược lại
   
3. **trigger_map**: `qr_code → [List Logic Rules]`
   - Biết qr_code nào trigger rule nào (tối ưu O(1))
   
4. **state_tracker**: `qr_code → state` (Single Source of Truth)
   - Lưu trạng thái hiện tại: `object_type`, `confidence`, `stable_since`
   - Dùng để tính stability duration

---

## 🔧 Customize Output Handler

Trong `main_with_logic.py`, sửa method `_output_handler_worker`:

```python
def _output_handler_worker(self, output_queue: Queue):
    """Xử lý output từ Logic Processor"""
    while True:
        output = output_queue.get(timeout=1.0)
        
        # XỬ LÝ NGHIỆP VỤ CỦA BẠN Ở ĐÂY:
        
        # 1. Gửi API request
        if output['rule_type'] == 'Pairs':
            api_url = "http://your-api.com/trigger"
            requests.post(api_url, json=output)
        
        # 2. Lưu vào database
        db.insert("logic_triggers", output)
        
        # 3. Gửi notification
        send_email(f"Trigger: {output['rule_name']}")
        
        # 4. Log
        logger.info(f"Logic trigger: {output}")
```

---

## 🐛 Troubleshooting

### Issue 1: Logic không trigger

**Kiểm tra:**
1. `config.json` có đúng mapping không?
   ```python
   # qr_code "000" phải map đến (camera_id, slot_id) đúng
   "000": { "camera_id": "cam-1", "slot_id": 1 }
   ```

2. ROI Checker có gửi đúng `slot_id` không?
   - Log: xem `camera_id` và `slot_id` trong events

3. `stability_time_sec` có quá cao không?
   - Thử giảm xuống (ví dụ: 2 giây để test)

### Issue 2: "Config file không tồn tại"

```bash
# Đảm bảo đang ở đúng thư mục
cd D:\WORK\ROI_LOGIC_version2\logic

# Kiểm tra file tồn tại
dir config.json
```

### Issue 3: Import error

```bash
# Đảm bảo cấu trúc thư mục đúng
ROI_LOGIC_version2/
├── detectObject/
│   └── main_with_logic.py
└── logic/
    ├── __init__.py
    ├── config.json
    └── ...
```

---

## 📊 Monitoring

### Xem statistics

Logic Processor tự động in stats mỗi 60 giây:

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

---

## 🚀 Quick Start

### Test ngay (không cần main.py):
```bash
cd D:\WORK\ROI_LOGIC_version2\logic
python standalone_with_main.py
```

### Production (tích hợp với main.py):
```bash
cd D:\WORK\ROI_LOGIC_version2\detectObject
python main_with_logic.py
```

---

## 📚 Tài liệu liên quan

- `README.md` - Overview và API reference
- `ARCHITECTURE.md` - Kiến trúc chi tiết
- `FILE_STRUCTURE.md` - Cấu trúc files

---

## 💡 Tips

1. **Test logic trước**: Dùng `standalone_with_main.py` để test rules
2. **Adjust stability time**: Bắt đầu với giá trị nhỏ (2-5s) để test
3. **Monitor logs**: Xem console output để debug
4. **Check Hash Tables**: Đảm bảo mapping đúng trong `config.json`

