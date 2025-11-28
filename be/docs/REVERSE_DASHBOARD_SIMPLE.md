# Hướng dẫn Reverse Dashboard Data - Phiên bản đơn giản

## Tổng quan

Hàm `reverse_dashboard_data()` tự động tính toán và lưu thống kê của **NGÀY HÔM NAY** (00:00:00 đến 23:59:59) cho tất cả AGV vào database.

## Cách hoạt động

```
┌─────────────────┐
│   agv_data      │  Lấy dữ liệu NGÀY HÔM NAY
│   collection    │  (created_at >= today 00:00:00 và < tomorrow 00:00:00)
└────────┬────────┘
         │
         │ reverse_dashboard_data()
         │ - Group by device_code
         │ - Tính payload statistics (InTask)
         │ - Tính work status (InTask/Idle)
         │ - Insert vào database
         ▼
┌─────────────────────────┐
│ agv_daily_statistics    │
│ collection              │
│ - Mỗi robot 1 record    │
│ - date_time = hôm nay   │
└─────────────────────────┘
```

## Collection: `agv_daily_statistics`

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
  
  // Work status statistics
  "InTask_count": 350,
  "Idle_count": 100,
  "total_work_records": 450,
  "InTask_percentage": 77.78,
  "Idle_percentage": 22.22,
  
  // Metadata
  "date_time": "2025-10-14",  // Ngày hôm nay
  "calculated_at": "2025-10-14T15:30:00.000Z"
}
```

## API Endpoint

### POST /api/agv-dashboard/reverse-dashboard

**Không cần tham số** - tự động lấy dữ liệu ngày hôm nay.

#### Request

```bash
POST /api/agv-dashboard/reverse-dashboard
```

#### Response

```json
{
  "status": "success",
  "date": "2025-10-14",
  "total_records_inserted": 45,
  "summary": {
    "total_robots": 5,
    "date": "2025-10-14"
  }
}
```

## Ví dụ sử dụng

### cURL

```bash
curl -X POST "http://localhost:8000/api/agv-dashboard/reverse-dashboard"
```

### JavaScript

```javascript
async function saveToday() {
  const response = await fetch('/api/agv-dashboard/reverse-dashboard', {
    method: 'POST'
  });
  const data = await response.json();
  console.log(`Saved ${data.total_records_inserted} records for ${data.date}`);
}
```

### Python

```python
import requests

response = requests.post('http://localhost:8000/api/agv-dashboard/reverse-dashboard')
result = response.json()
print(f"Saved {result['total_records_inserted']} records for {result['date']}")
```

## Cron Job - Chạy tự động mỗi ngày

### Linux/Mac

```bash
# Chạy lúc 23:59 mỗi ngày để lưu dữ liệu ngày hôm đó
59 23 * * * curl -X POST http://localhost:8000/api/agv-dashboard/reverse-dashboard
```

### Windows Task Scheduler

Tạo file `save_daily_stats.bat`:
```batch
@echo off
curl -X POST http://localhost:8000/api/agv-dashboard/reverse-dashboard
```

Schedule chạy lúc 23:59 mỗi ngày.

### Python APScheduler

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.agv_dashboard_service import reverse_dashboard_data

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('cron', hour=23, minute=59)
async def save_daily_stats():
    """Chạy mỗi ngày lúc 23:59"""
    result = await reverse_dashboard_data()
    print(f"Daily stats saved: {result}")

scheduler.start()
```

## Lưu ý quan trọng

1. **Ngày hôm nay**: Hàm chỉ lấy dữ liệu từ 00:00:00 đến 23:59:59 của ngày hiện tại
2. **Không check trùng**: Mỗi lần chạy sẽ insert trực tiếp, không update hay upsert
3. **Trường date_time**: Lưu ngày hôm nay (dạng date, không có giờ)
4. **Insert many**: Nếu có nhiều robot, sẽ insert tất cả cùng lúc

## Query dữ liệu

```python
from app.core.database import get_collection

async def get_today_stats():
    """Lấy thống kê của tất cả robot hôm nay"""
    from datetime import date
    collection = get_collection("agv_daily_statistics")
    today = date.today()
    
    cursor = collection.find({"date_time": today})
    stats = await cursor.to_list(length=None)
    return stats

async def get_robot_today(device_code: str):
    """Lấy thống kê của 1 robot hôm nay"""
    from datetime import date
    collection = get_collection("agv_daily_statistics")
    today = date.today()
    
    stats = await collection.find_one({
        "device_code": device_code,
        "date_time": today
    })
    return stats
```

## Troubleshooting

### Không có dữ liệu được insert
- Kiểm tra `agv_data` collection có dữ liệu ngày hôm nay không
- Kiểm tra dữ liệu có state "InTask" hoặc "Idle" không
- Xem log để biết chi tiết

### Muốn lưu dữ liệu của ngày khác
- Hàm hiện tại chỉ lưu ngày hôm nay
- Nếu cần lưu ngày khác, cần sửa code hoặc tạo hàm mới

## Index khuyến nghị

```javascript
// MongoDB shell
db.agv_daily_statistics.createIndex({ "device_code": 1, "date_time": 1 })
db.agv_daily_statistics.createIndex({ "date_time": 1 })
```

## Summary

- ✅ **Đơn giản**: Không cần tham số, tự động lấy ngày hôm nay
- ✅ **Nhanh**: Insert trực tiếp, không check trùng
- ✅ **Rõ ràng**: date_time luôn là ngày hôm đó
- ✅ **Dễ schedule**: Chạy mỗi ngày lúc 23:59

