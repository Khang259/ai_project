# Hướng dẫn sử dụng Reverse Dashboard Data

## Tổng quan

Hàm `reverse_dashboard_data` được thiết kế để tính toán và lưu thống kê theo ngày của tất cả AGV vào database. Hàm này tổng hợp cả **payload statistics** (có tải/không tải) và **work status** (InTask/Idle) cho từng robot theo ngày.

## Mục đích

- **Tính toán trước** thống kê theo ngày để tăng tốc độ query
- **Lưu trữ** dữ liệu đã được tổng hợp vào collection `agv_daily_statistics`
- **Hỗ trợ backfill** dữ liệu lịch sử cho nhiều ngày
- **Giảm tải** cho database khi cần truy vấn thống kê

## Collection đích: `agv_daily_statistics`

### Cấu trúc Document

```json
{
  "device_code": "AGV001",
  "device_name": "Robot A",
  "date": "2025-10-14",
  
  // Payload statistics - InTask
  "InTask_payLoad_0_0_count": 150,
  "InTask_payLoad_1_0_count": 200,
  "InTask_total_payload_records": 350,
  "InTask_payLoad_0_0_percentage": 42.86,
  "InTask_payLoad_1_0_percentage": 57.14,
  
  // Payload statistics - Idle
  "Idle_payLoad_0_0_count": 80,
  "Idle_payLoad_1_0_count": 20,
  "Idle_total_payload_records": 100,
  "Idle_payLoad_0_0_percentage": 80.0,
  "Idle_payLoad_1_0_percentage": 20.0,
  
  // Work status statistics
  "InTask_count": 350,
  "Idle_count": 100,
  "total_work_records": 450,
  "InTask_percentage": 77.78,
  "Idle_percentage": 22.22,
  
  // Metadata
  "calculated_at": "2025-10-14T10:30:00.000Z",
  "date_range": {
    "start": "2025-10-14T00:00:00.000Z",
    "end": "2025-10-15T00:00:00.000Z"
  }
}
```

### Trường dữ liệu

#### Thông tin cơ bản
- `device_code`: Mã thiết bị AGV
- `device_name`: Tên thiết bị AGV
- `date`: Ngày tính toán (format: YYYY-MM-DD)

#### Payload Statistics - InTask (Đang làm việc)
- `InTask_payLoad_0_0_count`: Số lần không tải khi đang làm việc
- `InTask_payLoad_1_0_count`: Số lần có tải khi đang làm việc
- `InTask_total_payload_records`: Tổng số bản ghi payload khi InTask
- `InTask_payLoad_0_0_percentage`: % không tải khi đang làm việc
- `InTask_payLoad_1_0_percentage`: % có tải khi đang làm việc

#### Payload Statistics - Idle (Nghỉ/Chờ)
- `Idle_payLoad_0_0_count`: Số lần không tải khi nghỉ
- `Idle_payLoad_1_0_count`: Số lần có tải khi nghỉ
- `Idle_total_payload_records`: Tổng số bản ghi payload khi Idle
- `Idle_payLoad_0_0_percentage`: % không tải khi nghỉ
- `Idle_payLoad_1_0_percentage`: % có tải khi nghỉ

#### Work Status Statistics
- `InTask_count`: Số lần ghi nhận trạng thái đang làm việc
- `Idle_count`: Số lần ghi nhận trạng thái nghỉ
- `total_work_records`: Tổng số bản ghi work status
- `InTask_percentage`: % thời gian làm việc
- `Idle_percentage`: % thời gian nghỉ

#### Metadata
- `calculated_at`: Thời điểm tính toán
- `date_range`: Khoảng thời gian dữ liệu nguồn

---

## API Endpoints

### 1. Tính toán cho 1 ngày cụ thể

