# ROI Logic System - Tổng Quan Hệ Thống

## Giới Thiệu

**ROI Logic System** là hệ thống tự động phát hiện và xử lý kệ hàng (shelf) trong kho, sử dụng AI camera để:
- Phát hiện kệ hàng trong các vùng ROI (Region of Interest)
- Theo dõi trạng thái slot (shelf/empty) real-time
- Phát hiện cặp slot ổn định (start có shelf + end empty)
- Tự động gửi lệnh di chuyển kệ đến robot
- Quản lý block/unlock ROI để tránh xung đột

## Kiến Trúc Tổng Thể

```
┌────────────────────────────────────────────────────────────────────┐
│                        ROI Logic System                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐                                                 │
│  │  RTSP Camera │                                                 │
│  │  Streams     │                                                 │
│  └──────┬───────┘                                                 │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────────────────────────────────────┐          │
│  │         AI Inference (detectObject)                 │          │
│  │  - YOLOv11 detection                                │          │
│  │  - Real-time frame processing                       │          │
│  │  - Publish: raw_detection queue                     │          │
│  └─────────────────┬───────────────────────────────────┘          │
│                    │                                               │
│                    ▼                                               │
│  ┌─────────────────────────────────────────────────────┐          │
│  │         ROI Tool (Interactive)                      │          │
│  │  - Draw ROI on camera frames                        │          │
│  │  - Publish: roi_config queue                        │          │
│  │  - Export: slot_pairing_config.json                 │          │
│  └──────────────────────────────┬──────────────────────┘          │
│                                  │                                 │
│         ┌────────────────────────┴─────────────┐                  │
│         ▼                                      ▼                  │
│  ┌─────────────────────────────────────────────────────┐          │
│  │         ROI Processor (Core Logic)                  │          │
│  │                                                     │          │
│  │  1. Subscribe roi_config, raw_detection            │          │
│  │  2. Filter detections by ROI                       │          │
│  │  3. Add "empty" for slots without shelf            │          │
│  │  4. Block/unlock ROI slots                         │          │
│  │  5. Monitor end slots for unlock conditions        │          │
│  │  6. Publish: roi_detection queue                   │          │
│  │                                                     │          │
│  │  Components:                                        │          │
│  │    - ROI filter engine                              │          │
│  │    - Block/unlock manager                           │          │
│  │    - End slot monitoring system                     │          │
│  │    - Video display integration                      │          │
│  └─────────────────┬───────────────────────────────────┘          │
│                    │                                               │
│                    ▼                                               │
│  ┌─────────────────────────────────────────────────────┐          │
│  │         Stable Pair Processor                       │          │
│  │                                                     │          │
│  │  1. Subscribe roi_detection queue                  │          │
│  │  2. Track slot states (shelf/empty)                │          │
│  │  3. Detect stable pairs:                           │          │
│  │     - Start slot: shelf stable 20s                 │          │
│  │     - End slot: empty stable 20s                   │          │
│  │  4. Deduplication (minute-based + cooldown)        │          │
│  │  5. Publish: stable_pairs queue                    │          │
│  └─────────────────┬───────────────────────────────────┘          │
│                    │                                               │
│         ┌──────────┴────────────┐                                 │
│         ▼                       ▼                                 │
│  ┌─────────────┐      ┌──────────────────────┐                   │
│  │ Post API    │      │  ROI Processor       │                   │
│  │             │      │  (Block/Monitor)     │                   │
│  │ - Get next  │      │                      │                   │
│  │   order ID  │      │  - Block start slot  │                   │
│  │ - Build     │      │  - Monitor end slot  │                   │
│  │   payload   │      │  - Unlock when shelf │                   │
│  │ - POST API  │      │    stable 20s        │                   │
│  └─────┬───────┘      └──────────────────────┘                   │
│        │                                                           │
│        ▼                                                           │
│  ┌─────────────────────────────────────────────────────┐          │
│  │         Robot Control API                           │          │
│  │  - Receive task order                               │          │
│  │  - Execute: Move shelf from start to end            │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                    │
│  ┌─────────────────────────────────────────────────────┐          │
│  │         Optimized ROI Visualizer                    │          │
│  │  - Multi-threaded display                           │          │
│  │  - FPS control, caching                             │          │
│  │  - Real-time ROI + detection overlay               │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

                    Central Data Store
        ┌──────────────────────────────────────┐
        │      SQLite Queue Database           │
        │      (queues.db)                     │
        │                                      │
        │  Topics:                             │
        │    - roi_config                      │
        │    - raw_detection                   │
        │    - roi_detection                   │
        │    - stable_pairs                    │
        └──────────────────────────────────────┘
```

