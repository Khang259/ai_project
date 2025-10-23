# Hướng dẫn sử dụng API thống kê cho tất cả Robot

## Tổng quan

Đây là 2 API endpoint mới được xây dựng để lấy thống kê của **TẤT CẢ robot** trong hệ thống, với khả năng lọc theo `device_code` hoặc `device_name`.

## 1. API Thống kê Payload (Có tải/Không tải) cho tất cả Robot

### Endpoint
```
GET /api/agv-dashboard/all-robots-payload-statistics
```

### Mô tả
API này trả về thống kê về thời gian có tải (`payLoad = "1.0"`) và không tải (`payLoad = "0.0"`) của tất cả robot trong hệ thống.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `time_filter` | string | **Bắt buộc** | Bộ lọc thời gian: `"d"` (7 ngày), `"w"` (7 tuần), `"m"` (7 tháng) |
| `state` | string | **Bắt buộc** | Trạng thái robot: `"InTask"`, `"Idle"`, etc. |
| `device_code` | string | Tùy chọn | Lọc theo mã thiết bị cụ thể |
| `device_name` | string | Tùy chọn | Lọc theo tên thiết bị cụ thể |

### Ví dụ Request

#### 1. Lấy dữ liệu tất cả robot
```bash
GET /api/agv-dashboard/all-robots-payload-statistics?time_filter=d&state=InTask
```

#### 2. Lọc theo device_code
```bash
GET /api/agv-dashboard/all-robots-payload-statistics?time_filter=w&state=InTask&device_code=AGV001
```

#### 3. Lọc theo device_name
```bash
GET /api/agv-dashboard/all-robots-payload-statistics?time_filter=m&state=InTask&device_name=Robot%20A
```

### Response Structure

```json
{
  "status": "success",
  "state": "InTask",
  "time_range": "2025-10-07 00:00:00 to 2025-10-14 12:00:00",
  "time_unit": "d",
  "total_robots": 3,
  "robots": [
    {
      "device_code": "AGV001",
      "device_name": "Robot A",
      "time_series": {
        "2025-10-07": {
          "payLoad_0_0_count": 100,
          "payLoad_1_0_count": 150,
          "total_records": 250,
          "payLoad_0_0_percentage": 40.0,
          "payLoad_1_0_percentage": 60.0
        },
        "2025-10-08": {
          "payLoad_0_0_count": 120,
          "payLoad_1_0_count": 130,
          "total_records": 250,
          "payLoad_0_0_percentage": 48.0,
          "payLoad_1_0_percentage": 52.0
        }
      },
      "summary": {
        "total_payLoad_0_0_count": 220,
        "total_payLoad_1_0_count": 280,
        "total_records": 500,
        "total_payLoad_0_0_percentage": 44.0,
        "total_payLoad_1_0_percentage": 56.0
      }
    },
    {
      "device_code": "AGV002",
      "device_name": "Robot B",
      "time_series": {
        "2025-10-07": {
          "payLoad_0_0_count": 80,
          "payLoad_1_0_count": 170,
          "total_records": 250,
          "payLoad_0_0_percentage": 32.0,
          "payLoad_1_0_percentage": 68.0
        }
      },
      "summary": {
        "total_payLoad_0_0_count": 80,
        "total_payLoad_1_0_count": 170,
        "total_records": 250,
        "total_payLoad_0_0_percentage": 32.0,
        "total_payLoad_1_0_percentage": 68.0
      }
    }
  ]
}
```

### Response Fields

- `status`: Trạng thái response (`"success"` hoặc `"error"`)
- `state`: Trạng thái robot được lọc
- `time_range`: Khoảng thời gian được query
- `time_unit`: Đơn vị thời gian (`"d"`, `"w"`, `"m"`)
- `total_robots`: Tổng số robot trong kết quả
- `robots`: Mảng chứa dữ liệu của từng robot
  - `device_code`: Mã thiết bị
  - `device_name`: Tên thiết bị
  - `time_series`: Dữ liệu theo thời gian (ngày/tuần/tháng)
    - `payLoad_0_0_count`: Số lượng bản ghi không tải
    - `payLoad_1_0_count`: Số lượng bản ghi có tải
    - `total_records`: Tổng số bản ghi
    - `payLoad_0_0_percentage`: % thời gian không tải
    - `payLoad_1_0_percentage`: % thời gian có tải
  - `summary`: Tóm tắt tổng thể của robot
    - `total_payLoad_0_0_count`: Tổng số lần không tải
    - `total_payLoad_1_0_count`: Tổng số lần có tải
    - `total_records`: Tổng số bản ghi
    - `total_payLoad_0_0_percentage`: % tổng thể không tải
    - `total_payLoad_1_0_percentage`: % tổng thể có tải

