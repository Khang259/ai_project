# Post API - Hệ Thống Gửi Task Đến API Robot

## Tổng Quan

`postAPI.py` là module cuối cùng trong pipeline, chịu trách nhiệm:
- **Subscribe stable_pairs queue** để nhận thông báo về cặp slot ổn định
- **Tạo orderId monotonic** (tăng dần, không trùng lặp)
- **Build API payload** theo format yêu cầu
- **POST request đến API robot** để tạo task di chuyển kệ
- **Retry mechanism** với 3 lần thử khi request thất bại
- **Logging** chi tiết cho debugging và monitoring

## Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│                      Post API Runner                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Stable Pairs Subscriber                        │ │
│  │  - Topic: stable_pairs                                 │ │
│  │  - Global order (id ASC)                               │ │
│  │  - Consume all pairs sequentially                      │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Order ID Generator                             │ │
│  │  - Read from order_id.txt                              │ │
│  │  - Increment atomically                                │ │
│  │  - Write back to file                                  │ │
│  │  - Persistent across restarts                          │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Build API Payload                              │ │
│  │  {                                                     │ │
│  │    "modelProcessCode": "checking_camera_work",         │ │
│  │    "fromSystem": "ICS",                                │ │
│  │    "orderId": "12345",                                 │ │
│  │    "taskOrderDetail": [                                │ │
│  │      {"taskPath": "101,201"}                           │ │
│  │    ]                                                   │ │
│  │  }                                                     │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         HTTP POST Request                              │ │
│  │  - URL: http://192.168.1.169:7000/ics/taskOrder/...   │ │
│  │  - Headers: Content-Type: application/json            │ │
│  │  - Timeout: 10s                                        │ │
│  │  - Retry: 3 attempts with 2s delay                    │ │
│  └─────────────────┬──────────────────────────────────────┘ │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Response Handling                              │ │
│  │  - Check HTTP status (2xx)                             │ │
│  │  - Parse JSON response                                 │ │
│  │  - Validate response code (1000 = success)             │ │
│  │  - Log result                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Thành Phần Chi Tiết

### 1. Configuration Constants

```python
API_URL = "http://192.168.1.169:7000/ics/taskOrder/addTask"
DB_PATH = "../queues.db"         # Relative to postRq/ folder
ORDER_ID_FILE = "postRq/order_id.txt"
TOPIC = "stable_pairs"
```

**API_URL Components:**
- **Host:** `192.168.1.169:7000`
- **Endpoint:** `/ics/taskOrder/addTask`
- **Protocol:** HTTP (not HTTPS)

### 2. Order ID Management

#### 2.1 Persistent Storage

**File:** `postRq/order_id.txt`

**Format:** Plain text với một số nguyên
```
12345
```

**Why persistent?**
- Tránh trùng lặp orderId khi restart
- API yêu cầu orderId unique
- Monotonically increasing để tracking

#### 2.2 Get Next Order ID

```python
def get_next_order_id() -> int:
    ensure_dirs()  # Create postRq/ if not exists
    
    # First run: Initialize with 1
    if not os.path.exists(ORDER_ID_FILE):
        with open(ORDER_ID_FILE, "w") as f:
            f.write("1")
        return 1
    
    # Read current ID
    try:
        with open(ORDER_ID_FILE, "r+") as f:
            content = f.read().strip() or "0"
            current = int(content)
            next_id = current + 1
            
            # Write back incremented ID
            f.seek(0)
            f.write(str(next_id))
            f.truncate()
            
            return next_id
    except Exception:
        # Fallback: Reset to 1 if file corrupted
        with open(ORDER_ID_FILE, "w") as f:
            f.write("1")
        return 1
```

**Atomic Operation:**
- Open file in `r+` mode (read+write)
- Read current value
- Seek to beginning
- Write new value
- Truncate excess

**Error Handling:**
- File corrupt → Reset to 1
- Empty file → Treat as 0

#### 2.3 Order ID Sequence Example

