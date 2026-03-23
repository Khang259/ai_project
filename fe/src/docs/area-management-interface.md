# Area Management Interface

## Tổng quan
Đã tạo giao diện quản lý Area theo dạng bảng giống như trong hình ảnh, với đầy đủ chức năng CRUD và filtering.

## Cấu trúc Components

### 1. **Area.jsx** - Main Page
```javascript
// src/pages/Area.jsx
- AreaHeader: Header với title và buttons
- AreaFilters: Search và filter dropdown
- AreaTable: Bảng hiển thị dữ liệu với pagination
- AddAreaModal: Modal thêm area mới
```

### 2. **AreaHeader.jsx** - Header Component
```javascript
// Features:
- Title "Area" 
- "Add" button (blue)
- "Table Settings" button (outline)
- Responsive layout
```

### 3. **AreaFilters.jsx** - Filter Component
```javascript
// Features:
- Area dropdown filter ("All Areas")
- Search input với placeholder "Please enter the account..."
- Search icon
- Responsive layout
```

### 4. **AreaTable.jsx** - Table Component
```javascript
// Features:
- 6 columns: Area ID, Area Name, Area Type, Associated Account, Associated Device, Operation
- Pagination với Previous/Next buttons
- Items per page selector (10, 20, 50, 100)
- Action buttons: Details, Edit, Delete
- Hover effects
- Responsive design
```

### 5. **AddAreaModal.jsx** - Modal Component
```javascript
// Features:
- Form validation
- Area ID input (number)
- Area Name input (text)
- Error handling
- Loading states
- Cancel/Submit buttons
```

### 6. **useAreas.js** - Custom Hook
```javascript
// Features:
- Fetch areas từ API
- Search và filter functionality
- CRUD operations (Create, Read, Update, Delete)
- Error handling với fallback
- Loading states
```

## Data Structure

### API Response Format
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "area_id": 1,
  "area_name": "Honda_HN", 
  "created_by": "admin",
  "created_at": "2023-09-05T10:30:00Z",
  "updated_at": "2023-09-05T10:30:00Z"
}
```

### Table Display Format
```javascript
{
  area_id: 1,
  area_name: "Honda_HN",
  areaType: "Do not Support Cross area",
  associatedAccount: "doan、duc_beo、khang、linh",
  associatedDevice: "---" // hoặc "0001、0002、0003、0004、0005、..."
}
```

## UI Features

### ✅ **Header Section**
- Clean title "Area"
- Blue "Add" button với Plus icon
- Outline "Table Settings" button với Settings icon

### ✅ **Filter Section**
- Area dropdown với "All Areas" default
- Search input với magnifying glass icon
- Placeholder text "Please enter the account..."

### ✅ **Table Section**
- 6 columns với proper headers
- Hover effects trên rows
- Action links: Details, Edit, Delete
- Responsive design với horizontal scroll

### ✅ **Pagination Section**
- Previous/Next navigation arrows
- Current page indicator (blue square)
- Items per page selector
- Total pages display

### ✅ **Modal Section**
- Clean dialog design
- Form validation
- Error messages
- Loading states
- Cancel/Submit buttons

## Functionality

### 🔍 **Search & Filter**
```javascript
// Search by:
- Area Name
- Area ID
- Created By

// Filter by:
- All Areas
- Specific Area Name
```

### 📄 **Pagination**
```javascript
// Features:
- Previous/Next navigation
- Current page indicator
- Items per page: 10, 20, 50, 100
- Total pages calculation
```

### ✏️ **CRUD Operations**
```javascript
// Create: Add new area via modal
// Read: Display areas in table
// Update: Edit existing area
// Delete: Remove area with confirmation
```

### 🛡️ **Error Handling**
```javascript
// API Errors:
- Network errors → Fallback to mock data
- Authentication errors → Clear error messages
- Validation errors → Form field errors

// UI States:
- Loading states
- Error messages
- Empty states
```

## Styling

### 🎨 **Design System**
- Clean white background
- Light grey borders
- Blue accent color (#2563eb)
- Consistent spacing và typography
- Hover effects và transitions

### 📱 **Responsive Design**
- Mobile-friendly layout
- Horizontal scroll cho table
- Flexible button sizes
- Adaptive spacing

## API Integration

### 🔌 **Endpoints Used**
```javascript
GET /areas          // Fetch all areas
POST /areas         // Create new area
PUT /areas/{id}     // Update area
DELETE /areas/{id}  // Delete area
```

### 🔐 **Authentication**
- Bearer token từ localStorage
- Automatic token refresh
- Error handling cho 401/403

## Usage Example

### 1. **Basic Usage**
```javascript
import AreaDashboard from '@/pages/Area';

// Trong App.jsx
<Route path="/area" element={<AreaDashboard />} />
```

### 2. **Custom Hook Usage**
```javascript
import { useAreas } from '@/hooks/Area/useAreas';

const {
  areas,
  filteredAreas,
  loading,
  error,
  search,
  setSearch,
  handleAddArea,
  handleUpdateArea,
  handleDelete
} = useAreas();
```

### 3. **Component Usage**
```javascript
import AreaTable from '@/components/Area/AreaTable';

<AreaTable
  areas={filteredAreas}
  onEdit={handleEditArea}
  onDelete={handleDeleteArea}
/>
```

## Testing Scenarios

### ✅ **Test Case 1: Load Areas**
1. Page loads → API call to GET /areas
2. Loading state displayed
3. Areas loaded → Table populated
4. Pagination calculated

### ✅ **Test Case 2: Search Areas**
1. User types in search box
2. Table filters in real-time
3. Pagination updates
4. Results highlighted

### ✅ **Test Case 3: Add Area**
1. Click "Add" button → Modal opens
2. Fill form → Validation runs
3. Submit → API call to POST /areas
4. Success → Modal closes, table updates

### ✅ **Test Case 4: Edit Area**
1. Click "Edit" link → Modal opens with data
2. Modify fields → Validation runs
3. Submit → API call to PUT /areas/{id}
4. Success → Modal closes, table updates

### ✅ **Test Case 5: Delete Area**
1. Click "Delete" link → Confirmation
2. Confirm → API call to DELETE /areas/{id}
3. Success → Row removed from table

## Benefits

### ✅ **User Experience**
- Intuitive interface giống design reference
- Fast search và filtering
- Smooth pagination
- Clear error messages

### ✅ **Developer Experience**
- Clean component structure
- Reusable hooks
- Type safety
- Easy to maintain

### ✅ **Performance**
- Efficient filtering với useMemo
- Pagination để handle large datasets
- Lazy loading states
- Optimized re-renders

## Summary

✅ **Hoàn thành giao diện Area management:**
- Clean table layout giống design reference
- Full CRUD functionality
- Search và filter capabilities
- Pagination với customizable items per page
- Modal forms với validation
- Error handling và loading states
- Responsive design
- API integration với fallback

**Kết quả**: Giao diện Area management hoàn chỉnh với đầy đủ chức năng, giống như trong hình ảnh reference, sẵn sàng sử dụng trong production.