---

## 2. API Thống kê Trạng thái làm việc (InTask/Idle) cho tất cả Robot

### Endpoint
```
GET /api/agv-dashboard/all-robots-work-status
```

### Mô tả
API này trả về thống kê về thời gian làm việc (`state = "InTask"`) và không làm việc (`state = "Idle"`) của tất cả robot trong hệ thống.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `time_filter` | string | **Bắt buộc** | Bộ lọc thời gian: `"d"` (7 ngày), `"w"` (7 tuần), `"m"` (7 tháng) |
| `device_code` | string | Tùy chọn | Lọc theo mã thiết bị cụ thể |
| `device_name` | string | Tùy chọn | Lọc theo tên thiết bị cụ thể |

### Ví dụ Request

#### 1. Lấy dữ liệu tất cả robot
```bash
GET /api/agv-dashboard/all-robots-work-status?time_filter=d
```

#### 2. Lọc theo device_code
```bash
GET /api/agv-dashboard/all-robots-work-status?time_filter=w&device_code=AGV001
```

#### 3. Lọc theo device_name
```bash
GET /api/agv-dashboard/all-robots-work-status?time_filter=m&device_name=Robot%20A
```

### Response Structure

```json
{
  "status": "success",
  "time_range": "2025-10-07 00:00:00 to 2025-10-14 12:00:00",
  "time_unit": "d",
  "total_robots": 3,
  "robots": [
    {
      "device_code": "AGV001",
      "device_name": "Robot A",
      "time_series": {
        "2025-10-07": {
          "InTask_count": 200,
          "Idle_count": 100,
          "total_records": 300,
          "InTask_percentage": 66.67,
          "Idle_percentage": 33.33
        },
        "2025-10-08": {
          "InTask_count": 180,
          "Idle_count": 120,
          "total_records": 300,
          "InTask_percentage": 60.0,
          "Idle_percentage": 40.0
        }
      },
      "summary": {
        "total_InTask_count": 380,
        "total_Idle_count": 220,
        "total_records": 600,
        "total_InTask_percentage": 63.33,
        "total_Idle_percentage": 36.67
      }
    },
    {
      "device_code": "AGV002",
      "device_name": "Robot B",
      "time_series": {
        "2025-10-07": {
          "InTask_count": 150,
          "Idle_count": 150,
          "total_records": 300,
          "InTask_percentage": 50.0,
          "Idle_percentage": 50.0
        }
      },
      "summary": {
        "total_InTask_count": 150,
        "total_Idle_count": 150,
        "total_records": 300,
        "total_InTask_percentage": 50.0,
        "total_Idle_percentage": 50.0
      }
    }
  ]
}
```

### Response Fields

- `status`: Trạng thái response (`"success"` hoặc `"error"`)
- `time_range`: Khoảng thời gian được query
- `time_unit`: Đơn vị thời gian (`"d"`, `"w"`, `"m"`)
- `total_robots`: Tổng số robot trong kết quả
- `robots`: Mảng chứa dữ liệu của từng robot
  - `device_code`: Mã thiết bị
  - `device_name`: Tên thiết bị
  - `time_series`: Dữ liệu theo thời gian (ngày/tuần/tháng)
    - `InTask_count`: Số lượng bản ghi đang làm việc
    - `Idle_count`: Số lượng bản ghi không làm việc
    - `total_records`: Tổng số bản ghi
    - `InTask_percentage`: % thời gian làm việc
    - `Idle_percentage`: % thời gian không làm việc
  - `summary`: Tóm tắt tổng thể của robot
    - `total_InTask_count`: Tổng số lần làm việc
    - `total_Idle_count`: Tổng số lần không làm việc
    - `total_records`: Tổng số bản ghi
    - `total_InTask_percentage`: % tổng thể làm việc
    - `total_Idle_percentage`: % tổng thể không làm việc