## Các Module Chính

### 1. ROI Tool (`roi_tool.py`)
**Chức năng:** Công cụ vẽ ROI interactive

**Đặc điểm:**
- GUI vẽ ROI bằng chuột
- Hỗ trợ RTSP camera và video file
- Lưu vào queue và JSON config
- Undo/Reset/Save

**Input:** RTSP stream hoặc video file

**Output:**
- Queue `roi_config` với ROI coordinates
- File `slot_pairing_config.json`

**Tài liệu:** [README_roi_tool.md](README_roi_tool.md)

---

### 2. ROI Processor (`roi_processor.py`)
**Chức năng:** Bộ xử lý ROI chính - Core logic của hệ thống

**Đặc điểm:**
- Filter detections theo ROI
- Quản lý block/unlock slots
- Monitor end slots để unlock start slots
- Tích hợp video display

**Input Queues:**
- `roi_config`: ROI configuration
- `raw_detection`: AI detections
- `stable_pairs`: Stable pair notifications

**Output Queue:**
- `roi_detection`: Filtered detections với slot_number

**Tài liệu:** [README_roi_processor.md](README_roi_processor.md)

---

### 3. Optimized ROI Visualizer (`optimized_roi_visualizer.py`)
**Chức năng:** Hiển thị video real-time với ROI overlay

**Đặc điểm:**
- Multi-threading per camera
- ROI overlay caching
- FPS control (giảm CPU 70%)
- Connection retry với exponential backoff

**Architecture:**
- `ROIVisualizer`: Drawing engine
- `CameraDisplayThread`: Per-camera thread
- `VideoDisplayManager`: Thread manager

**Tài liệu:** [README_optimized_roi_visualizer.md](README_optimized_roi_visualizer.md)

---

### 4. Stable Pair Processor (`stable_pair_processor.py`)
**Chức năng:** Phát hiện cặp slot ổn định

**Đặc điểm:**
- Track slot state (shelf/empty)
- Detect stable pairs (20s threshold)
- Minute-based deduplication
- Cooldown mechanism

**Logic:**
```
Start slot: shelf stable ≥20s
    +
End slot: empty stable ≥20s
    ↓
Publish stable_pairs
```

**Tài liệu:** [README_stable_pair_processor.md](README_stable_pair_processor.md)

---

### 5. Post API (`postAPI.py`)
**Chức năng:** Gửi task đến robot API

**Đặc điểm:**
- Monotonic order ID generation
- HTTP POST với retry (3x)
- Global order consumption
- Response validation

**Flow:**
```
stable_pairs → Get order ID → Build payload → POST API → Robot task
```

**Tài liệu:** [README_postAPI.md](README_postAPI.md)

---

## Data Flow Tổng Thể

### Phase 1: Setup & Configuration

```
1. Chạy roi_tool để vẽ ROI
   ↓
2. ROI config được lưu vào queue
   ↓
3. ROI processor load ROI config
```

### Phase 2: Real-time Detection

```
Camera → AI Inference → raw_detection queue
                              ↓
                       ROI Processor
                              ↓
                       Filter by ROI
                              ↓
                    Add slot_number + empty
                              ↓
                    roi_detection queue
```

### Phase 3: Pair Detection

```
roi_detection queue → Stable Pair Processor
                              ↓
                    Track slot states
                              ↓
            Start shelf stable 20s + End empty stable 20s?
                              ↓
                    stable_pairs queue
```

### Phase 4: Action Execution

```
stable_pairs queue
        ↓
    ┌───┴───┐
    ▼       ▼
Post API    ROI Processor
    │           │
    │           ├─ Block start slot
    │           └─ Monitor end slot
    │
    └─> Robot API → Move shelf
                        ↓
                End slot: shelf stable 20s
                        ↓
                Unlock start slot
```

## Queue Schema

### roi_config
```json
{
  "camera_id": "cam-1",
  "timestamp": "2025-01-01T00:00:00Z",
  "slots": [
    {
      "slot_id": "slot-1",
      "points": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    }
  ],
  "image_wh": [1920, 1080]
}
```

### raw_detection
```json
{
  "camera_id": "cam-1",
  "frame_id": 123,
  "timestamp": "2025-01-01T00:00:00.123Z",
  "detections": [
    {
      "class_name": "shelf",
      "confidence": 0.95,
      "bbox": {"x1": 100, "y1": 200, "x2": 300, "y2": 400},
      "center": {"x": 200, "y": 300}
    }
  ]
}
```

