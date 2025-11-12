# Daily Cleanup System - ROI_LOGIC Project

Hệ thống tự động dọn dẹp logs, queues, kết quả nhận diện hàng ngày cho dự án ROI_LOGIC.

## 🎯 Mục đích

Dự án ROI_LOGIC sử dụng AI để quan sát thời gian thực và gửi lệnh POST cho robot. Trong quá trình hoạt động, hệ thống tạo ra:
- **Log files**: Logs của các module (roi_processor, yolo_detector, stable_pair_processor, etc.)
- **Queue data**: SQLite database chứa detection data, ROI config, stable pairs
- **Cache files**: Python cache (__pycache__), temporary files
- **Detection results**: Kết quả nhận diện được lưu trong database

Để tránh tích lũy dữ liệu và đảm bảo hiệu năng, hệ thống cần được dọn dẹp định kỳ.

## 🏗️ Kiến trúc

```
ROI_LOGIC/
├── daily_cleanup.py          # Core cleanup logic
├── cleanup_service.py        # Service wrapper & scheduler  
├── cleanup_config.json       # Cấu hình cleanup
├── test_cleanup.py          # Test script
└── README_CLEANUP.md        # Tài liệu này
```

### Các thành phần:

1. **ROILogicCleaner**: Class thực hiện cleanup logic
2. **CleanupService**: Service wrapper với scheduler  
3. **Config system**: Cấu hình linh hoạt qua JSON
4. **Integration**: Tích hợp vào ứng dụng chính

## 📋 Các thành phần được dọn dẹp

### 1. Log Files
```
logs/
├── roi_processor.log (và các backup .1, .2, ...)
├── stable_pair_processor.log  
├── daily_cleanup.log (được bảo tồn)
├── logs_post_request/
│   └── *.log
└── logs_errors/
    └── *.log

detectObject/logs/
└── *.log
```

### 2. Queue Database
```
logic/
└── queues.db (SQLite database chứa tất cả queue data)
```

### 3. Cache & Temp Files
```
__pycache__/         # Python bytecode cache
*/__pycache__/       # Cache ở mọi thư mục con
*.tmp, *.temp        # Temporary files  
*.pyc, *.pyo         # Compiled Python files
```

### 4. Files được bảo tồn
- `logs/daily_cleanup.log` - Log của cleanup system
- `logs/README_logging.md` - Tài liệu
- `requirements.txt`, `README.md` - Files quan trọng

## 🚀 Cách sử dụng

### 1. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### 2. Chạy cleanup thủ công

```bash
# Dry run (chỉ xem, không xoá)
python daily_cleanup.py --run-now --dry-run

# Chạy cleanup thực tế
python daily_cleanup.py --run-now

# Với scheduler (chạy hàng ngày vào 23:30)
python daily_cleanup.py --schedule
```

### 3. Sử dụng Cleanup Service

```bash
# Khởi động service
python cleanup_service.py --start

# Chạy cleanup thủ công
python cleanup_service.py --manual

# Dry run
python cleanup_service.py --manual --dry-run

# Xem trạng thái
python cleanup_service.py --status

# Tạo startup scripts
python cleanup_service.py --setup
```

### 4. Tích hợp vào ứng dụng chính

Cleanup service được tự động tích hợp vào `roi_processor.py`:

```bash
# Chạy với cleanup (mặc định)
python roi_processor.py

# Chạy mà không có cleanup
python roi_processor.py --no-cleanup
```

## ⚙️ Cấu hình

### File cấu hình: `cleanup_config.json`

```json
{
  "cleanup_schedule": {
    "enabled": true,
    "daily_time": "23:30"
  },
  "cleanup_targets": {
    "log_dirs": ["logs", "detectObject/logs"],
    "db_files": ["logic/queues.db", "queues.db"],
    "cache_dirs": ["__pycache__", "*/__pycache__"],
    "temp_patterns": ["*.tmp", "*.temp", "*.log.*"],
    "preserve_files": ["logs/daily_cleanup.log"]
  }
}
```

### Tuỳ chỉnh thời gian chạy:

```bash
# Chạy vào 2:00 AM thay vì 23:30
python cleanup_service.py --start --cleanup-time "02:00"
```

## 🧪 Test hệ thống

```bash
# Chạy test script
python test_cleanup.py
```

Test script sẽ:
1. Tạo môi trường test với files giả
2. Test chế độ dry-run  
3. Test cleanup thực tế (nếu user đồng ý)
4. Test cleanup service
5. Dọn dẹp môi trường test

## 📊 Monitoring & Logs

### Log cleanup được ghi vào:
- `logs/daily_cleanup.log` - Chi tiết quá trình cleanup
- Console output - Thông báo realtime

### Ví dụ log:
```
2024-01-15 23:30:00 - daily_cleanup - INFO - === BẮT ĐẦU DAILY CLEANUP (THỰC TẾ) ===
2024-01-15 23:30:00 - daily_cleanup - INFO - TỔNG CỘNG: 15 files, 2.34 MB sẽ bị xoá
2024-01-15 23:30:01 - daily_cleanup - INFO - XOÁ LOG FILE: logs/roi_processor.log - SUCCESS
2024-01-15 23:30:01 - daily_cleanup - INFO - XOÁ DATABASE: logic/queues.db - SUCCESS
2024-01-15 23:30:01 - daily_cleanup - INFO - === HOÀN THÀNH DAILY CLEANUP ===
```

##  Troubleshooting

### Cleanup không chạy tự động
1. Kiểm tra cleanup service có được khởi động không
2. Xem logs trong `logs/daily_cleanup.log`
3. Kiểm tra cấu hình trong `cleanup_config.json`

### Permission errors
```bash
# Windows: Chạy với quyền Administrator
# Linux: Kiểm tra quyền write vào thư mục

ls -la logs/
chmod 755 logs/
```

### Module not found
```bash
pip install -r requirements.txt
```

### Test cleanup không hoạt động
```bash
# Kiểm tra các dependencies
python -c "import schedule, sqlite3, pathlib"

# Chạy với verbose
python test_cleanup.py
```

## 🔄 Tích hợp vào production

### 1. Windows Service
Sử dụng `nssm` hoặc `sc` để tạo Windows Service:

```cmd
# Tạo startup script
python cleanup_service.py --setup

# Chạy start_cleanup_service.bat
```

### 2. Linux Systemd
Tạo file `/etc/systemd/system/roi-cleanup.service`:

```ini
[Unit]
Description=ROI Logic Cleanup Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ROI_LOGIC
ExecStart=/usr/bin/python3 cleanup_service.py --start
Restart=always

[Install]
WantedBy=multi-user.target
```

### 3. Cron Job (Linux/Mac)
```bash
# Thêm vào crontab
30 23 * * * cd /path/to/ROI_LOGIC && python daily_cleanup.py --run-now
```

## 📈 Performance Impact

- **Disk Space**: Giải phóng 10-100MB/ngày tuỳ vào hoạt động
- **CPU**: Minimal impact (<1% trong vài giây)
- **Memory**: <50MB RAM khi chạy cleanup
- **Downtime**: Không ảnh hưởng đến hoạt động chính

## 🔐 Security

- Cleanup chỉ xoá files trong project directory
- Danh sách preserve_files bảo vệ files quan trọng  
- Dry-run mode để preview trước khi xoá
- Logs đầy đủ để audit

## 📝 Changelog

- **v1.0**: Initial release với basic cleanup
- **v1.1**: Thêm scheduler và service wrapper
- **v1.2**: Tích hợp vào roi_processor.py
- **v1.3**: Thêm config system và test script

## 🤝 Contributing

Để thêm tính năng mới:
1. Cập nhật `cleanup_config.json` với targets mới
2. Chỉnh sửa `ROILogicCleaner` class
3. Thêm test cases vào `test_cleanup.py`
4. Cập nhật documentation

## 📞 Support

Nếu gặp vấn đề:
1. Xem logs trong `logs/daily_cleanup.log`
2. Chạy test script để debug
3. Kiểm tra config và permissions
4. Liên hệ team development