```
Start: order_id.txt contains "100"

Call 1: get_next_order_id() → 101, file now "101"
Call 2: get_next_order_id() → 102, file now "102"
Call 3: get_next_order_id() → 103, file now "103"

Restart program

Call 4: get_next_order_id() → 104, file now "104"
```

### 3. Queue Operations

#### 3.1 List Keys

```python
def list_keys(queue, topic):
    with queue._connect() as conn:
        cur = conn.execute(
            "SELECT DISTINCT key FROM messages WHERE topic = ? ORDER BY key",
            (topic,)
        )
        return [row[0] for row in cur.fetchall()]
```

**Use case:** Discover all unique keys in a topic

#### 3.2 Get Latest Row

```python
def get_latest_topic_row(queue, topic):
    with queue._connect() as conn:
        cur = conn.execute(
            """
            SELECT id, key, payload, created_at 
            FROM messages
            WHERE topic = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (topic,)
        )
        row = cur.fetchone()
        
        if not row:
            return None
        
        return {
            "id": row[0],
            "key": row[1],
            "payload": json.loads(row[2]),
            "created_at": row[3]
        }
```

**Use case:** Get latest message across all keys in topic

#### 3.3 Get After ID (Global Order)

**Key Feature:** Preserve global order across all keys

```python
def get_after_id_topic(queue, topic, after_id, limit=100):
    with queue._connect() as conn:
        cur = conn.execute(
            """
            SELECT id, key, payload, created_at 
            FROM messages
            WHERE topic = ? AND id > ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (topic, after_id, limit)
        )
        rows = cur.fetchall()
        
        result = []
        for r in rows:
            result.append({
                "id": r[0],
                "key": r[1],
                "payload": json.loads(r[2]),
                "created_at": r[3]
            })
        
        return result
```

**Why global order?**

Consider:
```
id=100, key="101 -> 201", timestamp=T1
id=101, key="102 -> 202", timestamp=T2
id=102, key="101 -> 203", timestamp=T3
```

**Wrong approach** (per-key):
```python
# Get rows for key "101 -> 201"
# Get rows for key "102 -> 202"
# Get rows for key "101 -> 203"
# → Order: id 100, 102, 101 (wrong!)
```

**Right approach** (global order):
```python
# Get all rows with id > 99, order by id ASC
# → Order: id 100, 101, 102 (correct!)
```

**Benefit:** Tasks được xử lý theo thứ tự publish, bất kể key

### 4. API Payload

#### 4.1 Build Payload

```python
def build_payload(pair_id, start_slot, end_slot, order_id):
    task_path = f"{start_slot},{end_slot}"
    
    return {
        "modelProcessCode": "checking_camera_work",
        "fromSystem": "ICS",
        "orderId": str(order_id),
        "taskOrderDetail": [
            {
                "taskPath": task_path
            }
        ]
    }
```

**Field Descriptions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `modelProcessCode` | string | Process model identifier | `"checking_camera_work"` |
| `fromSystem` | string | Source system | `"ICS"` |
| `orderId` | string | Unique order ID | `"12345"` |
| `taskOrderDetail` | array | List of task details | See below |
| `taskPath` | string | Path từ start đến end | `"101,201"` |

**Example Payload:**
```json
{
  "modelProcessCode": "checking_camera_work",
  "fromSystem": "ICS",
  "orderId": "12345",
  "taskOrderDetail": [
    {
      "taskPath": "101,201"
    }
  ]
}
```

#### 4.2 Task Path Format

**Format:** `"{start_qr},{end_qr}"`

**Examples:**
- Start QR 101, End QR 201 → `"101,201"`
- Start QR 305, End QR 410 → `"305,410"`

**Note:** 
- Comma-separated, no spaces
- QR codes as strings (not integers)

### 5. HTTP Request

#### 5.1 Send POST

