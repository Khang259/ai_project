# Area ID Mapping và API Calls

## Vấn đề đã được giải quyết

### 🔍 **Phân tích vấn đề:**

1. **Frontend (DashboardLayout.jsx)**:
   - Sử dụng `areaId` từ mock data
   - Context cung cấp `currAreaId` và `currAreaName`

2. **Backend API**:
   - Endpoint: `POST /areas/{area_id}/map`
   - Parameter: `area_id: int`
   - Database field: `area_id`

3. **mapService.js**:
   - Cần gọi đúng URL với `area_id`
   - Sử dụng `currAreaId` từ context

### ✅ **Giải pháp đã implement:**

#### 1. **mapService.js** - Sửa URL và parameter names:
```javascript
// ✅ ĐÚNG: URL path với /areas/{area_id}/map
const response = await api.post(`/areas/${area_id}/map`, mapData);

// ✅ ĐÚNG: Parameter name nhất quán
export const saveMapToBackend = async (area_id, mapData) => {
  // Sử dụng area_id trong tất cả log và error messages
}
```

#### 2. **useZipImport.jsx** - Sử dụng currAreaId từ context:
```javascript
// ✅ ĐÚNG: Import AreaContext
import { useArea } from '@/contexts/AreaContext';

// ✅ ĐÚNG: Sử dụng currAreaId từ context
const { currAreaId } = useArea();

// ✅ ĐÚNG: Default parameter sử dụng currAreaId
const handleZipImport = useCallback((file, setMapData, setSecurityConfig, setSelectedAvoidanceMode, areaId = currAreaId) => {
```

#### 3. **DashboardLayout.jsx** - Area selection:
```javascript
// ✅ ĐÚNG: Area data structure
const areaData = [
  { areaId: 1, title: "Honda_HN", areaName: "Honda_HN" },
  { areaId: 2, title: "MS2", areaName: "MS2" }
];

// ✅ ĐÚNG: Set currAreaId khi chọn area
const handleAreaSelect = (areaName) => {
  const selected = areaData.find((a) => a.areaName === areaName);
  if (selected) {
    setCurrAreaName(selected.areaName);
    setCurrAreaId(selected.areaId); // ← Đây là giá trị được sử dụng
  }
};
```

## Luồng hoạt động hoàn chỉnh

### 1. **User chọn Area**
```
DashboardLayout → handleAreaSelect() → setCurrAreaId(areaId)
```

### 2. **User import ZIP file**
```
MapImport → handleZipImport() → useZipImport hook
```

### 3. **useZipImport sử dụng currAreaId**
```
useZipImport → currAreaId từ AreaContext → saveMapToBackendAsync(currAreaId)
```

### 4. **mapService gọi API**
```
mapService → POST /areas/{currAreaId}/map → Backend
```

### 5. **Backend xử lý**
```
Backend → area_service.save_map(data, area_id) → MongoDB collection "maps"
```

## API Endpoints Mapping

| Frontend Context | API Call | Backend Parameter | Database Field |
|------------------|----------|-------------------|----------------|
| `currAreaId: 1` | `POST /areas/1/map` | `area_id: int` | `area_id: 1` |
| `currAreaId: 2` | `POST /areas/2/map` | `area_id: int` | `area_id: 2` |

## Testing Scenarios

### ✅ **Test Case 1: Area Honda_HN (ID: 1)**
1. User chọn "Honda_HN" trong dropdown
2. `currAreaId = 1`
3. Import ZIP file
4. API call: `POST /areas/1/map`
5. Map được lưu với `area_id: 1` trong MongoDB

### ✅ **Test Case 2: Area MS2 (ID: 2)**
1. User chọn "MS2" trong dropdown  
2. `currAreaId = 2`
3. Import ZIP file
4. API call: `POST /areas/2/map`
5. Map được lưu với `area_id: 2` trong MongoDB

## Error Handling

### ❌ **Common Errors Fixed:**
1. **URL Path Error**: `/${area_id}/map` → `/areas/${area_id}/map`
2. **Parameter Name Mismatch**: `areaId` vs `area_id`
3. **Hardcoded Area ID**: `areaId = 1` → `areaId = currAreaId`
4. **Context Not Used**: Import và sử dụng `useArea()`

### ✅ **Current Error Messages:**
- `Area với ID ${area_id} không tồn tại` (404)
- `Bạn cần đăng nhập để lưu map` (401)
- `Bạn không có quyền lưu map` (403)

## Debugging Tips

### 1. **Check currAreaId Value:**
```javascript
console.log('Current Area ID:', currAreaId);
```

### 2. **Check API URL:**
```javascript
console.log(`[MapService] Đang lưu map cho area_id: ${area_id}`);
// Should log: "Đang lưu map cho area_id: 1" (or 2)
```

### 3. **Check Network Tab:**
- Request URL: `POST /areas/1/map` (or `/areas/2/map`)
- Request Body: Map data object
- Response: `{ success: true, data: {...}, message: "Map saved successfully" }`

## Summary

✅ **Đã sửa tất cả vấn đề về area_id mapping:**
- URL path đúng: `/areas/{area_id}/map`
- Parameter names nhất quán: `area_id`
- Sử dụng `currAreaId` từ context thay vì hardcode
- Error handling với đúng parameter names
- Dependency arrays cập nhật đúng

**Kết quả**: Map import sẽ tự động lưu vào đúng area được chọn trong dropdown, không còn hardcode area ID.
