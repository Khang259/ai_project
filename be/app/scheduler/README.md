# AGV Scheduler - Hướng dẫn sử dụng

## Mô tả

Module scheduler này tự động chạy các tác vụ định kỳ cho hệ thống AGV Dashboard. Hiện tại, scheduler được cấu hình để tự động chạy hàm `reverse_dashboard_data()` vào **11h tối (23:00)** hàng ngày.

## Cài đặt

1. **Cài đặt thư viện cần thiết:**
```bash
cd be/app
pip install -r requirements.txt
```

Scheduler sử dụng thư viện `APScheduler==3.10.4` đã được thêm vào `requirements.txt`.

## Cách hoạt động

### 1. Scheduled Jobs hiện tại

- **Job: Reverse Dashboard Data Daily**
  - **Thời gian chạy:** 23:00 (11h tối) hàng ngày
  - **Chức năng:** Tính toán và lưu thống kê theo ngày của tất cả AGV vào database
  - **Job ID:** `reverse_dashboard_daily`
  - **Misfire grace time:** 3600 giây (1 giờ) - cho phép job chạy trong vòng 1 giờ nếu bị miss

### 2. Tự động khởi động

Scheduler tự động khởi động khi FastAPI application start và tự động dừng khi application shutdown.

```python
# Trong be/app/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo(...)
    start_scheduler()  # Khởi động scheduler
    
    yield
    
    # Shutdown
    shutdown_scheduler()  # Dừng scheduler
    await close_mongo_connection()
```

## File cấu trúc

```
be/app/scheduler/
├── __init__.py           # Module initialization
├── agv_scheduler.py      # Định nghĩa các scheduled jobs
└── README.md            # File hướng dẫn này
```

## Thêm scheduled jobs mới

Để thêm một scheduled job mới, chỉnh sửa file `agv_scheduler.py`:

```python
def start_scheduler():
    # Thêm job mới
    scheduler.add_job(
        your_function,                    # Function cần chạy
        trigger=CronTrigger(hour=10, minute=30),  # Thời gian (10:30 AM)
        id='your_job_id',                 # ID duy nhất cho job
        name='Your Job Name',             # Tên mô tả
        replace_existing=True,
        misfire_grace_time=3600
    )
```

### Cú pháp CronTrigger

```python
# Chạy hàng ngày vào 23:00
CronTrigger(hour=23, minute=0)

# Chạy mỗi giờ
CronTrigger(minute=0)

# Chạy mỗi 30 phút
CronTrigger(minute='*/30')

# Chạy vào 8:00 AM từ thứ 2 đến thứ 6
CronTrigger(day_of_week='mon-fri', hour=8, minute=0)

# Chạy vào ngày 1 mỗi tháng lúc 00:00
CronTrigger(day=1, hour=0, minute=0)
```

## Logs

Scheduler sẽ ghi log vào file logs với các thông tin:
- Khi scheduler start/stop
- Khi job được scheduled
- Khi job chạy và kết quả
- Khi có lỗi xảy ra

```
[INFO] AGV Scheduler started successfully. Job scheduled at 23:00 daily.
[INFO] Starting scheduled reverse_dashboard_data task...
[INFO] Scheduled reverse_dashboard_data completed successfully: {...}
```

## Kiểm tra trạng thái

Khi application khởi động, bạn sẽ thấy logs như sau:

```
[INFO] Starting CameraAI Backend...
[INFO] Connected to MongoDB
[INFO] AGV Scheduler started successfully. Job scheduled at 23:00 daily.
[INFO] Scheduled job: Reverse Dashboard Data Daily at 11 PM - Next run: 2025-10-15 23:00:00
[INFO] AGV Scheduler started
```

## Troubleshooting

### Scheduler không chạy
- Kiểm tra xem `APScheduler` đã được cài đặt chưa
- Xem logs để kiểm tra có lỗi gì không
- Kiểm tra múi giờ của hệ thống

### Job bị miss
- Nếu server bị tắt vào thời điểm job scheduled, job sẽ không chạy
- Sử dụng `misfire_grace_time` để cho phép job chạy trong khoảng thời gian cho phép

### Chạy job thủ công
Bạn có thể gọi hàm trực tiếp từ API endpoint hoặc code:

```python
from app.services.agv_dashboard_service import reverse_dashboard_data

# Chạy thủ công
result = await reverse_dashboard_data()
```

## Tham khảo

- [APScheduler Documentation](https://apscheduler.readthedocs.io/)
- [CronTrigger Examples](https://apscheduler.readthedocs.io/en/stable/modules/triggers/cron.html)

