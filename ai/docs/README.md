# ROI Logic System - Tài Liệu Hệ Thống

## Chào Mừng

Đây là tài liệu đầy đủ cho **ROI Logic System** - hệ thống tự động phát hiện và xử lý kệ hàng trong kho sử dụng AI camera và robot.

## 📚 Tài Liệu Theo Module

### 🎯 [Tổng Quan Hệ Thống](README_SYSTEM_OVERVIEW.md)
**Bắt đầu từ đây!** Hiểu tổng thể kiến trúc và data flow của toàn hệ thống.

**Nội dung:**
- Kiến trúc tổng thể
- Data flow giữa các module
- Queue schema
- Deployment workflow
- Troubleshooting tổng quát
- Best practices

---

### 🖼️ [ROI Tool](README_roi_tool.md)
Công cụ interactive để vẽ và cấu hình ROI.

**Nội dung:**
- Interactive GUI drawing
- Multi-source support (RTSP, video file)
- Configuration management
- Command line usage
- Best practices cho việc vẽ ROI

**Use case:** Setup ban đầu, thêm/sửa ROI cho camera mới

---

### ⚙️ [ROI Processor](README_roi_processor.md)
Module cốt lõi - xử lý ROI và quản lý block/unlock.

**Nội dung:**
- ROI filtering engine
- Block/unlock mechanism
- End slot monitoring system
- Video display integration
- Thread architecture
- Performance considerations

**Use case:** Luôn chạy trong production, là trung tâm của hệ thống

---

### 📺 [Optimized ROI Visualizer](README_optimized_roi_visualizer.md)
Hệ thống hiển thị video real-time với optimization.

**Nội dung:**
- Multi-threading architecture
- ROI caching mechanism
- FPS control
- Connection retry
- Performance benchmarks
- Optimization techniques

**Use case:** Monitoring real-time, debugging, demo

---

### 🔍 [Stable Pair Processor](README_stable_pair_processor.md)
Phát hiện cặp slot ổn định (start shelf + end empty).

**Nội dung:**
- Slot state tracking
- Stable pair detection logic
- Deduplication mechanisms
- Configuration examples
- Testing và debugging

**Use case:** Luôn chạy trong production, trigger cho robot tasks

---

### 📡 [Post API](README_postAPI.md)
Gửi task đến robot control API.

**Nội dung:**
- Order ID management
- HTTP POST với retry
- Response handling
- Logging và monitoring
- Production deployment
- Advanced patterns (batch, DLQ, priority)

**Use case:** Luôn chạy trong production, kết nối với robot system

---

## 🚀 Quick Start

### 1. Setup Lần Đầu

```bash
# Clone và setup
git clone <repo>
cd ROI_LOGIC
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Cấu hình camera
vim logic/cam_config.json

# Vẽ ROI
python roi_tool.py --camera-id cam-1 --save-coords
python roi_tool.py --camera-id cam-2 --save-coords

# Cấu hình pairing
vim logic/slot_pairing_config.json
```

### 2. Chạy Hệ Thống

```bash
# Terminal 1: AI Inference (nếu cần)
cd detectObject
python main.py

# Terminal 2: ROI Processor
python roi_processor.py

# Terminal 3: Stable Pair Processor
cd logic
python stable_pair_processor.py

# Terminal 4: Post API
cd postRq
python postAPI.py
```

### 3. Monitoring

```bash
# Check queues
sqlite3 queues.db "SELECT topic, COUNT(*) FROM messages GROUP BY topic"

# Check logs
tail -f logs/logs_post_request/*.log
```

## 📖 Đọc Tài Liệu Theo Use Case

### 🆕 Tôi là người mới, chưa biết gì về hệ thống
1. Đọc [Tổng Quan Hệ Thống](README_SYSTEM_OVERVIEW.md)
2. Xem phần "Kiến Trúc Tổng Thể" và "Data Flow"
3. Đọc "Quick Start" để chạy thử

### 🎨 Tôi cần setup camera mới và vẽ ROI
1. Đọc [ROI Tool](README_roi_tool.md)
2. Xem phần "Interactive GUI Guide"
3. Follow "Workflow" và "Best Practices"

### 🔧 Tôi cần hiểu logic xử lý ROI
1. Đọc [ROI Processor](README_roi_processor.md)
2. Xem "ROI Filtering System"
3. Xem "Block/Unlock Mechanism"

### 👀 Tôi muốn hiển thị video real-time
1. Đọc [Optimized ROI Visualizer](README_optimized_roi_visualizer.md)
2. Xem "Configuration" để tune performance
3. Xem "Troubleshooting" nếu có issues

### 🤖 Tôi cần hiểu cách phát hiện stable pairs
1. Đọc [Stable Pair Processor](README_stable_pair_processor.md)
2. Xem "Pair Evaluation" logic
3. Xem "Configuration Examples"

### 📡 Tôi cần tích hợp với robot API
1. Đọc [Post API](README_postAPI.md)
2. Xem "API Payload" format
3. Xem "Retry Mechanism" và "Error Handling"

### 🐛 Hệ thống không hoạt động, cần debug
1. Đọc [Tổng Quan](README_SYSTEM_OVERVIEW.md) → "Troubleshooting"
2. Đọc README của module có vấn đề
3. Check logs và queue database

