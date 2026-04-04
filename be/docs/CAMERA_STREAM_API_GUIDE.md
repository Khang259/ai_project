# Camera Stream API Guide

Hướng dẫn sử dụng các API để đọc và stream camera RTSP.

## 📋 Yêu cầu

Cài đặt các dependencies mới:
```bash
cd be/app
pip install -r requirements.txt
```

Packages mới:
- `opencv-python==4.10.0.84` - Xử lý video/image
- `numpy==1.26.4` - Xử lý array

## 🎯 Các API Endpoints

### 1. Test Camera Connection

**Endpoint:** `POST /cameras/test-connection`

**Mô tả:** Kiểm tra kết nối đến camera RTSP

**Request Body:**
```json
{
  "rtsp_url": "rtsp://username:password@192.168.1.100:554/stream1"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Camera connection successful",
  "rtsp_url": "rtsp://username:password@192.168.1.100:554/stream1"
}
```

**Response (Error):**
```json
{
  "detail": "Cannot open camera stream"
}
```

**Ví dụ curl:**
```bash
curl -X POST "http://localhost:8000/cameras/test-connection" \
  -H "Content-Type: application/json" \
  -d '{
    "rtsp_url": "rtsp://admin:password123@192.168.1.100:554/stream1"
  }'
```

---

### 2. Get Camera Snapshot (từ RTSP URL)

**Endpoint:** `POST /cameras/snapshot`

**Mô tả:** Lấy 1 frame (snapshot) từ camera RTSP

**Request Body:**
```json
{
  "rtsp_url": "rtsp://username:password@192.168.1.100:554/stream1"
}
```

**Response:** JPEG image (binary)

**Headers:**
- `Content-Type: image/jpeg`
- `Content-Disposition: inline; filename=snapshot.jpg`

**Ví dụ curl (save to file):**
```bash
curl -X POST "http://localhost:8000/cameras/snapshot" \
  -H "Content-Type: application/json" \
  -d '{
    "rtsp_url": "rtsp://admin:password123@192.168.1.100:554/stream1"
  }' \
  --output snapshot.jpg
```

**Ví dụ HTML:**
```html
<img id="snapshot" />

<script>
  fetch('/cameras/snapshot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rtsp_url: 'rtsp://admin:password123@192.168.1.100:554/stream1'
    })
  })
  .then(response => response.blob())
  .then(blob => {
    document.getElementById('snapshot').src = URL.createObjectURL(blob);
  });
</script>
```

---

### 3. Get Camera Snapshot (từ Camera ID)

**Endpoint:** `GET /cameras/snapshot/{camera_id}`

**Mô tả:** Lấy snapshot từ camera đã lưu trong database

**Path Parameters:**
- `camera_id`: MongoDB ObjectId của camera

**Response:** JPEG image (binary)

**Ví dụ curl:**
```bash
curl -X GET "http://localhost:8000/cameras/snapshot/507f1f77bcf86cd799439011" \
  --output camera_snapshot.jpg
```

**Ví dụ HTML:**
```html
<img src="/cameras/snapshot/507f1f77bcf86cd799439011" alt="Camera Snapshot" />
```

---

### 4. Stream Video (từ RTSP URL)

**Endpoint:** `POST /cameras/stream`

**Mô tả:** Stream video trực tiếp từ RTSP URL

**Request Body:**
```json
{
  "rtsp_url": "rtsp://username:password@192.168.1.100:554/stream1"
}
```

**Response:** Multipart MJPEG stream

**Headers:**
- `Content-Type: multipart/x-mixed-replace; boundary=frame`

**Ví dụ HTML:**
```html
<!-- Không thể dùng POST với <img>, cần dùng JavaScript -->
<img id="stream" />

<script>
  // Tạo request POST để lấy stream URL
  fetch('/cameras/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rtsp_url: 'rtsp://admin:password123@192.168.1.100:554/stream1'
    })
  })
  .then(response => {
    // Stream response không thể dùng trực tiếp với <img>
    // Khuyến nghị dùng GET endpoint bên dưới
  });
</script>
```