### roi_detection
```json
{
  "camera_id": "cam-1",
  "frame_id": 123,
  "roi_detections": [
    {
      "class_name": "shelf",
      "slot_number": 1,
      "confidence": 0.95,
      "bbox": {...},
      "center": {...}
    },
    {
      "class_name": "empty",
      "slot_number": 2,
      "confidence": 1.0,
      "bbox": {...},
      "center": {...}
    }
  ]
}
```

### stable_pairs
```json
{
  "pair_id": "101 -> 201",
  "start_slot": "101",
  "end_slot": "201",
  "stable_since": "2025-01-01T10:00:15Z"
}
```

## Configuration Files

### slot_pairing_config.json
```json
{
  "starts": [
    {
      "qr_code": 101,
      "camera_id": "cam-1",
      "slot_number": 1
    }
  ],
  "ends": [
    {
      "qr_code": 201,
      "camera_id": "cam-2",
      "slot_number": 1
    }
  ],
  "pairs": [
    {
      "start_qr": 101,
      "end_qrs": 201
    }
  ],
  "roi_coordinates": [
    {
      "slot_number": 1,
      "camera_id": "cam-1",
      "points": [[100, 200], [300, 200], [300, 400], [100, 400]]
    }
  ]
}
```

### cam_config.json
```json
{
  "cam_urls": [
    ["cam-1", "rtsp://192.168.1.100:554/stream"],
    ["cam-2", "rtsp://192.168.1.101:554/stream"]
  ]
}
```

### visualizer_config.json
```json
{
  "target_fps": 10,
  "max_display_resolution": 1280,
  "buffer_size": 1,
  "max_retry_attempts": 5
}
```

## Deployment Workflow

### 1. Setup Môi Trường

```bash
# Clone repository
git clone <repo-url>
cd ROI_LOGIC

# Tạo virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc
venv\Scripts\activate  # Windows

# Cài đặt dependencies
pip install -r requirements.txt
```

### 2. Cấu Hình Camera

```bash
# Tạo camera config
vim logic/cam_config.json

# Test RTSP streams
ffplay rtsp://192.168.1.100:554/stream
```

### 3. Vẽ ROI

```bash
# List cameras
python roi_tool.py --list-cameras

# Draw ROI cho camera 1
python roi_tool.py --camera-id cam-1 --save-coords

# Draw ROI cho camera 2
python roi_tool.py --camera-id cam-2 --save-coords
```

### 4. Cấu Hình Slot Pairing

```bash
# Edit pairing config
vim logic/slot_pairing_config.json

# Add starts, ends, pairs
```

### 5. Chạy Các Module

**Terminal 1: AI Inference**
```bash
cd detectObject
python main.py
```

**Terminal 2: ROI Processor**
```bash
python roi_processor.py
```

**Terminal 3: Stable Pair Processor**
```bash
cd logic
python stable_pair_processor.py
```

**Terminal 4: Post API**
```bash
cd postRq
python postAPI.py
```

### 6. Monitoring

```bash
# Check queue database
sqlite3 queues.db "SELECT topic, key, COUNT(*) FROM messages GROUP BY topic, key"

# Check logs
tail -f logs/logs_post_request/log_post_request_*.log

# Check order ID
cat postRq/order_id.txt
```

## Production Deployment

### Systemd Services

**roi-processor.service**
```ini
[Unit]
Description=ROI Processor
After=network.target

[Service]
Type=simple
User=robot
WorkingDirectory=/opt/ROI_LOGIC
ExecStart=/opt/ROI_LOGIC/venv/bin/python roi_processor.py --no-video
Restart=always

[Install]
WantedBy=multi-user.target
```

**stable-pair-processor.service**
```ini
[Unit]
Description=Stable Pair Processor
After=network.target

[Service]
Type=simple
User=robot
WorkingDirectory=/opt/ROI_LOGIC/logic
ExecStart=/opt/ROI_LOGIC/venv/bin/python stable_pair_processor.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**post-api.service**
```ini
[Unit]
Description=Post API Runner
After=network.target

[Service]
Type=simple
User=robot
WorkingDirectory=/opt/ROI_LOGIC
ExecStart=/opt/ROI_LOGIC/venv/bin/python postRq/postAPI.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**Start all services:**
```bash
sudo systemctl enable roi-processor stable-pair-processor post-api
sudo systemctl start roi-processor stable-pair-processor post-api
```