#### Endpoint
```
POST /api/agv-dashboard/reverse-dashboard
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | string | No | Yesterday | Ngày bắt đầu (YYYY-MM-DD) |
| `end_date` | string | No | Today | Ngày kết thúc (YYYY-MM-DD) |

#### Ví dụ Request

```bash
# Tính toán cho ngày hôm qua (mặc định)
POST /api/agv-dashboard/reverse-dashboard

# Tính toán cho ngày cụ thể
POST /api/agv-dashboard/reverse-dashboard?start_date=2025-10-01&end_date=2025-10-02

# Tính toán cho nhiều ngày
POST /api/agv-dashboard/reverse-dashboard?start_date=2025-10-01&end_date=2025-10-05
```

#### Response

```json
{
  "status": "success",
  "date_range": "2025-10-01 00:00:00 to 2025-10-02 00:00:00",
  "total_records_processed": 45,
  "inserted_count": 40,
  "updated_count": 5,
  "summary": {
    "total_robots": 5,
    "total_days": 9
  }
}
```

---

### 2. Tính toán batch cho nhiều ngày

#### Endpoint
```
POST /api/agv-dashboard/reverse-dashboard-batch
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days_back` | integer | No | 30 | Số ngày tính từ hôm nay trở về trước |

#### Ví dụ Request

```bash
# Tính toán cho 30 ngày gần nhất (mặc định)
POST /api/agv-dashboard/reverse-dashboard-batch

# Tính toán cho 7 ngày gần nhất
POST /api/agv-dashboard/reverse-dashboard-batch?days_back=7

# Tính toán cho 90 ngày gần nhất
POST /api/agv-dashboard/reverse-dashboard-batch?days_back=90
```

#### Response

```json
{
  "status": "success",
  "total_days_processed": 7,
  "total_inserted": 245,
  "total_updated": 35,
  "details": [
    {
      "date": "2025-10-07",
      "inserted": 35,
      "updated": 5
    },
    {
      "date": "2025-10-08",
      "inserted": 35,
      "updated": 5
    },
    {
      "date": "2025-10-09",
      "inserted": 35,
      "updated": 5
    }
    // ... more days
  ]
}
```

---

## Cách sử dụng với Python/Service

### Gọi trực tiếp từ code

```python
from app.services.agv_dashboard_service import reverse_dashboard_data, reverse_dashboard_data_batch
from datetime import datetime, timedelta

# Tính toán cho 1 ngày
async def calculate_yesterday():
    result = await reverse_dashboard_data()
    print(f"Processed: {result['total_records_processed']} records")
    print(f"Inserted: {result['inserted_count']}, Updated: {result['updated_count']}")

# Tính toán cho ngày cụ thể
async def calculate_specific_date():
    start = datetime(2025, 10, 1, 0, 0, 0)
    end = datetime(2025, 10, 2, 0, 0, 0)
    result = await reverse_dashboard_data(start, end)
    return result

# Tính toán batch
async def calculate_last_week():
    result = await reverse_dashboard_data_batch(days_back=7)
    print(f"Processed {result['total_days_processed']} days")
    print(f"Total inserted: {result['total_inserted']}")
    print(f"Total updated: {result['total_updated']}")
```

---

## Cách sử dụng với cURL/HTTP Client

### cURL

```bash
# Tính toán cho ngày hôm qua
curl -X POST "http://localhost:8000/api/agv-dashboard/reverse-dashboard"

# Tính toán cho ngày cụ thể
curl -X POST "http://localhost:8000/api/agv-dashboard/reverse-dashboard?start_date=2025-10-01&end_date=2025-10-02"

# Tính toán batch cho 7 ngày
curl -X POST "http://localhost:8000/api/agv-dashboard/reverse-dashboard-batch?days_back=7"
```

### JavaScript (Fetch API)

```javascript
// Tính toán cho ngày hôm qua
async function calculateYesterday() {
  const response = await fetch('/api/agv-dashboard/reverse-dashboard', {
    method: 'POST'
  });
  const data = await response.json();
  console.log('Processed:', data.total_records_processed);
  console.log('Inserted:', data.inserted_count);
  console.log('Updated:', data.updated_count);
}

