# API Quản Lý Map Theo Area

## Tổng Quan

API quản lý map cho phép lưu, lấy và xóa map data theo `area_id`. Hệ thống tự động xóa map cũ khi lưu map mới cho cùng một `area_id`.

---

## Endpoints

### 1. Lưu/Cập Nhật Map

**POST** `/api/areas/{area_id}/map`

**Mô tả:** Lưu map mới cho area. Nếu đã có map cũ, sẽ tự động xóa và thay thế bằng map mới.

**Request Body:**
```json
{
  "nodes": [...],
  "connections": [...],
  "metadata": {
    "width": 1000,
    "height": 800
  }
}
```

**Response (Success - Created):**
```json
{
  "success": true,
  "message": "Map created successfully",
  "data": {
    "map_id": "507f1f77bcf86cd799439011",
    "area_id": 1,
    "action": "created"
  }
}
```

**Response (Success - Replaced):**
```json
{
  "success": true,
  "message": "Map replaced successfully",
  "data": {
    "map_id": "507f1f77bcf86cd799439012",
    "area_id": 1,
    "action": "replaced"
  }
}
```

**Ví dụ cURL:**
```bash
curl -X POST "http://localhost:8000/api/areas/1/map" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "nodes": [
      {"id": "node1", "x": 100, "y": 200},
      {"id": "node2", "x": 300, "y": 400}
    ],
    "connections": [
      {"from": "node1", "to": "node2"}
    ]
  }'
```

---

### 2. Lấy Map Theo Area ID

**GET** `/api/areas/{area_id}/map`

**Mô tả:** Lấy map data của một area cụ thể.

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "map_id": "507f1f77bcf86cd799439011",
    "area_id": 1,
    "data": {
      "nodes": [...],
      "connections": [...]
    },
    "created_at": "2025-10-09T10:30:00",
    "updated_at": "2025-10-09T10:30:00"
  }
}
```

**Response (Not Found):**
```json
{
  "detail": "Map not found for area_id 1"
}
```

**Ví dụ cURL:**
```bash
curl -X GET "http://localhost:8000/api/areas/1/map" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Xóa Map

**DELETE** `/api/areas/{area_id}/map`

**Mô tả:** Xóa map của một area cụ thể.

**Response (Success):**
```json
{
  "success": true,
  "message": "Map deleted successfully for area_id 1"
}
```

**Response (Not Found):**
```json
{
  "detail": "Map not found for area_id 1"
}
```

**Ví dụ cURL:**
```bash
curl -X DELETE "http://localhost:8000/api/areas/1/map" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Luồng Hoạt Động

### Kịch Bản 1: Tạo Map Mới (Lần Đầu)

1. User upload map cho area_id = 1
2. Hệ thống kiểm tra: chưa có map nào cho area_id = 1
3. Lưu map mới vào database
4. Response: `action: "created"`

### Kịch Bản 2: Cập Nhật Map (Đã Có Map Cũ)

1. User upload map mới cho area_id = 1 (đã có map cũ)
2. Hệ thống tìm thấy map cũ cho area_id = 1
3. **Xóa map cũ**
4. Lưu map mới vào database
5. Response: `action: "replaced"`
6. Log ghi nhận: "Deleted existing map for area_id 1"

---

## Cấu Trúc Database

### Collection: `maps`

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "area_id": 1,  // Custom area ID (integer)
  "data": {      // Map data - có thể là bất kỳ structure nào
    "nodes": [...],
    "connections": [...],
    "metadata": {...}
  },
  "created_at": ISODate("2025-10-09T10:30:00Z"),
  "updated_at": ISODate("2025-10-09T10:30:00Z")
}
```

### Index Đề Xuất

```javascript
// Unique index trên area_id để đảm bảo mỗi area chỉ có 1 map
db.maps.createIndex({ "area_id": 1 }, { unique: true })
```

---

## Quy Tắc & Logic

1. **Mỗi area chỉ có 1 map:** 
   - Khi save map mới, map cũ sẽ tự động bị xóa
   - Không cần phải xóa thủ công trước khi cập nhật

2. **area_id là số nguyên (integer):**
   - Ví dụ: 1, 2, 3, 100, 999