---

## So sánh với API hiện có

### API hiện có (Tổng hợp)

1. **`/api/agv-dashboard/payload-statistics`**: Trả về dữ liệu payload được **gộp chung** cho 1 robot hoặc tất cả robot
2. **`/api/agv-dashboard/work-status`**: Trả về dữ liệu work status được **gộp chung** cho 1 robot hoặc tất cả robot

### API mới (Riêng biệt cho từng robot)

1. **`/api/agv-dashboard/all-robots-payload-statistics`**: Trả về dữ liệu payload **riêng biệt cho TỪNG robot**
2. **`/api/agv-dashboard/all-robots-work-status`**: Trả về dữ liệu work status **riêng biệt cho TỪNG robot**

---

## Lưu ý khi sử dụng

1. **Lọc theo device_code hoặc device_name**: Bạn chỉ nên dùng 1 trong 2 tham số này. Nếu cung cấp cả 2, `device_code` sẽ được ưu tiên.

2. **Time filter**:
   - `"d"`: 7 ngày gần nhất
   - `"w"`: 7 tuần gần nhất (49 ngày)
   - `"m"`: 7 tháng gần nhất (210 ngày)

3. **Payload values**:
   - `"0.0"`: Robot không tải hàng
   - `"1.0"`: Robot đang tải hàng

4. **State values**:
   - `"InTask"`: Robot đang làm việc
   - `"Idle"`: Robot đang chờ/không làm việc

---

## Error Response

Nếu có lỗi, API sẽ trả về:

```json
{
  "detail": "Error message here"
}
```

Với các HTTP status code:
- `400`: Bad Request (tham số không hợp lệ)
- `500`: Internal Server Error (lỗi server)

---

## Ví dụ sử dụng với JavaScript

### Fetch API

```javascript
// Lấy dữ liệu payload của tất cả robot
async function getAllRobotsPayloadData() {
  const response = await fetch(
    '/api/agv-dashboard/all-robots-payload-statistics?time_filter=d&state=InTask'
  );
  const data = await response.json();
  
  // Xử lý dữ liệu từng robot
  data.robots.forEach(robot => {
    console.log(`Robot ${robot.device_name}:`);
    console.log(`- Tổng thời gian có tải: ${robot.summary.total_payLoad_1_0_percentage}%`);
    console.log(`- Tổng thời gian không tải: ${robot.summary.total_payLoad_0_0_percentage}%`);
  });
}

// Lấy dữ liệu work status của tất cả robot
async function getAllRobotsWorkStatus() {
  const response = await fetch(
    '/api/agv-dashboard/all-robots-work-status?time_filter=w'
  );
  const data = await response.json();
  
  // Xử lý dữ liệu từng robot
  data.robots.forEach(robot => {
    console.log(`Robot ${robot.device_name}:`);
    console.log(`- Thời gian làm việc: ${robot.summary.total_InTask_percentage}%`);
    console.log(`- Thời gian nghỉ: ${robot.summary.total_Idle_percentage}%`);
  });
}
```

### Axios

```javascript
import axios from 'axios';

// Lấy dữ liệu payload của 1 robot cụ thể
async function getSpecificRobotPayloadData(deviceCode) {
  const response = await axios.get('/api/agv-dashboard/all-robots-payload-statistics', {
    params: {
      time_filter: 'd',
      state: 'InTask',
      device_code: deviceCode
    }
  });
  
  return response.data;
}

// Lấy dữ liệu work status theo tên robot
async function getRobotWorkStatusByName(deviceName) {
  const response = await axios.get('/api/agv-dashboard/all-robots-work-status', {
    params: {
      time_filter: 'm',
      device_name: deviceName
    }
  });
  
  return response.data;
}
```

---

## Changelog

### Version 1.0 (2025-10-14)
- ✅ Thêm API `/all-robots-payload-statistics` để lấy dữ liệu payload của tất cả robot
- ✅ Thêm API `/all-robots-work-status` để lấy dữ liệu work status của tất cả robot
- ✅ Hỗ trợ lọc theo `device_code` hoặc `device_name`
- ✅ Dữ liệu được trả về riêng biệt cho từng robot
- ✅ Tính toán time series và summary cho từng robot

