# AGV Dashboard API Documentation - Updated

## Tổng quan

API được thiết kế để lấy thống kê dữ liệu AGV theo 2 trường hợp chính với **time series data**:
1. **Payload Statistics** - Thống kê payload theo state cụ thể theo từng đơn vị thời gian
2. **Work Status** - Thống kê trạng thái làm việc (InTask vs Idle) theo từng đơn vị thời gian

## Thay đổi chính

### Time Filter Mới
- **`d`**: 7 ngày gần nhất (theo từng ngày)
- **`w`**: 7 tuần gần nhất (theo từng tuần)  
- **`m`**: 7 tháng gần nhất (theo từng tháng)

### Response Format Mới
Thay vì trả về tổng hợp, API bây giờ trả về:
- **Time Series Data**: Dữ liệu chi tiết theo từng đơn vị thời gian
- **Summary**: Tổng hợp toàn bộ thời gian

## Base URL
```
http://localhost:8000/api/agv
```

## API Endpoints

### 1. Payload Statistics API

**Endpoint:** `GET /payload-statistics`

**Mục đích:** Lấy thống kê số lượng bản ghi có `payLoad` là `"0.0"` và `"1.0"` cho một state cụ thể theo từng đơn vị thời gian.

#### Tham số (Query Parameters)

| Tham số | Bắt buộc | Kiểu dữ liệu | Mô tả | Ví dụ |
|---------|----------|--------------|-------|-------|
| `time_filter` | ✅ | string | Khoảng thời gian: "d", "w", "m" | "d" |
| `state` | ✅ | string | Trạng thái AGV: "InTask", "Idle", etc. | "InTask" |
| `device_code` | ❌ | string | Mã thiết bị cụ thể (tùy chọn) | "AGV001" |

#### Ví dụ Request

```bash
# Lấy thống kê payload cho state "InTask" theo từng ngày (7 ngày gần nhất)
GET /api/agv/payload-statistics?time_filter=d&state=InTask

# Lấy thống kê payload theo từng tuần (7 tuần gần nhất)
GET /api/agv/payload-statistics?time_filter=w&state=Idle&device_code=AGV001
```

#### Response Format

```json
{
  "status": "success",
  "filter_type": "with_state",
  "state": "InTask",
  "time_range": "2024-01-01 10:00:00 to 2024-01-08 10:00:00",
  "time_unit": "d",
  "data": {
    "time_series": {
      "2024-01-01": {
        "payLoad_0_0_count": 5,
        "payLoad_1_0_count": 3,
        "total_records": 8
      },
      "2024-01-02": {
        "payLoad_0_0_count": 7,
        "payLoad_1_0_count": 2,
        "total_records": 9
      },
      "2024-01-03": {
        "payLoad_0_0_count": 4,
        "payLoad_1_0_count": 6,
        "total_records": 10
      }
    },
    "summary": {
      "total_payLoad_0_0_count": 16,
      "total_payLoad_1_0_count": 11,
      "total_records": 27
    }
  }
}
```

---

### 2. Work Status API

**Endpoint:** `GET /work-status`

**Mục đích:** Lấy thống kê số lượng AGV đang làm việc (InTask) và không làm việc (Idle) theo từng đơn vị thời gian.

#### Tham số (Query Parameters)

| Tham số | Bắt buộc | Kiểu dữ liệu | Mô tả | Ví dụ |
|---------|----------|--------------|-------|-------|
| `time_filter` | ✅ | string | Khoảng thời gian: "d", "w", "m" | "w" |
| `device_code` | ❌ | string | Mã thiết bị cụ thể (tùy chọn) | "AGV002" |

#### Ví dụ Request

```bash
# Lấy thống kê trạng thái làm việc theo từng tuần (7 tuần gần nhất)
GET /api/agv/work-status?time_filter=w

# Lấy thống kê theo từng tháng cho device cụ thể
GET /api/agv/work-status?time_filter=m&device_code=AGV002
```

#### Response Format

```json
{
  "status": "success",
  "filter_type": "without_state",
  "time_range": "2024-01-01 10:00:00 to 2024-02-18 10:00:00",
  "time_unit": "w",
  "data": {
    "time_series": {
      "2024-W01": {
        "InTask_count": 25,
        "Idle_count": 8,
        "total_records": 33
      },
      "2024-W02": {
        "InTask_count": 30,
        "Idle_count": 5,
        "total_records": 35
      },
      "2024-W03": {
        "InTask_count": 22,
        "Idle_count": 12,
        "total_records": 34
      }
    },
    "summary": {
      "total_InTask_count": 77,
      "total_Idle_count": 25,
      "total_records": 102
    }
  }
}
```

---

## Time Filter Details