3. **Map data linh hoạt:**
   - Có thể lưu bất kỳ structure JSON nào
   - Không có validation cứng cho structure

4. **Timestamp tự động:**
   - `created_at`: Thời điểm tạo map
   - `updated_at`: Thời điểm cập nhật gần nhất

---

## Error Handling

### Lỗi Thường Gặp:

**1. Area ID không hợp lệ:**
```json
{
  "detail": "Invalid area_id format"
}
```

**2. Map không tồn tại (khi GET hoặc DELETE):**
```json
{
  "detail": "Map not found for area_id 1"
}
```

**3. Server error:**
```json
{
  "detail": "Failed to save map: Connection timeout"
}
```

---

## Ví Dụ Sử Dụng Trong Frontend

### JavaScript/React Example:

```javascript
// 1. Lưu/Cập nhật map
async function saveMap(areaId, mapData) {
  try {
    const response = await fetch(`/api/areas/${areaId}/map`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(mapData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`Map ${result.data.action}!`);
      // "created" hoặc "replaced"
    }
  } catch (error) {
    console.error('Error saving map:', error);
  }
}

// 2. Lấy map
async function getMap(areaId) {
  try {
    const response = await fetch(`/api/areas/${areaId}/map`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.data.data; // Map data
    } else {
      console.log('Map not found');
      return null;
    }
  } catch (error) {
    console.error('Error getting map:', error);
  }
}

// 3. Xóa map
async function deleteMap(areaId) {
  try {
    const response = await fetch(`/api/areas/${areaId}/map`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Map deleted successfully');
    }
  } catch (error) {
    console.error('Error deleting map:', error);
  }
}

// Sử dụng:
const mapData = {
  nodes: [
    { id: 'node1', x: 100, y: 200, type: 'supply' },
    { id: 'node2', x: 300, y: 400, type: 'storage' }
  ],
  connections: [
    { from: 'node1', to: 'node2', type: 'path' }
  ],
  metadata: {
    width: 1000,
    height: 800,
    scale: 1.0
  }
};

await saveMap(1, mapData);
```

---

## Testing

### Test Case 1: Lưu Map Lần Đầu
```bash
# 1. Kiểm tra chưa có map
curl -X GET "http://localhost:8000/api/areas/1/map"
# Expected: 404 Not Found

# 2. Lưu map mới
curl -X POST "http://localhost:8000/api/areas/1/map" \
  -H "Content-Type: application/json" \
  -d '{"nodes": [{"id": "test"}]}'
# Expected: action = "created"

# 3. Verify map đã được lưu
curl -X GET "http://localhost:8000/api/areas/1/map"
# Expected: 200 OK với data
```

### Test Case 2: Cập Nhật Map (Replace)
```bash
# 1. Lưu map lần đầu
curl -X POST "http://localhost:8000/api/areas/1/map" \
  -H "Content-Type: application/json" \
  -d '{"version": "1.0"}'

# 2. Lưu map lần 2 (sẽ replace)
curl -X POST "http://localhost:8000/api/areas/1/map" \
  -H "Content-Type: application/json" \
  -d '{"version": "2.0"}'
# Expected: action = "replaced"

# 3. Verify chỉ có version 2.0
curl -X GET "http://localhost:8000/api/areas/1/map"
# Expected: data có version = "2.0"
```

### Test Case 3: Xóa Map
```bash
# 1. Xóa map
curl -X DELETE "http://localhost:8000/api/areas/1/map"
# Expected: success = true

# 2. Verify map đã bị xóa
curl -X GET "http://localhost:8000/api/areas/1/map"
# Expected: 404 Not Found
```

---

## Lưu Ý Quan Trọng

1. ✅ **Tự động replace:** Không cần DELETE trước khi POST map mới
2. ✅ **area_id là integer:** Đảm bảo sử dụng số, không phải string
3. ✅ **Map data linh hoạt:** Có thể lưu bất kỳ JSON structure nào
4. ✅ **Mỗi area 1 map:** Không thể có nhiều map cho cùng 1 area
5. ✅ **Logging đầy đủ:** Mọi action đều được log để tracking

---

## Changelog

- **2025-10-09:** Initial version - Thêm tính năng quản lý map theo area_id