---

### 5. Stream Video (từ Camera ID)

**Endpoint:** `GET /cameras/stream/{camera_id}`

**Mô tả:** Stream video từ camera đã lưu trong database

**Path Parameters:**
- `camera_id`: MongoDB ObjectId của camera

**Response:** Multipart MJPEG stream

**Ví dụ HTML:**
```html
<!-- Cách đơn giản nhất -->
<img src="/cameras/stream/507f1f77bcf86cd799439011" alt="Camera Stream" />

<!-- Với error handling -->
<img id="cameraStream" 
     src="/cameras/stream/507f1f77bcf86cd799439011" 
     alt="Camera Stream"
     onerror="this.src='/static/offline_camera.png'" />
```

**Ví dụ React:**
```jsx
function CameraStream({ cameraId }) {
  return (
    <img 
      src={`/cameras/stream/${cameraId}`}
      alt="Camera Stream"
      style={{ width: '100%', maxWidth: '800px' }}
      onError={(e) => {
        e.target.src = '/static/offline_camera.png';
      }}
    />
  );
}
```

---

## 📝 Định dạng RTSP URL

### Cấu trúc cơ bản:
```
rtsp://[username]:[password]@[ip]:[port]/[path]
```

### Ví dụ:

**1. Camera không có authentication:**
```
rtsp://192.168.1.100:554/stream1
```

**2. Camera có authentication:**
```
rtsp://admin:password123@192.168.1.100:554/stream1
```

**3. Camera Hikvision:**
```
rtsp://admin:Admin123@192.168.1.64:554/Streaming/Channels/101
```

**4. Camera Dahua:**
```
rtsp://admin:Admin123@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0
```

**5. Camera ONVIF:**
```
rtsp://admin:password@192.168.1.100:554/onvif1
```

---

## 🔧 Troubleshooting

### Camera không kết nối được

**Lỗi:** "Cannot open camera stream"

**Giải pháp:**
1. Kiểm tra URL RTSP đúng format
2. Kiểm tra username/password
3. Kiểm tra camera có bật RTSP không
4. Ping thử IP camera
5. Kiểm tra port RTSP (thường là 554)
6. Kiểm tra firewall

### Frame bị delay

**Nguyên nhân:** Buffer quá lớn

**Giải pháp:** Đã set `CAP_PROP_BUFFERSIZE = 1` để giảm delay

### Stream bị disconnect

**Nguyên nhân:** 
- Mất kết nối mạng
- Camera tắt/restart
- Timeout

**Giải pháp:** Frontend nên implement reconnect logic

---

## 💡 Best Practices

### 1. Test Connection trước khi lưu camera
```javascript
async function addCamera(cameraData) {
  // Test connection first
  const testResult = await fetch('/cameras/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rtsp_url: cameraData.camera_path })
  });
  
  if (!testResult.ok) {
    throw new Error('Camera connection failed');
  }
  
  // Proceed to create camera
  const createResult = await fetch('/cameras/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cameraData)
  });
  
  return createResult.json();
}
```

### 2. Handle Stream Errors
```html
<img id="stream" 
     src="/cameras/stream/507f1f77bcf86cd799439011"
     onerror="handleStreamError(this)" />

<script>
let retryCount = 0;
const MAX_RETRIES = 3;

function handleStreamError(img) {
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    setTimeout(() => {
      img.src = img.src.split('?')[0] + '?retry=' + Date.now();
    }, 2000);
  } else {
    img.src = '/static/offline_camera.png';
    console.error('Camera stream failed after max retries');
  }
}
</script>
```

### 3. Use Snapshot cho thumbnail
```javascript
// Lấy snapshot định kỳ thay vì stream full-time
setInterval(async () => {
  const response = await fetch('/cameras/snapshot/507f...', {
    method: 'GET'
  });
  const blob = await response.blob();
  document.getElementById('thumbnail').src = URL.createObjectURL(blob);
}, 5000); // Update every 5 seconds
```