// Tính toán cho ngày cụ thể
async function calculateSpecificDate(startDate, endDate) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate
  });
  
  const response = await fetch(`/api/agv-dashboard/reverse-dashboard?${params}`, {
    method: 'POST'
  });
  
  return await response.json();
}

// Tính toán batch
async function calculateBatch(daysBack = 30) {
  const response = await fetch(`/api/agv-dashboard/reverse-dashboard-batch?days_back=${daysBack}`, {
    method: 'POST'
  });
  
  const data = await response.json();
  console.log(`Processed ${data.total_days_processed} days`);
  console.log(`Total inserted: ${data.total_inserted}`);
  console.log(`Total updated: ${data.total_updated}`);
  
  return data;
}
```

### Python Requests

```python
import requests

# Tính toán cho ngày hôm qua
response = requests.post('http://localhost:8000/api/agv-dashboard/reverse-dashboard')
print(response.json())

# Tính toán cho ngày cụ thể
params = {
    'start_date': '2025-10-01',
    'end_date': '2025-10-02'
}
response = requests.post('http://localhost:8000/api/agv-dashboard/reverse-dashboard', params=params)
print(response.json())

# Tính toán batch
params = {'days_back': 7}
response = requests.post('http://localhost:8000/api/agv-dashboard/reverse-dashboard-batch', params=params)
print(response.json())
```

---

## Cron Job / Scheduled Task

### Thiết lập chạy tự động mỗi ngày

#### Linux/Mac (Crontab)

```bash
# Chạy lúc 2:00 AM mỗi ngày để tính toán dữ liệu ngày hôm trước
0 2 * * * curl -X POST http://localhost:8000/api/agv-dashboard/reverse-dashboard

# Hoặc dùng Python script
0 2 * * * /path/to/python /path/to/run_reverse_dashboard.py
```

#### Windows (Task Scheduler)

Tạo file batch `reverse_dashboard.bat`:
```batch
@echo off
curl -X POST http://localhost:8000/api/agv-dashboard/reverse-dashboard
```

Sau đó schedule trong Task Scheduler để chạy mỗi ngày lúc 2:00 AM.

#### Python APScheduler

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.agv_dashboard_service import reverse_dashboard_data
import asyncio

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=2, minute=0)
async def daily_reverse_dashboard():
    """Chạy mỗi ngày lúc 2:00 AM"""
    result = await reverse_dashboard_data()
    print(f"Daily calculation completed: {result}")

scheduler.start()
```

---

## Query dữ liệu đã lưu

### Lấy thống kê của 1 robot trong 1 ngày

```python
from app.core.database import get_collection

async def get_robot_daily_stats(device_code: str, date: str):
    """
    Lấy thống kê ngày của 1 robot
    
    Args:
        device_code: Mã robot (vd: "AGV001")
        date: Ngày (vd: "2025-10-14")
    """
    collection = get_collection("agv_daily_statistics")
    stats = await collection.find_one({
        "device_code": device_code,
        "date": date
    })
    return stats
```

### Lấy thống kê của tất cả robot trong 1 ngày

```python
async def get_all_robots_daily_stats(date: str):
    """
    Lấy thống kê ngày của tất cả robot
    
    Args:
        date: Ngày (vd: "2025-10-14")
    """
    collection = get_collection("agv_daily_statistics")
    cursor = collection.find({"date": date})
    stats = await cursor.to_list(length=None)
    return stats
```

### Lấy thống kê của 1 robot trong khoảng thời gian