```python
def send_post(payload):
    headers = {"Content-Type": "application/json"}
    
    try:
        resp = requests.post(
            API_URL, 
            headers=headers, 
            data=json.dumps(payload), 
            timeout=10
        )
        
        # Check HTTP status
        status_ok = (200 <= resp.status_code < 300)
        
        # Parse response body
        try:
            body = resp.json()
        except Exception:
            body = {"raw": resp.text}
        
        # Validate success
        if status_ok:
            code = body.get("code") if isinstance(body, dict) else None
            
            if code is None or code == 1000:
                print(f"[OK] POST success | orderId={payload['orderId']} | "
                      f"taskPath={payload['taskOrderDetail'][0]['taskPath']} | "
                      f"resp={body}")
                return True
            else:
                print(f"[WARN] POST 2xx but code={code} | resp={body}")
                return False
        else:
            print(f"[ERR] HTTP {resp.status_code} | "
                  f"orderId={payload['orderId']} | resp={body}")
            return False
            
    except Exception as e:
        print(f"[ERR] POST exception: {e}")
        return False
```

#### 5.2 Response Handling

**Success Criteria:**

1. **HTTP status 2xx** (200-299)
2. **Response body is JSON**
3. **code field is 1000 or absent**

**Response Format (expected):**
```json
{
  "code": 1000,
  "message": "Success",
  "data": {...}
}
```

**Error Scenarios:**

| Scenario | HTTP | Code | Result |
|----------|------|------|--------|
| Success | 200 | 1000 | ✓ OK |
| Success (no code) | 200 | null | ✓ OK |
| Business error | 200 | 4001 | ✗ WARN |
| Server error | 500 | - | ✗ ERR |
| Network timeout | - | - | ✗ ERR (exception) |

#### 5.3 Retry Mechanism

```python
# Simple retry 3 times with 2s delay
ok = False
for attempt in range(3):
    if send_post(body):
        ok = True
        break
    time.sleep(2)  # Wait 2s before retry

if not ok:
    print(f"[FAIL] Could not POST after retries | pair_id={pair_id}")
```

**Retry Strategy:**
- **Max attempts:** 3
- **Delay:** 2 seconds (fixed)
- **No exponential backoff** (simple strategy)

**When to retry:**
- HTTP timeout
- Network error
- Server error (5xx)

**When NOT to retry:**
- HTTP 2xx with code != 1000 (business error)
- Malformed request (4xx)

### 6. Main Loop

```python
def main():
    print("PostAPI Runner - consuming stable_pairs and POSTing to API")
    print(f"DB: {DB_PATH} | API: {API_URL}")
    
    queue = SQLiteQueue(DB_PATH)
    
    # Initialize: Start from latest existing id (no backlog)
    last_global_id = 0
    latest_row = get_latest_topic_row(queue, TOPIC)
    if latest_row:
        last_global_id = latest_row["id"]
        print(f"Starting from latest existing id={last_global_id} (no backlog)")
    else:
        print("No existing rows. Waiting for new stable_pairs...")
    
    try:
        while True:
            # Read new rows in global order
            rows = get_after_id_topic(queue, TOPIC, last_global_id, limit=200)
            
            for r in rows:
                payload = r["payload"]
                last_global_id = r["id"]
                
                # Extract fields
                pair_id = payload.get("pair_id", r.get("key", ""))
                start_slot = str(payload.get("start_slot", ""))
                end_slot = str(payload.get("end_slot", ""))
                
                # Validate
                if not start_slot or not end_slot:
                    print(f"[SKIP] Invalid pair payload: {payload}")
                    continue
                
                # Get next order ID
                order_id = get_next_order_id()
                
                # Build payload
                body = build_payload(pair_id, start_slot, end_slot, order_id)
                
                # POST with retry
                ok = False
                for attempt in range(3):
                    if send_post(body):
                        ok = True
                        break
                    time.sleep(2)
                
                if not ok:
                    print(f"[FAIL] Could not POST after retries | pair_id={pair_id}")
            
            # Polling interval
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\nStopped by user.")
        return 0
```

**Flow:**

```
1. Initialize
   ├─> Load DB path, API URL
   └─> Get latest id (skip backlog)

2. Main loop
   │
   ├─> Poll new messages (500ms interval)
   │
   └─> For each message:
       ├─> Validate payload
       ├─> Get next order ID
       ├─> Build API payload
       ├─> POST with retry (3x)
       └─> Log result
```

