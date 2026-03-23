# AGV Dashboard API Documentation

## Tổng quan

API được thiết kế để lấy thống kê dữ liệu AGV theo 2 trường hợp chính:
1. **Payload Statistics** - Thống kê payload theo state cụ thể
2. **Work Status** - Thống kê trạng thái làm việc (InTask vs Idle)

## Base URL
```
http://localhost:8000/api/agv
```

## API Endpoints

### 1. Payload Statistics API

**Endpoint:** `GET /payload-statistics`

**Mục đích:** Lấy thống kê số lượng bản ghi có `payLoad` là `"0.0"` và `"1.0"` cho một state cụ thể trong khoảng thời gian nhất định.

#### Tham số (Query Parameters)

| Tham số | Bắt buộc | Kiểu dữ liệu | Mô tả | Ví dụ |
|---------|----------|--------------|-------|-------|
| `time_filter` | ✅ | string | Khoảng thời gian: "1d", "7d", "1m" | "1d" |
| `state` | ✅ | string | Trạng thái AGV: "InTask", "Idle", etc. | "InTask" |
| `device_code` | ❌ | string | Mã thiết bị cụ thể (tùy chọn) | "AGV001" |

#### Ví dụ Request

```bash
# Lấy thống kê payload cho state "InTask" trong 1 ngày
GET /api/agv/payload-statistics?time_filter=1d&state=InTask

# Lấy thống kê payload cho device cụ thể
GET /api/agv/payload-statistics?time_filter=7d&state=Idle&device_code=AGV001
```

#### Response Format

```json
{
  "status": "success",
  "filter_type": "with_state",
  "state": "InTask",
  "time_range": "2024-01-01 10:00:00 to 2024-01-02 10:00:00",
  "data": {
    "payLoad_0_0_count": 15,
    "payLoad_1_0_count": 8,
    "total_records": 23
  }
}
```

#### Response Fields

| Field | Kiểu dữ liệu | Mô tả |
|-------|--------------|-------|
| `status` | string | Trạng thái response: "success" hoặc "error" |
| `filter_type` | string | Luôn là "with_state" |
| `state` | string | State được filter |
| `time_range` | string | Khoảng thời gian đã filter |
| `data.payLoad_0_0_count` | integer | Số bản ghi có payLoad "0.0" |
| `data.payLoad_1_0_count` | integer | Số bản ghi có payLoad "1.0" |
| `data.total_records` | integer | Tổng số bản ghi |

---

### 2. Work Status API

**Endpoint:** `GET /work-status`

**Mục đích:** Lấy thống kê số lượng AGV đang làm việc (InTask) và không làm việc (Idle) trong khoảng thời gian nhất định.

#### Tham số (Query Parameters)

| Tham số | Bắt buộc | Kiểu dữ liệu | Mô tả | Ví dụ |
|---------|----------|--------------|-------|-------|
| `time_filter` | ✅ | string | Khoảng thời gian: "1d", "7d", "1m" | "7d" |
| `device_code` | ❌ | string | Mã thiết bị cụ thể (tùy chọn) | "AGV002" |

#### Ví dụ Request

```bash
# Lấy thống kê trạng thái làm việc trong 7 ngày
GET /api/agv/work-status?time_filter=7d

# Lấy thống kê cho device cụ thể
GET /api/agv/work-status?time_filter=1m&device_code=AGV002
```

#### Response Format

```json
{
  "status": "success",
  "filter_type": "without_state",
  "time_range": "2024-01-01 10:00:00 to 2024-01-08 10:00:00",
  "data": {
    "InTask_count": 45,
    "Idle_count": 12,
    "total_records": 57
  }
}
```

#### Response Fields

| Field | Kiểu dữ liệu | Mô tả |
|-------|--------------|-------|
| `status` | string | Trạng thái response: "success" hoặc "error" |
| `filter_type` | string | Luôn là "without_state" |
| `time_range` | string | Khoảng thời gian đã filter |
| `data.InTask_count` | integer | Số AGV đang làm việc |
| `data.Idle_count` | integer | Số AGV không làm việc |
| `data.total_records` | integer | Tổng số bản ghi |

---

## Time Filter Options

| Giá trị | Mô tả | Khoảng thời gian |
|---------|-------|------------------|
| `"1d"` | 1 ngày | 24 giờ gần nhất |
| `"7d"` | 7 ngày | 7 ngày gần nhất |
| `"1m"` | 1 tháng | 30 ngày gần nhất |

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid time_filter (chỉ chấp nhận: 1d, 7d, 1m)"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error: [error message]"
}
```

## Use Cases

### 1. Phân tích hiệu suất tải hàng
```bash
# Xem có bao nhiêu AGV đang mang hàng (payLoad="1.0") vs không mang hàng (payLoad="0.0")
GET /api/agv/payload-statistics?time_filter=1d&state=InTask
```

### 2. Phân tích tình trạng làm việc
```bash
# Xem có bao nhiêu AGV đang làm việc vs đang nghỉ
GET /api/agv/work-status?time_filter=7d
```

### 3. Phân tích theo thiết bị cụ thể
```bash
# Xem hiệu suất của một AGV cụ thể
GET /api/agv/work-status?time_filter=1m&device_code=AGV001
GET /api/agv/payload-statistics?time_filter=1m&state=InTask&device_code=AGV001
```

## Frontend Integration

### JavaScript/Fetch Example

```javascript
// Lấy thống kê payload
async function getPayloadStats(timeFilter, state, deviceCode = null) {
  const params = new URLSearchParams({
    time_filter: timeFilter,
    state: state
  });
  
  if (deviceCode) {
    params.append('device_code', deviceCode);
  }
  
  const response = await fetch(`/api/agv/payload-statistics?${params}`);
  return await response.json();
}

// Lấy thống kê trạng thái làm việc
async function getWorkStatus(timeFilter, deviceCode = null) {
  const params = new URLSearchParams({
    time_filter: timeFilter
  });
  
  if (deviceCode) {
    params.append('device_code', deviceCode);
  }
  
  const response = await fetch(`/api/agv/work-status?${params}`);
  return await response.json();
}

// Sử dụng
const payloadStats = await getPayloadStats('1d', 'InTask');
const workStatus = await getWorkStatus('7d', 'AGV001');
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function AGVDashboard() {
  const [payloadStats, setPayloadStats] = useState(null);
  const [workStatus, setWorkStatus] = useState(null);

  useEffect(() => {
    // Lấy thống kê payload cho InTask
    fetch('/api/agv/payload-statistics?time_filter=1d&state=InTask')
      .then(res => res.json())
      .then(data => setPayloadStats(data));

    // Lấy thống kê trạng thái làm việc
    fetch('/api/agv/work-status?time_filter=1d')
      .then(res => res.json())
      .then(data => setWorkStatus(data));
  }, []);

  return (
    <div>
      {payloadStats && (
        <div>
          <h3>Payload Statistics</h3>
          <p>With Load: {payloadStats.data.payLoad_1_0_count}</p>
          <p>Without Load: {payloadStats.data.payLoad_0_0_count}</p>
        </div>
      )}
      
      {workStatus && (
        <div>
          <h3>Work Status</h3>
          <p>Working: {workStatus.data.InTask_count}</p>
          <p>Idle: {workStatus.data.Idle_count}</p>
        </div>
      )}
    </div>
  );
}
```

## Testing

Chạy file test để kiểm tra API:
```bash
cd backend/examples
python api_usage_examples.py
```
