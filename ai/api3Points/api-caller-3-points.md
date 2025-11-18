# HƯỚNG DẪN SỬ DỤNG: User-Controlled End Slots cho Normal Pairs

## 📋 TỔNG QUAN

Đã thay đổi logic publish **NORMAL PAIRS** (không ảnh hưởng dual pairs):

### Logic CŨ:
- `start_qr` == shelf (AI detect) AND `end_qrs` == empty (AI detect) → Publish pair

### Logic MỚI:
- `start_qr` == shelf (AI detect) AND `end_qrs` == empty (**User POST API**) → Publish pair
- Mặc định: Tất cả `end_qrs` == shelf
- Sau khi publish: Tự động reset `end_qrs` → shelf

---

## 🚀 KHỞI ĐỘNG HỆ THỐNG

### 1. Start API Handler (Terminal 1)
```bash
cd D:\WORK\ROI_LOGIC
python api_handler.py
```

Hoặc với uvicorn:
```bash
uvicorn api_handler:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Start Stable Pair Processor (Terminal 2)
```bash
cd D:\WORK\ROI_LOGIC\logic
python stable_pair_processor.py
```

### 3. Start ROI Processor (Terminal 3)
```bash
cd D:\WORK\ROI_LOGIC
python roi_processor.py
```

---

## 🔌 API ENDPOINTS

### Base URL
```
http://localhost:8001
```

### 1. Đánh dấu End Slot là Empty (Sẵn sàng nhận hàng)

**Endpoint**: `POST /api/request-end-slot`

**Request Body**:
```json
{
  "end_qr": 10000004,
  "reason": "ready_to_receive"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Đã đánh dấu end slot 10000004 là empty",
  "data": {
    "end_qr": 10000004,
    "status": "empty",
    "reason": "ready_to_receive",
    "timestamp": "2024-01-15T14:30:45.123456Z",
    "source": "user_api"
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:8001/api/request-end-slot \
  -H "Content-Type: application/json" \
  -d '{"end_qr": 10000004, "reason": "ready_to_receive"}'
```

---

### 2. Hủy Yêu Cầu End Slot (Đánh dấu lại là Shelf)

**Endpoint**: `POST /api/cancel-end-slot`

**Request Body**:
```json
{
  "end_qr": 10000004,
  "reason": "not_ready"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Đã hủy yêu cầu cho end slot 10000004",
  "data": {
    "end_qr": 10000004,
    "status": "shelf",
    "reason": "not_ready",
    "timestamp": "2024-01-15T14:31:00.123456Z",
    "source": "user_api"
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:8001/api/cancel-end-slot \
  -H "Content-Type: application/json" \
  -d '{"end_qr": 10000004, "reason": "not_ready"}'
```

---

### 3. Xem Trạng Thái End Slots

**Endpoint**: `GET /api/end-slots-status`

**Response**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "end_qr": 10000004,
      "status": "empty",
      "reason": "ready_to_receive",
      "timestamp": "2024-01-15T14:30:45.123456Z"
    },
    {
      "end_qr": 10000005,
      "status": "shelf",
      "reason": "not_ready",
      "timestamp": "2024-01-15T14:31:00.123456Z"
    }
  ]
}
```

**cURL Example**:
```bash
curl http://localhost:8001/api/end-slots-status
```

---

## 📊 LUỒNG HOẠT ĐỘNG

```
┌─────────────────────────────────────────────┐
│  1. KHỞI ĐỘNG HỆ THỐNG                      │
│  ├─ Stable Pair Processor load config       │
│  ├─ Tất cả end_qrs trong "pairs" = shelf    │
│  └─ Sẵn sàng nhận API requests              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  2. NGƯỜI DÙNG GỬI YÊU CẦU                  │
│  POST /api/request-end-slot                 │
│  Body: {"end_qr": 10000004}                 │
│  → end_qr=10000004 được đánh dấu empty      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  3. AI PHÁT HIỆN (Tự động)                  │
│  ├─ Camera giám sát start_qr=10000001       │
│  └─ Phát hiện: start_qr có shelf (stable)   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  4. STABLE PAIR PROCESSOR ĐÁNH GIÁ          │
│  Điều kiện:                                 │
│  ├─ start_qr=10000001: shelf ✓ (AI)         │
│  ├─ end_qr=10000004: empty ✓ (USER API)     │
│  └─ → PUBLISH PAIR: 10000001 → 10000004     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  5. TỰ ĐỘNG RESET SAU PUBLISH               │
│  └─ end_qr=10000004 → shelf (tự động)       │
│     (Cần request lại nếu muốn dùng tiếp)    │
└─────────────────────────────────────────────┘
```

---

## 📝 VÍ DỤ THỰC TẾ

### Scenario: Có 1 start slot với 2 end slots có thể chọn

**Config trong `slot_pairing_config.json`**:
```json
{
  "pairs": [
    {
      "start_qr": 10000001,
      "end_qrs": [10000004, 10000005]
    }
  ]
}
```

**Bước 1: Khởi tạo**
- `end_qr=10000004` → shelf (mặc định)
- `end_qr=10000005` → shelf (mặc định)

**Bước 2: User request end slot 10000004**
```bash
curl -X POST http://localhost:8001/api/request-end-slot \
  -H "Content-Type: application/json" \
  -d '{"end_qr": 10000004}'
```
- `end_qr=10000004` → empty ✓
- `end_qr=10000005` → shelf

**Bước 3: AI phát hiện start_qr có shelf**
- `start_qr=10000001` → shelf (stable 10s) ✓

**Bước 4: System publish pair**
```
[PAIR_LOGIC_USER] 1/2 end_qrs empty (user request) cho start_qr=10000001, chọn end_qr=10000004
STABLE_PAIR_PUBLISHED: pair_id=10000001 -> 10000004
[AUTO_RESET] Đã reset end_qr=10000004 → shelf sau khi publish pair
```

**Bước 5: Sau khi publish**
- `end_qr=10000004` → shelf (tự động reset)
- `end_qr=10000005` → shelf

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Chỉ ảnh hưởng Normal Pairs
- **Dual pairs KHÔNG thay đổi**: Logic 2P/4P vẫn hoạt động như cũ (AI detect tất cả)
- Chỉ có **normal pairs** trong section `"pairs"` sử dụng user API

### 2. Auto Reset
- Sau khi publish pair, `end_qr` TỰ ĐỘNG được đánh dấu lại là `shelf`
- Nếu muốn sử dụng lại, phải gọi API `/request-end-slot` lần nữa

### 3. Trạng thái mặc định
- Tất cả `end_qrs` trong config khởi tạo là `shelf`
- Chỉ khi nào user POST API thì mới chuyển sang `empty`

### 4. Priority
- Nếu có nhiều `end_qrs` được đánh dấu `empty`, sẽ chọn theo thứ tự trong config
- End slot đầu tiên trong list có độ ưu tiên cao nhất

---

## 🔍 TROUBLESHOOTING

### Vấn đề 1: API không hoạt động
```bash
# Check API có running không
curl http://localhost:8001/api/end-slots-status

# Nếu không response, restart API handler
python api_handler.py
```

### Vấn đề 2: Pair không được publish dù đã request end slot
**Kiểm tra**:
1. `start_qr` có shelf stable chưa? (cần 10s)
2. `end_qr` có trong config `pairs` không?
3. Kiểm tra log của stable_pair_processor

**Log mong đợi**:
```
[END_SLOT_REQUEST] Đã cập nhật end_qr=10000004 → empty (từ người dùng)
[PAIR_LOGIC_USER] 1/2 end_qrs empty (user request) cho start_qr=10000001, chọn end_qr=10000004
STABLE_PAIR_PUBLISHED: pair_id=10000001 -> 10000004
[AUTO_RESET] Đã reset end_qr=10000004 → shelf sau khi publish pair
```

### Vấn đề 3: End slot không reset về shelf
- Kiểm tra log: `[AUTO_RESET] Đã reset end_qr=... → shelf`
- Nếu không thấy → pair chưa được publish
- Nếu thấy nhưng vẫn empty → bug, report ngay

---

## 📊 MONITORING & LOGS

### Stable Pair Processor Logs
```bash
# Log khi nhận user request
[END_SLOT_REQUEST] Đã cập nhật end_qr=10000004 → empty (từ người dùng)

# Log khi evaluate pair
[PAIR_LOGIC_USER] 1/2 end_qrs empty (user request) cho start_qr=10000001, chọn end_qr=10000004

# Log khi publish thành công
STABLE_PAIR_PUBLISHED: pair_id=10000001 -> 10000004, start_slot=10000001, end_slot=10000004

# Log auto reset
[AUTO_RESET] Đã reset end_qr=10000004 → shelf sau khi publish pair
```

### API Handler Logs
```bash
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

---

## 🔧 CẤU HÌNH

### Thay đổi port API
Trong `api_handler.py`:
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Đổi port ở đây
```

### Thay đổi stable time
Trong `stable_pair_processor.py` khi khởi tạo:
```python
proc = StablePairProcessor(
    stable_seconds=10.0,  # Thời gian cần stable (giây)
    cooldown_seconds=5.0  # Thời gian cooldown giữa các lần publish
)
```

---

## 📚 TÀI LIỆU THAM KHẢO

- **File thay đổi**:
  - `api_handler.py` (mới)
  - `logic/stable_pair_processor.py` (sửa)
  
- **File không đổi**:
  - `roi_processor.py` (giữ nguyên)
  - Logic dual pairs (giữ nguyên)

- **Docs khác**:
  - `docs/README_stable_pair_processor_analysis.md` (nếu có)
  - `docs/DUAL_4P_SUMMARY.txt`

---

**Version**: 1.0  
**Last Updated**: 2024-01-15  
**Author**: AI Assistant

