# Changelog: Area ID Tùy Chỉnh

## Ngày: 9 tháng 10, 2025

### Tổng Quan Thay Đổi

Đã thêm tính năng **area_id tùy chỉnh** cho phép người dùng tự định nghĩa ID cho mỗi area thay vì chỉ dùng MongoDB ObjectId.

---

## Files Đã Thay Đổi

### 1. `backend/app/schemas/area.py`

#### Thay đổi:
- ✅ Thêm trường `area_id` vào `AreaCreate` (bắt buộc)
- ✅ Thêm trường `area_id` vào `AreaOut`
- ✅ Thêm trường `area_id` vào `AreaUpdate` (optional)
- ✅ Import `Field` từ pydantic để thêm description

#### Code mới:
```python
class AreaCreate(BaseModel):
    area_id: str = Field(..., description="Custom area ID (e.g., AREA001, AREA002)")
    area_name: str

class AreaOut(BaseModel):
    id: str  # MongoDB ObjectId
    area_id: str  # Custom area ID
    area_name: str
    created_by: str
    created_at: datetime
    updated_at: datetime

class AreaUpdate(BaseModel):
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    created_by: Optional[str] = None
```

---

### 2. `backend/app/services/area_service.py`

#### Thay đổi:

**Hàm `create_area()`:**
- ✅ Thêm validation kiểm tra `area_id` đã tồn tại chưa
- ✅ Lưu `area_id` vào database
- ✅ Update log message

**Hàm `update_area()`:**
- ✅ Thêm validation kiểm tra `area_id` mới có bị trùng không
- ✅ Cho phép cập nhật `area_id`

**Hàm mới:**
- ✅ `get_area_by_area_id()`: Lấy area theo custom area_id

#### Code validation mới:
```python
# Trong create_area()
existing_id = await areas.find_one({"area_id": area_in.area_id})
if existing_id:
    raise ValueError("Area ID already exists")

# Trong update_area()
if "area_id" in update_data:
    existing_id = await areas.find_one({
        "area_id": update_data["area_id"],
        "_id": {"$ne": ObjectId(area_id)}
    })
    if existing_id:
        raise ValueError("Area ID already exists")
```

---

### 3. `backend/app/api/area.py`

#### Thay đổi:
- ✅ Import hàm `get_area_by_area_id` từ service
- ✅ Thêm endpoint mới: `GET /areas/by-area-id/{area_id}`

**Endpoint mới:**
```python
@router.get("/by-area-id/{area_id}", response_model=AreaOut)
async def get_area_by_custom_id(area_id: str):
    """Lấy area theo custom area_id (vd: AREA001)"""
    area = await get_area_by_area_id(area_id)
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Area with area_id '{area_id}' not found"
        )
    return area
```

---

## Files Mới

### 1. `backend/docs/AREA_ID_USAGE.md`
- ✅ Hướng dẫn chi tiết cách sử dụng area_id tùy chỉnh
- ✅ Ví dụ API calls
- ✅ Best practices đặt tên
- ✅ Validation rules

### 2. `backend/app/services/migrate_area_id.py`
- ✅ Script migration để cập nhật dữ liệu cũ
- ✅ Hàm `migrate_area_ids()`: Auto-generate area_id cho dữ liệu cũ
- ✅ Hàm `preview_migration()`: Xem trước migration
- ✅ Hàm `add_custom_area_ids()`: Thêm area_id tùy chỉnh theo mapping
- ✅ Hàm `rollback_migration()`: Rollback nếu cần

### 3. `backend/docs/CHANGELOG_AREA_ID.md`
- ✅ File này - tóm tắt tất cả thay đổi

---

## API Endpoints Mới

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/areas/by-area-id/{area_id}` | Lấy area theo custom area_id |

---

## Breaking Changes

### ⚠️ Cần Chú Ý:

1. **Tạo area mới bây giờ yêu cầu `area_id`:**
   ```json
   // Trước:
   {
     "area_name": "Kho A"
   }
   
   // Bây giờ:
   {
     "area_id": "WAREHOUSE_A",
     "area_name": "Kho A"
   }
   ```

2. **Dữ liệu cũ cần migration:**
   - Areas đã tồn tại chưa có `area_id`
   - Cần chạy migration script: `python -m app.services.migrate_area_id`

---

## Validation Rules

| Rule | Mô Tả |
|------|-------|
| Unique `area_id` | Không được trùng với bất kỳ area nào khác |
| Unique `area_name` | Không được trùng với bất kỳ area nào khác |
| Required `area_id` | Bắt buộc khi tạo area mới |
| Case Sensitive | `AREA001` khác `area001` |

---

## Migration Steps

### Bước 1: Backup Database
```bash
mongodump --db your_database_name --out ./backup
```

### Bước 2: Preview Migration
```bash
cd backend
source venv/bin/activate  # hoặc venv\Scripts\activate trên Windows
python -c "from app.services.migrate_area_id import preview_migration; import asyncio; asyncio.run(preview_migration())"
```

### Bước 3: Chạy Migration
```bash
python -c "from app.services.migrate_area_id import migrate_area_ids; import asyncio; asyncio.run(migrate_area_ids())"
```

### Bước 4: Kiểm Tra
```bash
# Gọi API để kiểm tra
curl -X GET "http://localhost:8000/api/areas/"
```

---

## Ví Dụ Sử Dụng

### Tạo Area Mới

```bash
curl -X POST "http://localhost:8000/api/areas/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "area_id": "WAREHOUSE_A",
    "area_name": "Kho hàng A"
  }'
```

### Tìm Area Theo Custom ID

```bash
curl -X GET "http://localhost:8000/api/areas/by-area-id/WAREHOUSE_A" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Cập Nhật Area ID

```bash
curl -X PUT "http://localhost:8000/api/areas/507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "area_id": "WAREHOUSE_A_FLOOR1",
    "area_name": "Kho hàng A - Tầng 1"
  }'
```

---

## Testing Checklist

- [ ] Tạo area mới với area_id tùy chỉnh
- [ ] Kiểm tra validation: không được tạo 2 area cùng area_id
- [ ] Kiểm tra validation: không được tạo 2 area cùng area_name
- [ ] Tìm area theo area_id tùy chỉnh
- [ ] Tìm area theo MongoDB ID
- [ ] Cập nhật area_id
- [ ] Kiểm tra lỗi khi cập nhật area_id trùng
- [ ] Chạy migration cho dữ liệu cũ
- [ ] Verify tất cả areas có area_id

---

## Rollback Plan

Nếu có vấn đề, bạn có thể rollback:

1. **Restore database từ backup:**
   ```bash
   mongorestore --db your_database_name ./backup/your_database_name
   ```

2. **Hoặc xóa area_id bằng migration tool:**
   ```bash
   python -m app.services.migrate_area_id
   # Chọn option 4: Rollback
   ```

3. **Revert code changes:**
   ```bash
   git checkout HEAD~1 backend/app/schemas/area.py
   git checkout HEAD~1 backend/app/services/area_service.py
   git checkout HEAD~1 backend/app/api/area.py
   ```

---

## Liên Hệ & Support

- **Developer:** AI Assistant
- **Date:** October 9, 2025
- **Version:** 1.0.0

Nếu có câu hỏi hoặc gặp vấn đề, vui lòng tạo issue hoặc liên hệ team.