---

## 🎨 Frontend Examples

### React Component với Snapshot
```jsx
import React, { useState, useEffect } from 'react';

function CameraSnapshot({ cameraId, interval = 5000 }) {
  const [imageSrc, setImageSrc] = useState(null);
  
  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const response = await fetch(`/cameras/snapshot/${cameraId}`);
        const blob = await response.blob();
        setImageSrc(URL.createObjectURL(blob));
      } catch (error) {
        console.error('Error fetching snapshot:', error);
      }
    };
    
    fetchSnapshot();
    const intervalId = setInterval(fetchSnapshot, interval);
    
    return () => clearInterval(intervalId);
  }, [cameraId, interval]);
  
  return imageSrc ? (
    <img src={imageSrc} alt="Camera Snapshot" />
  ) : (
    <div>Loading...</div>
  );
}
```

### React Component với Live Stream
```jsx
function CameraLiveStream({ cameraId }) {
  const [error, setError] = useState(false);
  
  return (
    <div>
      {!error ? (
        <img 
          src={`/cameras/stream/${cameraId}`}
          alt="Live Camera Stream"
          onError={() => setError(true)}
          style={{ width: '100%', height: 'auto' }}
        />
      ) : (
        <div>Camera offline or error occurred</div>
      )}
    </div>
  );
}
```

---

## 🔐 Security Notes

1. **RTSP URLs chứa credentials** - Không expose ra frontend nếu có thể
2. **Sử dụng camera_id** thay vì truyền RTSP URL trực tiếp
3. **Implement authentication** cho các endpoints nếu cần
4. **Rate limiting** để tránh abuse

---

## 📊 Performance Tips

1. **Snapshot vs Stream:**
   - Dùng **snapshot** cho dashboard với nhiều camera (tiết kiệm bandwidth)
   - Dùng **stream** cho viewing chi tiết 1 camera

2. **Quality Settings:**
   - Snapshot: JPEG quality 85% (có thể điều chỉnh trong code)
   - Stream: JPEG quality 80% (có thể điều chỉnh trong code)

3. **Buffer Size:**
   - Đã set buffer = 1 để giảm latency
   - Trade-off: Có thể drop frames nếu mạng chậm

---

## 📦 Complete Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Camera Dashboard</title>
    <style>
        .camera-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .camera-card { border: 1px solid #ccc; padding: 10px; }
        img { width: 100%; height: auto; }
    </style>
</head>
<body>
    <h1>Camera Dashboard</h1>
    
    <!-- Test Camera Connection -->
    <div>
        <h2>Test Camera</h2>
        <input id="rtspUrl" placeholder="rtsp://..." style="width: 400px" />
        <button onclick="testCamera()">Test Connection</button>
        <button onclick="getSnapshot()">Get Snapshot</button>
        <div id="testResult"></div>
        <img id="testSnapshot" style="max-width: 600px;" />
    </div>
    
    <!-- Live Streams -->
    <div class="camera-grid">
        <div class="camera-card">
            <h3>Camera 1</h3>
            <img src="/cameras/stream/507f1f77bcf86cd799439011" />
        </div>
        <div class="camera-card">
            <h3>Camera 2</h3>
            <img src="/cameras/stream/507f1f77bcf86cd799439012" />
        </div>
    </div>
    
    <script>
        async function testCamera() {
            const url = document.getElementById('rtspUrl').value;
            const response = await fetch('/cameras/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rtsp_url: url })
            });
            const result = await response.json();
            document.getElementById('testResult').textContent = 
                result.success ? '✅ ' + result.message : '❌ ' + result.detail;
        }
        
        async function getSnapshot() {
            const url = document.getElementById('rtspUrl').value;
            const response = await fetch('/cameras/snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rtsp_url: url })
            });
            const blob = await response.blob();
            document.getElementById('testSnapshot').src = URL.createObjectURL(blob);
        }
    </script>
</body>
</html>
```

