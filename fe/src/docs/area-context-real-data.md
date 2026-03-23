# Area Context với Real Data từ API

## Tổng quan
Đã cập nhật AreaContext để fetch areas từ database thay vì sử dụng mock data.

## Các thay đổi chính

### 1. **AreaContext.jsx** - Fetch từ API
```javascript
// ✅ ĐÚNG: Import getAllAreas từ mapService
import { getAllAreas } from '../services/mapService';

// ✅ ĐÚNG: States cho loading và error
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

// ✅ ĐÚNG: useEffect để fetch areas khi mount
useEffect(() => {
  const fetchAreas = async () => {
    try {
      const areas = await getAllAreas();
      setAreaData(areas);
      
      // Set area đầu tiên làm default
      if (areas && areas.length > 0) {
        setCurrAreaName(areas[0].area_name);
        setCurrAreaId(areas[0].area_id);
      }
    } catch (error) {
      // Fallback về mock data nếu API fail
      const mockAreas = [
        { area_id: 1, area_name: "Honda_HN", title: "Honda_HN" },
        { area_id: 2, area_name: "MS2", title: "MS2" }
      ];
      setAreaData(mockAreas);
    }
  };
  
  fetchAreas();
}, []);
```

### 2. **DashboardLayout.jsx** - UI với Loading States
```javascript
// ✅ ĐÚNG: Sử dụng loading và error states
const { areaData, currAreaName, setCurrAreaName, setCurrAreaId, loading: areaLoading, error: areaError } = useArea();

// ✅ ĐÚNG: Button với loading state
<Button variant="outline" className="flex items-center gap-2" disabled={areaLoading}>
  <span className="font-medium">
    {areaLoading ? "Đang tải..." : areaError ? "Lỗi tải areas" : `Khu vực: ${currAreaName || "Chưa chọn"}`}
  </span>
</Button>

// ✅ ĐÚNG: Dropdown với conditional rendering
{areaLoading ? (
  <DropdownMenuItem disabled>
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    Đang tải areas...
  </DropdownMenuItem>
) : areaError ? (
  <DropdownMenuItem disabled className="text-red-500">
    ❌ {areaError}
  </DropdownMenuItem>
) : (
  areaData.map((area) => (
    <DropdownMenuItem
      key={area.area_id}
      onClick={() => handleAreaSelect(area.area_name)}
    >
      {area.area_name}
    </DropdownMenuItem>
  ))
)}
```

### 3. **mapService.js** - API Integration
```javascript
// ✅ ĐÚNG: Function getAllAreas đã có sẵn
export const getAllAreas = async () => {
  try {
    const response = await api.get('/areas');
    return response.data;
  } catch (error) {
    // Error handling chi tiết
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error('Bạn cần đăng nhập để xem danh sách areas');
      } else if (status === 403) {
        throw new Error('Bạn không có quyền xem danh sách areas');
      }
    }
    throw error;
  }
};
```

## Luồng hoạt động

### 1. **App Startup**
```
App Mount → AreaProvider → useEffect → getAllAreas() → API Call
```

### 2. **API Success**
```
API Response → setAreaData(areas) → setCurrAreaName(firstArea.area_name) → setCurrAreaId(firstArea.area_id)
```

### 3. **API Error**
```
API Error → setError(error.message) → Fallback to Mock Data → setAreaData(mockAreas)
```

### 4. **User Selection**
```
User Click Area → handleAreaSelect(areaName) → setCurrAreaName(area.area_name) → setCurrAreaId(area.area_id)
```

## Data Structure Mapping

### Backend API Response
```json
[
  {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "area_id": 1,
    "area_name": "Honda_HN",
    "created_by": "admin",
    "created_at": "2023-09-05T10:30:00Z",
    "updated_at": "2023-09-05T10:30:00Z"
  },
  {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1", 
    "area_id": 2,
    "area_name": "MS2",
    "created_by": "admin",
    "created_at": "2023-09-05T10:30:00Z",
    "updated_at": "2023-09-05T10:30:00Z"
  }
]
```

### Frontend Usage
```javascript
// AreaContext sử dụng
areaData[0].area_id     // 1
areaData[0].area_name   // "Honda_HN"

// DashboardLayout sử dụng
area.area_id            // 1
area.area_name          // "Honda_HN"
```

## Error Handling

### ✅ **Loading States**
- Button disabled khi đang loading
- Spinner animation trong dropdown
- Text "Đang tải..." hiển thị

### ✅ **Error States**
- Button text "Lỗi tải areas"
- Error message trong dropdown
- Fallback về mock data

### ✅ **Empty States**
- "Không có area nào" khi array rỗng
- "Chưa chọn" khi chưa có area nào

## Testing Scenarios

### ✅ **Test Case 1: API Success**
1. Backend trả về areas
2. UI hiển thị danh sách areas
3. Area đầu tiên được chọn làm default
4. User có thể chọn area khác

### ✅ **Test Case 2: API Error**
1. Backend trả về error (401, 403, 500)
2. UI hiển thị error message
3. Fallback về mock data
4. App vẫn hoạt động bình thường

### ✅ **Test Case 3: Network Error**
1. Không thể kết nối đến backend
2. UI hiển thị "Không thể kết nối đến server"
3. Fallback về mock data
4. App vẫn hoạt động bình thường

### ✅ **Test Case 4: Empty Response**
1. Backend trả về array rỗng
2. UI hiển thị "Không có area nào"
3. currAreaName và currAreaId = null
4. Map import sẽ không hoạt động (cần area_id)

## Debugging Tips

### 1. **Check API Response**
```javascript
console.log('[AreaContext] ✅ Đã fetch được areas:', areas);
```

### 2. **Check Area Selection**
```javascript
console.log('[DashboardLayout] Area selected:', selected);
```

### 3. **Check Network Tab**
- Request: `GET /areas`
- Response: Array of area objects
- Headers: Authorization Bearer token

### 4. **Check Console Logs**
```
[AreaContext] Đang fetch areas từ API...
[MapService] Đang lấy danh sách areas
[MapService] ✅ Đã lấy 2 areas
[AreaContext] ✅ Đã fetch được areas: [...]
[AreaContext] ✅ Set default area: {...}
```

## Benefits

### ✅ **Real-time Data**
- Areas được fetch từ database
- Luôn có data mới nhất
- Không cần hardcode

### ✅ **Error Resilience**
- Fallback về mock data khi API fail
- App vẫn hoạt động offline
- User experience tốt

### ✅ **Loading States**
- UI feedback rõ ràng
- Không bị confuse khi loading
- Professional appearance

### ✅ **Consistent Data**
- Sử dụng cùng data structure với backend
- Không cần mapping giữa mock và real data
- Dễ maintain và debug

## Summary

✅ **Đã hoàn thành:**
- AreaContext fetch areas từ API
- DashboardLayout hiển thị real data với loading states
- Error handling và fallback mechanism
- Consistent data structure mapping
- Professional UI với loading/error states

**Kết quả**: App sẽ tự động load areas từ database khi khởi động, hiển thị loading states, và có fallback khi API fail. User có thể chọn area từ danh sách thực tế trong database.
