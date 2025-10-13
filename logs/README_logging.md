# Hệ Thống Logging ROI Logic

## Tổng quan

Đã tích hợp hệ thống logging hoàn chỉnh vào 3 components chính của ROI Logic system:

## Cấu trúc Log Files

```
logs/
├── roi_processor.log          # Log từ ROI Processor
├── stable_pair_processor.log  # Log từ Stable Pair Processor  
├── post_api.log              # Log từ Post API
└── README_logging.md         # File này
```

## Features

### 1. **Rotating Log Files**
- **Max size**: 10MB per file
- **Backup count**: 5 files
- **Auto cleanup**: Tự động xóa log files cũ

### 2. **Log Format**
```
2025-01-15 10:30:45 - logger_name - INFO - [method_name:line_number] - message
```

### 3. **Log Levels**
- **INFO**: Thông tin hoạt động bình thường
- **WARNING**: Cảnh báo
- **ERROR**: Lỗi

## Log Content

### roi_processor.log
- ✅ Khởi tạo system
- ✅ Load QR mapping
- ✅ Block/Unblock ROI operations
- ✅ Subscribe stable_pairs events  
- ✅ End slot monitoring
- ✅ System start/stop events

### stable_pair_processor.log
- ✅ Load pairing configuration
- ✅ Dual pair detection
- ✅ Block/Unblock dual operations
- ✅ End state monitoring
- ✅ Stable pair publishing

### post_api.log
- ✅ API request attempts
- ✅ HTTP responses (success/failure)
- ✅ Retry logic
- ✅ Order ID generation
- ✅ Queue processing

## Usage

### Xem Log Real-time
```bash
# Xem tất cả logs
tail -f logs/*.log

# Xem log specific
tail -f logs/roi_processor.log
```

### Filter Log by Level
```bash
# Chỉ xem ERROR
grep "ERROR" logs/*.log

# Chỉ xem WARNING và ERROR
grep -E "(WARNING|ERROR)" logs/*.log
```

## Log Rotation

Log files sẽ tự động rotate khi đạt 10MB:
- `roi_processor.log` → `roi_processor.log.1`
- `roi_processor.log.1` → `roi_processor.log.2`
- ... (tối đa 5 backup files)

## Configuration

Có thể thay đổi log settings trong các setup functions:

```python
# Thay đổi log level
logger.setLevel(logging.DEBUG)

# Thay đổi max file size  
maxBytes=20*1024*1024  # 20MB

# Thay đổi số backup files
backupCount=10
```

## Monitoring

Để monitor system health, có thể:

1. **Check log file sizes**
2. **Monitor ERROR/WARNING frequency**
3. **Setup log aggregation tools** (ELK Stack, etc.)
4. **Create alerts** based on error patterns

## Best Practices

1. **Regular cleanup**: Kiểm tra disk space định kỳ
2. **Log analysis**: Phân tích pattern để optimize system  
3. **Error monitoring**: Setup alerts cho critical errors
4. **Performance tracking**: Monitor processing times từ logs