### 🚀 Deploy lên production
1. Đọc [Tổng Quan](README_SYSTEM_OVERVIEW.md) → "Production Deployment"
2. Đọc "Best Practices" ở mỗi module
3. Setup monitoring và logging

## 🗺️ Sơ Đồ Đọc Tài Liệu

```
Bắt đầu
    │
    ▼
┌─────────────────────────┐
│  SYSTEM OVERVIEW        │ ◄─── Đọc đầu tiên!
│  (Tổng quan hệ thống)   │
└───────┬─────────────────┘
        │
        ├─────────────────────────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────┐                    ┌──────────────┐
│  Setup Phase  │                    │  Runtime     │
└───────┬───────┘                    └──────┬───────┘
        │                                   │
        ▼                                   ▼
┌───────────────┐                    ┌──────────────────┐
│  ROI TOOL     │                    │  ROI PROCESSOR   │
│  (Vẽ ROI)     │                    │  (Core logic)    │
└───────────────┘                    └──────────────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │  STABLE PAIR     │
                                     │  PROCESSOR       │
                                     │  (Detect pairs)  │
                                     └────────┬─────────┘
                                              │
                                              ▼
        ┌─────────────────────────────────────┼────────────────┐
        │                                     │                │
        ▼                                     ▼                ▼
┌───────────────┐                    ┌──────────────┐  ┌──────────────┐
│  POST API     │                    │  ROI         │  │  OPTIMIZED   │
│  (Send task)  │                    │  PROCESSOR   │  │  VISUALIZER  │
└───────────────┘                    │  (Block/     │  │  (Display)   │
                                     │   unlock)    │  └──────────────┘
                                     └──────────────┘
```

## 📊 Thống Kê Tài Liệu

| File | Dòng | Nội dung | Độ phức tạp |
|------|------|----------|-------------|
| README_SYSTEM_OVERVIEW.md | ~700 | Tổng quan toàn hệ thống | ⭐ |
| README_roi_tool.md | ~650 | ROI drawing tool | ⭐⭐ |
| README_roi_processor.md | ~750 | Core processing logic | ⭐⭐⭐⭐⭐ |
| README_optimized_roi_visualizer.md | ~700 | Video display system | ⭐⭐⭐⭐ |
| README_stable_pair_processor.md | ~700 | Pair detection logic | ⭐⭐⭐⭐ |
| README_postAPI.md | ~700 | API integration | ⭐⭐⭐ |

**Tổng:** ~4,200 dòng documentation

## 🔗 Tham Chiếu Nhanh

### Queue Topics
- `roi_config` - ROI configuration
- `raw_detection` - AI detections (input)
- `roi_detection` - Filtered detections (intermediate)
- `stable_pairs` - Stable pair events (output)

### Config Files
- `logic/cam_config.json` - Camera RTSP URLs
- `logic/slot_pairing_config.json` - Slot pairing rules
- `visualizer_config.json` - Display settings
- `postRq/order_id.txt` - Order ID counter

### Key Concepts
- **ROI (Region of Interest):** Vùng quan tâm trên camera
- **Slot:** Một ROI được đánh số
- **Stable:** Trạng thái không đổi trong ≥20s
- **Pair:** Cặp start-end slots
- **Block/Unlock:** Cơ chế khóa/mở slot để tránh xung đột

## 💡 Tips & Tricks

### Performance
- Giảm `target_fps` trong visualizer_config.json để giảm CPU
- Tăng polling interval (sleep time) để giảm database load
- Sử dụng `--no-video` flag khi chạy trên server

### Debugging
- Check queues: `sqlite3 queues.db`
- Enable verbose logging trong code
- Use print statements để track state changes

### Production
- Luôn chạy với systemd services
- Backup database định kỳ
- Monitor logs và metrics
- Setup alerting cho failures

## 🆘 Hỗ Trợ

### Thứ tự debug khi có lỗi:
1. Check logs trong `logs/` folder
2. Check queue database: `sqlite3 queues.db`
3. Đọc "Troubleshooting" trong README tương ứng
4. Check system resources (CPU, memory, disk)
5. Verify configuration files

### Common Issues
- **Camera không kết nối:** Check RTSP URL và network
- **Không detect pairs:** Verify slot_pairing_config.json
- **API errors:** Check API endpoint và payload format
- **High CPU:** Reduce FPS và resolution

## 📝 Ghi Chú

### Version
- **Current:** v1.0
- **Last updated:** 2025-01-09
- **Python:** 3.10+
- **Platform:** Windows/Linux

### Dependencies
- OpenCV (cv2)
- NumPy
- Requests
- SQLite3
- Threading/Multiprocessing

## 🎯 Roadmap

### Completed
- ✅ ROI filtering với slot_number
- ✅ Block/unlock mechanism
- ✅ End slot monitoring
- ✅ Stable pair detection
- ✅ API integration
- ✅ Multi-threaded display

### In Progress
- 🔄 Web dashboard
- 🔄 Metrics export

### Planned
- 📋 Alert system
- 📋 Config hot-reload
- 📋 Multi-API failover

## 📄 License

Copyright © 2025 - ROI Logic System

---

**Happy Reading! 🚀**

Nếu có câu hỏi hoặc cần hỗ trợ, vui lòng tham khảo các README chi tiết hoặc tạo issue.