## Troubleshooting

### Issue: Hệ thống không hoạt động

**Checklist:**
1. ✓ AI inference đang chạy? → Check detectObject/main.py
2. ✓ Camera streams OK? → Test với ffplay
3. ✓ ROI config đã load? → Check queues.db
4. ✓ Slot pairing config đúng? → Check slot_pairing_config.json
5. ✓ Tất cả modules đang chạy? → Check process list

### Issue: Không detect stable pairs

**Debug Steps:**
```bash
# 1. Check roi_detection queue
sqlite3 queues.db "SELECT COUNT(*) FROM messages WHERE topic='roi_detection'"

# 2. Check slot states in stable_pair_processor
# Add print statements in _update_slot_state()

# 3. Verify pairing config
cat logic/slot_pairing_config.json | jq '.pairs'
```

### Issue: Robot không nhận task

**Debug Steps:**
```bash
# 1. Check stable_pairs published
sqlite3 queues.db "SELECT * FROM messages WHERE topic='stable_pairs' ORDER BY id DESC LIMIT 5"

# 2. Check Post API logs
tail -f logs/logs_post_request/*.log

# 3. Test API directly
curl -X POST http://192.168.1.169:7000/ics/taskOrder/addTask \
  -H "Content-Type: application/json" \
  -d '{"modelProcessCode":"checking_camera_work","fromSystem":"ICS","orderId":"99999","taskOrderDetail":[{"taskPath":"101,201"}]}'
```

## Performance Tuning

### CPU Optimization

**Visualizer:**
```json
// visualizer_config.json
{
  "target_fps": 5,              // Lower = less CPU
  "max_display_resolution": 960  // Lower = less CPU
}
```

**Polling intervals:**
```python
# roi_processor.py
time.sleep(0.2)  # Increase for less frequent checks

# stable_pair_processor.py  
time.sleep(0.5)  # Increase for less CPU

# postAPI.py
time.sleep(1.0)  # Increase for less API load
```

### Memory Optimization

**Database cleanup:**
```bash
# Archive old messages
sqlite3 queues.db "DELETE FROM messages WHERE created_at < datetime('now', '-7 days')"

# Vacuum database
sqlite3 queues.db "VACUUM"
```

**Cache cleanup:**
```python
# In roi_processor.py
# Periodic cleanup of published_by_minute
```

## Best Practices

1. **Always backup database before changes**
   ```bash
   cp queues.db queues.db.backup.$(date +%Y%m%d)
   ```

2. **Version control configuration**
   ```bash
   git add logic/slot_pairing_config.json logic/cam_config.json
   git commit -m "Update slot pairing config"
   ```

3. **Monitor system health**
   ```bash
   # Check process status
   ps aux | grep -E 'roi_processor|stable_pair|postAPI'
   
   # Check queue size
   sqlite3 queues.db "SELECT COUNT(*) FROM messages"
   ```

4. **Graceful restarts**
   ```bash
   # Stop services gracefully
   sudo systemctl stop roi-processor
   # Wait for current tasks to finish
   sleep 5
   # Restart
   sudo systemctl start roi-processor
   ```

## Tài Liệu Chi Tiết

- [ROI Tool](README_roi_tool.md) - Vẽ và cấu hình ROI
- [ROI Processor](README_roi_processor.md) - Xử lý ROI và block/unlock
- [Optimized ROI Visualizer](README_optimized_roi_visualizer.md) - Hiển thị video real-time
- [Stable Pair Processor](README_stable_pair_processor.md) - Phát hiện cặp slot ổn định
- [Post API](README_postAPI.md) - Gửi task đến robot

## Changelog

### v1.0 (Current)
- ✓ ROI filtering với slot_number
- ✓ Block/unlock mechanism
- ✓ End slot monitoring để unlock
- ✓ Stable pair detection với deduplication
- ✓ API integration với retry
- ✓ Multi-threaded video display

### Planned Features
- [ ] Web dashboard cho monitoring
- [ ] Metrics export (Prometheus)
- [ ] Alert system (email/SMS)
- [ ] Config hot-reload
- [ ] Multi-API support (failover)

## Liên Hệ & Hỗ Trợ

- **Issues:** Tạo issue trên GitHub repository
- **Documentation:** Xem các README chi tiết trong thư mục `docs/`
- **Logs:** Check trong `logs/` và `logs/logs_post_request/`

