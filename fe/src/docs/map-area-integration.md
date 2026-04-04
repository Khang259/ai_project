# Map Area Integration Documentation

## Tổng quan

Tài liệu này mô tả việc tích hợp map với area management system, cho phép map tự động load theo area_id được chọn từ AreaContext.

## Tính năng đã implement

### 1. **Area Context Integration**
- ✅ AMRWarehouseMap sử dụng `useArea` context
- ✅ Lấy `currAreaId` và `currAreaName` từ context
- ✅ Tự động load map khi area thay đổi

### 2. **Backend API Integration**
- ✅ Sử dụng `getMapFromBackend(currAreaId)` từ mapService
- ✅ Gọi API `GET /areas/{area_id}/map` để lấy map data
- ✅ Xử lý response và error handling

### 3. **Loading States**
- ✅ Hiển thị loading spinner khi đang tải map
- ✅ Hiển thị tên area và area_id trong loading state
- ✅ UI responsive và user-friendly

### 4. **Error Handling**
- ✅ Hiển thị error state khi không thể tải map
- ✅ Fallback về localStorage nếu API fail
- ✅ Error message chi tiết cho debugging

### 5. **Fallback Mechanism**
- ✅ Kiểm tra localStorage nếu API fail
- ✅ Chỉ sử dụng localStorage nếu area_id khớp
- ✅ Clear error nếu fallback thành công

## Luồng hoạt động

### 1. **Initial Load**
```
User mở Dashboard → AreaContext load areas → Set default area → AMRWarehouseMap detect currAreaId → Load map từ backend
```

### 2. **Area Change**
```
User chọn area khác → AreaContext update currAreaId → AMRWarehouseMap detect change → Load map mới từ backend
```

### 3. **Error Handling**
```
API fail → Show error state → Check localStorage → Use fallback if available → Clear error if successful
```

## Code Changes

### AMRWarehouseMap.jsx

#### **Imports Added:**
```javascript
import { useArea } from '@/contexts/AreaContext';
import { getMapFromBackend } from '@/services/mapService';
```

#### **State Added:**
```javascript
// Area context
const { currAreaId, currAreaName } = useArea();

// Map loading states
const [mapLoading, setMapLoading] = useState(false);
const [mapError, setMapError] = useState(null);
```

#### **Main Logic:**
```javascript
// Load map data from backend based on current area_id
useEffect(() => {
  const loadMapFromBackend = async () => {
    if (!currAreaId) return;
    
    setMapLoading(true);
    setMapError(null);
    
    try {
      const result = await getMapFromBackend(currAreaId);
      if (result.success && result.data) {
        setMapData(result.data);
        // Save to localStorage as backup
        localStorage.setItem('mapData', JSON.stringify(result.data));
        localStorage.setItem('currentAreaId', currAreaId.toString());
      }
    } catch (error) {
      setMapError(error.message);
      // Fallback to localStorage
      const mapDataStr = localStorage.getItem('mapData');
      const storedAreaId = localStorage.getItem('currentAreaId');
      
      if (mapDataStr && storedAreaId === currAreaId.toString()) {
        setMapData(JSON.parse(mapDataStr));
        setMapError(null);
      }
    } finally {
      setMapLoading(false);
    }
  };

  loadMapFromBackend();
}, [currAreaId]); // Dependency on currAreaId
```

#### **UI States:**
```javascript
{/* Map Loading State */}
{mapLoading && (
  <div style={{ /* loading styles */ }}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
    <div>Đang tải bản đồ cho khu vực: {currAreaName || 'Unknown'}</div>
    <div>Area ID: {currAreaId}</div>
  </div>
)}

{/* Map Error State */}
{mapError && !mapLoading && (
  <div style={{ /* error styles */ }}>
    <div>⚠️</div>
    <div>Không thể tải bản đồ cho khu vực: {currAreaName || 'Unknown'}</div>
    <div>Area ID: {currAreaId}</div>
    <div>Lỗi: {mapError}</div>
  </div>
)}

{/* Map Content */}
{!mapLoading && !mapError && (
  <LeafletMap mapData={mapData} /* other props */ />
)}
```

## API Endpoints

### Backend API
- **GET** `/areas/{area_id}/map` - Lấy map data theo area_id
- **POST** `/areas/{area_id}/map` - Lưu map data cho area_id

### Response Format
```json
{
  "success": true,
  "data": {
    "nodeArr": [...],
    "lineArr": [...],
    "nodeKeys": [...],
    "lineKeys": [...]
  }
}
```

## Error Scenarios

### 1. **No Area Selected**
- Behavior: Skip map loading
- Log: `[AMRWarehouseMap] No currAreaId, skipping map load`

### 2. **API Error**
- Behavior: Show error state + try localStorage fallback
- Log: `[AMRWarehouseMap] ❌ Error loading map for area_id {id}: {error}`

### 3. **No Map Data**
- Behavior: Show error state
- Log: `No map data received from backend`

### 4. **localStorage Fallback Success**
- Behavior: Use cached data, clear error
- Log: `[AMRWarehouseMap] ⚠️ Using localStorage fallback for area_id: {id}`

## Testing

### Test Cases
1. ✅ **Area Selection**: Chọn area khác nhau và verify map load đúng
2. ✅ **Loading State**: Verify loading spinner hiển thị
3. ✅ **Error State**: Disconnect API và verify error handling
4. ✅ **Fallback**: Verify localStorage fallback hoạt động
5. ✅ **Map Rendering**: Verify map render đúng với data từ backend

### Manual Testing Steps
1. Mở Dashboard
2. Chọn area khác nhau từ dropdown
3. Verify map load đúng cho mỗi area
4. Test error scenarios (disconnect network)
5. Verify fallback mechanism

## Performance Considerations

### Optimizations
- ✅ Map chỉ load khi `currAreaId` thay đổi
- ✅ localStorage caching để giảm API calls
- ✅ Error handling không block UI
- ✅ Loading states để improve UX

### Memory Management
- ✅ Cleanup map instance khi component unmount
- ✅ Clear error states khi load thành công
- ✅ Efficient re-rendering với proper dependencies

## Future Enhancements

### Potential Improvements
1. **Map Caching**: Cache multiple maps trong memory
2. **Preloading**: Preload maps cho areas gần nhau
3. **Offline Support**: Better offline experience
4. **Map Validation**: Validate map data structure
5. **Real-time Updates**: WebSocket cho map updates

## Troubleshooting

### Common Issues
1. **Map không load**: Check API endpoint và authentication
2. **Loading state stuck**: Check network connection
3. **Error state không clear**: Check localStorage data
4. **Map render sai**: Check map data structure

### Debug Logs
- `[AMRWarehouseMap] Loading map for area_id: {id}`
- `[AMRWarehouseMap] ✅ Map loaded successfully`
- `[AMRWarehouseMap] ❌ Error loading map`
- `[AMRWarehouseMap] ⚠️ Using localStorage fallback`

## Conclusion

Map area integration đã được implement thành công với:
- ✅ Automatic map loading theo area_id
- ✅ Robust error handling và fallback
- ✅ User-friendly loading states
- ✅ Performance optimizations
- ✅ Comprehensive logging

Tính năng này đảm bảo map luôn hiển thị đúng cho area được chọn và có trải nghiệm người dùng tốt ngay cả khi có lỗi xảy ra.