### 7. Logging

#### 7.1 Log Levels

**[OK]** - Success
```
[OK] POST success | orderId=12345 | taskPath=101,201 | resp={'code': 1000, 'message': 'Success'}
```

**[WARN]** - HTTP 2xx but code != 1000
```
[WARN] POST 2xx but code=4001 | resp={'code': 4001, 'message': 'Invalid task path'}
```

**[ERR]** - HTTP error or exception
```
[ERR] HTTP 500 | orderId=12345 | resp={'error': 'Internal server error'}
[ERR] POST exception: ConnectTimeout: HTTPConnectionPool(host='192.168.1.169', port=7000): Max retries exceeded
```

**[SKIP]** - Invalid payload
```
[SKIP] Invalid pair payload: {'pair_id': '101 -> 201'}
```

**[FAIL]** - Failed after retries
```
[FAIL] Could not POST after retries | pair_id=101 -> 201
```

#### 7.2 Log Format

```
[LEVEL] Message | key1=value1 | key2=value2 | ...
```

**Benefits:**
- Easy to grep/filter
- Structured logging
- Machine parsable

## Sử Dụng

### Command Line

```bash
# Từ project root
python postRq/postAPI.py

# Hoặc từ postRq/
cd postRq
python postAPI.py
```

**Note:** Script tự động điều chỉnh sys.path để import queue_store

### Systemd Service (Production)

```ini
# /etc/systemd/system/post-api.service

[Unit]
Description=Post API Runner
After=network.target

[Service]
Type=simple
User=robot
WorkingDirectory=/opt/roi_logic
ExecStart=/opt/roi_logic/venv/bin/python postRq/postAPI.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Start service:**
```bash
sudo systemctl enable post-api
sudo systemctl start post-api
sudo systemctl status post-api
```

### Docker Container

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "postRq/postAPI.py"]
```

**Run:**
```bash
docker build -t post-api .
docker run -d --name post-api \
  -v /path/to/queues.db:/app/queues.db \
  -v /path/to/order_id.txt:/app/postRq/order_id.txt \
  post-api
```

## Data Flow

```
Stable Pair Processor
    │
    └─> stable_pairs queue
            │
            ├─ Topic: stable_pairs
            ├─ Key: pair_id
            └─ Payload: {pair_id, start_slot, end_slot, stable_since}
            
            ▼
            
    Post API Runner
            │
            ├─> Get next order ID
            ├─> Build API payload
            └─> POST to robot API
            
            ▼
            
    Robot Control System
            │
            └─> Execute task: Move shelf from start to end
```

## Integration Points

### Input: stable_pairs Queue

**Source:** `stable_pair_processor.py`

**Example Message:**
```json
{
  "pair_id": "101 -> 201",
  "start_slot": "101",
  "end_slot": "201",
  "stable_since": "2025-01-01T10:00:15.123456Z"
}
```

### Output: Robot API

**Endpoint:** `http://192.168.1.169:7000/ics/taskOrder/addTask`

**Request:**
```json
{
  "modelProcessCode": "checking_camera_work",
  "fromSystem": "ICS",
  "orderId": "12345",
  "taskOrderDetail": [
    {"taskPath": "101,201"}
  ]
}
```

**Response:**
```json
{
  "code": 1000,
  "message": "Task created successfully",
  "data": {
    "taskId": "TASK-67890",
    "orderId": "12345",
    "status": "pending"
  }
}
```

## Configuration

### API Endpoint

**Change API URL:**
```python
API_URL = "http://NEW_IP:PORT/ics/taskOrder/addTask"
```

**HTTPS:**
```python
API_URL = "https://192.168.1.169:7000/ics/taskOrder/addTask"

# May need to disable SSL verification for self-signed certs
import urllib3
urllib3.disable_warnings()

resp = requests.post(API_URL, ..., verify=False)
```

### Database Path

**Change DB path:**
```python
DB_PATH = "/absolute/path/to/queues.db"
```