```python
async def get_robot_stats_range(device_code: str, start_date: str, end_date: str):
    """
    Lấy thống kê của 1 robot trong khoảng thời gian
    
    Args:
        device_code: Mã robot
        start_date: Ngày bắt đầu (vd: "2025-10-01")
        end_date: Ngày kết thúc (vd: "2025-10-14")
    """
    collection = get_collection("agv_daily_statistics")
    cursor = collection.find({
        "device_code": device_code,
        "date": {"$gte": start_date, "$lte": end_date}
    }).sort("date", 1)
    
    stats = await cursor.to_list(length=None)
    return stats
```

---

## Lưu ý quan trọng

### 1. Upsert Logic
- Hàm sử dụng **upsert** (update + insert)
- Nếu đã có dữ liệu cho `device_code` + `date`, sẽ **cập nhật**
- Nếu chưa có, sẽ **thêm mới**
- Tránh duplicate records

### 2. Performance
- **Batch processing** nên giới hạn `days_back <= 365`
- Với dữ liệu lớn, nên chạy batch vào thời gian ít tải
- Mỗi ngày xử lý riêng biệt, có thể parallel nếu cần

### 3. Data Consistency
- Dữ liệu tính toán dựa trên `agv_data` collection
- Nếu `agv_data` thay đổi, cần chạy lại `reverse_dashboard_data`
- Thời gian `calculated_at` cho biết lần tính toán gần nhất

### 4. Error Handling
- Nếu 1 ngày lỗi trong batch, các ngày khác vẫn tiếp tục
- Check log để xem chi tiết lỗi
- Response trả về cả `inserted_count` và `updated_count`

### 5. Index Recommendations

Để tăng tốc độ query, tạo index cho collection `agv_daily_statistics`:

```javascript
// MongoDB shell
db.agv_daily_statistics.createIndex({ "device_code": 1, "date": 1 }, { unique: true })
db.agv_daily_statistics.createIndex({ "date": 1 })
db.agv_daily_statistics.createIndex({ "device_code": 1 })
```

---

## Use Cases

### 1. Backfill dữ liệu lịch sử
```bash
# Tính toán lại cho 90 ngày qua
POST /api/agv-dashboard/reverse-dashboard-batch?days_back=90
```

### 2. Tính toán hàng ngày (cron job)
```bash
# Chạy tự động mỗi sáng lúc 2:00 AM
POST /api/agv-dashboard/reverse-dashboard
```

### 3. Tính toán lại cho ngày cụ thể (khi có sửa dữ liệu)
```bash
# Tính toán lại cho ngày 2025-10-01
POST /api/agv-dashboard/reverse-dashboard?start_date=2025-10-01&end_date=2025-10-02
```

### 4. Tạo report nhanh từ dữ liệu đã tính toán
```python
# Lấy dữ liệu đã được tính toán sẵn, rất nhanh
stats = await get_all_robots_daily_stats("2025-10-14")
```

---

## Troubleshooting

### Lỗi: "Invalid date format"
- Đảm bảo format ngày là `YYYY-MM-DD`
- Ví dụ đúng: `2025-10-14`
- Ví dụ sai: `14/10/2025`, `2025-10-14T00:00:00`

### Lỗi: "days_back must be greater than 0"
- `days_back` phải > 0
- `days_back` không được vượt quá 365

### Không có dữ liệu được insert/update
- Kiểm tra collection `agv_data` có dữ liệu trong khoảng thời gian không
- Kiểm tra dữ liệu có `state` là "InTask" hoặc "Idle" không
- Kiểm tra log để xem chi tiết

---

## Changelog

### Version 1.0 (2025-10-14)
- ✅ Tạo hàm `reverse_dashboard_data` để tính toán và lưu thống kê theo ngày
- ✅ Tạo hàm `reverse_dashboard_data_batch` để xử lý nhiều ngày
- ✅ Tạo API endpoint `/reverse-dashboard` cho single day
- ✅ Tạo API endpoint `/reverse-dashboard-batch` cho batch processing
- ✅ Hỗ trợ upsert để tránh duplicate
- ✅ Tính toán cả payload statistics và work status
- ✅ Lưu vào collection `agv_daily_statistics`