| Giá trị | Mô tả | Khoảng thời gian | Format Date |
|---------|-------|------------------|-------------|
| `"d"` | Theo ngày | 7 ngày gần nhất | `YYYY-MM-DD` |
| `"w"` | Theo tuần | 7 tuần gần nhất | `YYYY-WWW` |
| `"m"` | Theo tháng | 7 tháng gần nhất | `YYYY-MM` |

## Response Structure

### Time Series Data
- **Key**: Ngày/tuần/tháng theo format tương ứng
- **Value**: Object chứa thống kê cho khoảng thời gian đó

### Summary Data
- **Tổng hợp**: Tổng số của toàn bộ thời gian được query
- **Dễ so sánh**: Giúp frontend hiển thị tổng quan và chi tiết

## Use Cases

### 1. Dashboard với biểu đồ theo thời gian
```bash
# Lấy dữ liệu cho biểu đồ 7 ngày
GET /api/agv/payload-statistics?time_filter=d&state=InTask
```

### 2. Báo cáo tuần
```bash
# Lấy dữ liệu cho báo cáo 7 tuần
GET /api/agv/work-status?time_filter=w
```

### 3. Phân tích xu hướng tháng
```bash
# Lấy dữ liệu cho phân tích xu hướng 7 tháng
GET /api/agv/payload-statistics?time_filter=m&state=Idle&device_code=AGV001
```

## Frontend Integration

### JavaScript/Fetch Example

```javascript
// Lấy thống kê payload theo ngày
async function getPayloadStatsByDay(state, deviceCode = null) {
  const params = new URLSearchParams({
    time_filter: 'd',
    state: state
  });
  
  if (deviceCode) {
    params.append('device_code', deviceCode);
  }
  
  const response = await fetch(`/api/agv/payload-statistics?${params}`);
  const data = await response.json();
  
  // Xử lý time series data
  const timeSeries = data.data.time_series;
  const summary = data.data.summary;
  
  return { timeSeries, summary };
}

// Lấy thống kê trạng thái làm việc theo tuần
async function getWorkStatusByWeek(deviceCode = null) {
  const params = new URLSearchParams({
    time_filter: 'w'
  });
  
  if (deviceCode) {
    params.append('device_code', deviceCode);
  }
  
  const response = await fetch(`/api/agv/work-status?${params}`);
  return await response.json();
}

// Sử dụng
const payloadData = await getPayloadStatsByDay('InTask');
const workData = await getWorkStatusByWeek('AGV001');
```

### React Example với Chart.js

```jsx
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

function AGVTimeSeriesChart() {
  const [payloadData, setPayloadData] = useState(null);
  const [workData, setWorkData] = useState(null);

  useEffect(() => {
    // Lấy dữ liệu payload theo ngày
    fetch('/api/agv/payload-statistics?time_filter=d&state=InTask')
      .then(res => res.json())
      .then(data => setPayloadData(data));

    // Lấy dữ liệu trạng thái làm việc theo ngày
    fetch('/api/agv/work-status?time_filter=d')
      .then(res => res.json())
      .then(data => setWorkData(data));
  }, []);

  const createChartData = (timeSeriesData, type) => {
    const labels = Object.keys(timeSeriesData).sort();
    
    if (type === 'payload') {
      return {
        labels,
        datasets: [
          {
            label: 'PayLoad 0.0',
            data: labels.map(label => timeSeriesData[label].payLoad_0_0_count),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
          },
          {
            label: 'PayLoad 1.0',
            data: labels.map(label => timeSeriesData[label].payLoad_1_0_count),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
          }
        ]
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: 'InTask (Working)',
            data: labels.map(label => timeSeriesData[label].InTask_count),
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
          },
          {
            label: 'Idle (Not Working)',
            data: labels.map(label => timeSeriesData[label].Idle_count),
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
          }
        ]
      };
    }
  };

  return (
    <div>
      {payloadData && (
        <div>
          <h3>Payload Statistics (7 Days)</h3>
          <Line data={createChartData(payloadData.data.time_series, 'payload')} />
          <p>Total: {payloadData.data.summary.total_records} records</p>
        </div>
      )}
      
      {workData && (
        <div>
          <h3>Work Status (7 Days)</h3>
          <Line data={createChartData(workData.data.time_series, 'work')} />
          <p>Total: {workData.data.summary.total_records} records</p>
        </div>
      )}
    </div>
  );
}
```

## Testing

Chạy file test để kiểm tra API với logic mới:
```bash
cd backend/examples
python test_new_time_filter.py
```

## Migration Notes

### Thay đổi từ phiên bản cũ:
1. **Time filter**: `"1d", "7d", "1m"` → `"d", "w", "m"`
2. **Response structure**: Thêm `time_series` và `time_unit`
3. **Data granularity**: Theo từng đơn vị thời gian thay vì tổng hợp
4. **Summary**: Vẫn giữ tổng hợp để backward compatibility