**Network DB (if using NFS/shared storage):**
```python
DB_PATH = "/mnt/shared/queues.db"
```

### Order ID File

**Change location:**
```python
ORDER_ID_FILE = "/var/lib/post-api/order_id.txt"
```

### Polling Interval

**Change from 500ms to 1s:**
```python
time.sleep(1.0)  # Less frequent polling
```

### Retry Configuration

**Change retry attempts:**
```python
MAX_RETRIES = 5

for attempt in range(MAX_RETRIES):
    if send_post(body):
        ok = True
        break
    time.sleep(2)
```

**Exponential backoff:**
```python
for attempt in range(3):
    if send_post(body):
        ok = True
        break
    wait_time = 2 ** attempt  # 1s, 2s, 4s
    time.sleep(wait_time)
```

## Troubleshooting

### Issue: Connection refused

**Symptoms:**
```
[ERR] POST exception: ConnectionError: HTTPConnectionPool(host='192.168.1.169', port=7000): Max retries exceeded with url: /ics/taskOrder/addTask (Caused by NewConnectionError('<urllib3.connection.HTTPConnection object at 0x...>: Failed to establish a new connection: [Errno 111] Connection refused'))
```

**Nguyên nhân:**
- API server không chạy
- Sai IP/port
- Firewall block

**Giải pháp:**
```bash
# Test connectivity
curl http://192.168.1.169:7000/ics/taskOrder/addTask

# Check API server
systemctl status robot-api

# Check firewall
sudo iptables -L | grep 7000
```

### Issue: Timeout

**Symptoms:**
```
[ERR] POST exception: ConnectTimeout: HTTPConnectionPool(host='192.168.1.169', port=7000): Max retries exceeded with url: /ics/taskOrder/addTask (Caused by ConnectTimeoutError(<urllib3.connection.HTTPConnection object at 0x...>, 'Connection to 192.168.1.169 timed out. (connect timeout=10)'))
```

**Nguyên nhân:**
- Network slow
- API server overloaded
- Timeout quá ngắn

**Giải pháp:**
```python
# Increase timeout
resp = requests.post(API_URL, ..., timeout=30)
```

### Issue: Invalid response

**Symptoms:**
```
[WARN] POST 2xx but code=4001 | resp={'code': 4001, 'message': 'Invalid task path format'}
```

**Nguyên nhân:**
- API format changed
- Invalid QR codes
- Business logic error

**Debug:**
```python
# Log full request
print(f"Request: {json.dumps(payload, indent=2)}")

# Log full response
print(f"Response: {json.dumps(resp.json(), indent=2)}")
```

### Issue: Order ID reset

**Symptoms:**
- `order_id.txt` contains `1` sau khi restart
- Duplicate order IDs

**Nguyên nhân:**
- File bị xóa
- Permission denied
- Disk full

**Giải pháp:**
```bash
# Check file permissions
ls -la postRq/order_id.txt

# Check disk space
df -h

# Restore from backup
cp postRq/order_id.txt.backup postRq/order_id.txt
```

### Issue: Không consume queue

**Symptoms:**
- Processor chạy nhưng không POST gì
- Stable pairs publish nhưng không được xử lý

**Debug:**
```python
# Check queue manually
from queue_store import SQLiteQueue

queue = SQLiteQueue("../queues.db")
latest = get_latest_topic_row(queue, "stable_pairs")
print(f"Latest: {latest}")

# Check message count
with queue._connect() as conn:
    cur = conn.execute(
        "SELECT COUNT(*) FROM messages WHERE topic = 'stable_pairs'"
    )
    count = cur.fetchone()[0]
    print(f"Total messages: {count}")
```

## Best Practices

### 1. Error Handling

**Log all errors:**
```python
try:
    resp = requests.post(...)
except Exception as e:
    # Log with full traceback
    import traceback
    print(f"[ERR] Full traceback:")
    print(traceback.format_exc())
```

**Fail gracefully:**
```python
# Don't crash on single failure
if not send_post(body):
    # Log and continue to next message
    print(f"[FAIL] Skipping message {r['id']}")
    continue
```

### 2. Monitoring

**Health check endpoint:**
```python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'last_order_id': get_current_order_id(),
        'last_processed_id': last_global_id
    })

# Run in separate thread
threading.Thread(target=lambda: app.run(port=8080), daemon=True).start()
```

**Metrics:**
```python
# Track stats
stats = {
    'total_processed': 0,
    'total_success': 0,
    'total_failed': 0,
    'last_success_time': None
}

# Update in loop
stats['total_processed'] += 1
if ok:
    stats['total_success'] += 1
    stats['last_success_time'] = time.time()
else:
    stats['total_failed'] += 1

# Log periodically
if stats['total_processed'] % 100 == 0:
    print(f"[STATS] {stats}")
```

### 3. Testing

**Mock API server:**
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/ics/taskOrder/addTask', methods=['POST'])
def add_task():
    data = request.json
    print(f"Received: {data}")
    return jsonify({
        'code': 1000,
        'message': 'Success',
        'data': {'taskId': 'MOCK-123'}
    })

app.run(port=7000)
```

**Unit test:**
```python
def test_build_payload():
    payload = build_payload("101 -> 201", "101", "201", 12345)
    
    assert payload['orderId'] == "12345"
    assert payload['taskOrderDetail'][0]['taskPath'] == "101,201"
    assert payload['modelProcessCode'] == "checking_camera_work"
```

### 4. Production Deployment

**Use environment variables:**
```python
import os

API_URL = os.getenv('API_URL', 'http://192.168.1.169:7000/ics/taskOrder/addTask')
DB_PATH = os.getenv('DB_PATH', '../queues.db')
ORDER_ID_FILE = os.getenv('ORDER_ID_FILE', 'postRq/order_id.txt')
```

**Logging to file:**
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('postRq/post_api.log'),
        logging.StreamHandler()
    ]
)

logging.info(f"[OK] POST success | orderId={payload['orderId']}")
```

**Graceful shutdown:**
```python
import signal

def signal_handler(sig, frame):
    print('\n[SHUTDOWN] Graceful shutdown...')
    # Optional: Wait for current request to finish
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)
```

## Advanced Usage

### Batch Processing

```python
# Process multiple messages before sleeping
BATCH_SIZE = 10

while True:
    rows = get_after_id_topic(queue, TOPIC, last_global_id, limit=BATCH_SIZE)
    
    if not rows:
        time.sleep(0.5)
        continue
    
    # Process batch
    for r in rows:
        # ... process ...
    
    # Only sleep if batch was full (more might be available)
    if len(rows) < BATCH_SIZE:
        time.sleep(0.5)
```

### Priority Queue

```python
# Add priority field to payload
def send_post_with_priority(payload, priority='normal'):
    payload['priority'] = priority
    return send_post(payload)

# Process high priority first
high_priority_rows = [r for r in rows if r['payload'].get('priority') == 'high']
normal_rows = [r for r in rows if r not in high_priority_rows]

for r in high_priority_rows + normal_rows:
    # ... process ...
```

### Dead Letter Queue

```python
# Failed messages → DLQ
def save_to_dlq(message, reason):
    queue.publish("dlq_stable_pairs", message['pair_id'], {
        'original_message': message,
        'failure_reason': reason,
        'failed_at': datetime.utcnow().isoformat() + 'Z'
    })

# In main loop
if not ok:
    save_to_dlq(payload, "POST failed after 3 retries")
```

## Tích Hợp Với Các Module Khác

### Với stable_pair_processor.py
```
stable_pair_processor → stable_pairs queue → postAPI
                                               ↓
                                         POST to robot API
```

### Với roi_processor.py
```
postAPI → Robot task created
            ↓
       Robot moves shelf
            ↓
       (Indirectly) roi_processor detects state change
```

## Tham Khảo

- `stable_pair_processor.py`: Producer of stable_pairs
- `queue_store.py`: Queue operations
- `roi_processor.py`: ROI filtering and blocking
- Requests library: https://docs.python-requests.org/

