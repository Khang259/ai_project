# main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import threading
import asyncio
import cv2
import time
import json
import numpy as np
from detector import YoloDetector

app = FastAPI(title="RTSP + YOLOv8n Backend")

# Danh sách RTSP camera
CAMERA_URLS = {
    1: "rtsp://localhost:8554/mystream",  # Luồng RTSP từ MediaMTX
}

FPS = 6  # Phù hợp với video input 6 fps
detector = YoloDetector("model_vl_0205.pt", use_gpu=True)  # Thay bằng path model của bạn
# In trạng thái thiết bị sử dụng cho model ngay sau khi khởi tạo
try:
    import torch
    print(f"[Main] torch.cuda.is_available(): {torch.cuda.is_available()}")
    try:
        model_device = next(detector.model.model.parameters()).device if hasattr(detector.model, 'model') else None
    except Exception:
        model_device = None
    print(f"[Main] YOLO device: {getattr(detector, 'device', 'unknown')}, model param device: {model_device}")
except Exception as e:
    print(f"[Main] Warning printing device info: {e}")

# Global state
camera_state = {cam_id: {"frame": None, "detect": None} for cam_id in CAMERA_URLS.keys()}
subscriptions = {}  # ws -> set(camera_ids)
stop_flags = {}  # cam_id -> stop thread flag

# Camera thread to capture RTSP stream and perform detection
def camera_thread(cam_id: int, rtsp_url: str):
    print(f"[Thread] Start camera {cam_id}: {rtsp_url}")
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open RTSP for camera {cam_id}")
        return

    # Đặt buffer để giảm độ trễ
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 3)
    cap.set(cv2.CAP_PROP_FPS, FPS)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    max_retries = 5
    retry_count = 0

    while not stop_flags.get(cam_id, False):
        ret, frame = cap.read()
        if not ret:
            print(f"[Warning] Lost frame from camera {cam_id}, retry {retry_count}/{max_retries}")
            retry_count += 1
            if retry_count >= max_retries:
                print(f"[ERROR] Too many lost frames, attempting to reconnect camera {cam_id}")
                cap.release()
                cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
                if not cap.isOpened():
                    print(f"[ERROR] Reconnect failed for camera {cam_id}")
                    break
                retry_count = 0
            time.sleep(0.5)  # Giảm thời gian đợi để thử nhanh hơn
            continue

        # Resize để phù hợp với input video (1280x720) và giảm tải
        frame = cv2.resize(frame, (640, 480))

        # YOLO detection
        objects = detector.detect(frame)

        # Vẽ bounding box
        for obj in objects:
            x1, y1, x2, y2 = obj["bbox"]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{obj['class']} {obj['confidence']:.2f}",
                        (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Cập nhật state
        camera_state[cam_id]["frame"] = frame
        camera_state[cam_id]["detect"] = {
            "camera_id": cam_id,
            "objects": objects
        }

        time.sleep(1 / FPS)

    cap.release()
    print(f"[Thread] Stop camera {cam_id}")

# MJPEG Stream Endpoint
@app.get("/video_feed/{cam_id}")
def video_feed(cam_id: int):
    """Stream video (MJPEG) cho từng camera"""
    def generate():
        while True:
            frame = camera_state.get(cam_id, {}).get("frame")
            if frame is None:
                time.sleep(0.1)
                continue
            ret, jpeg = cv2.imencode(".jpg", frame)
            if not ret:
                continue
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" +
                   jpeg.tobytes() + b"\r\n")
            time.sleep(1 / FPS)
    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")

# WebSocket Endpoint
@app.websocket("/ws/multi")
async def websocket_multi(ws: WebSocket):
    await ws.accept()
    subscriptions[ws] = set()
    print("[WS] Client connected")

    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)

            # Client gửi danh sách camera muốn nhận
            if data.get("action") == "subscribe":
                subs = data.get("camera_ids", [])
                subscriptions[ws] = set(subs)
                print(f"[WS] Subscribed cameras: {subs}")

            # Push detection results
            results = []
            for cam_id in subscriptions[ws]:
                det = camera_state.get(cam_id, {}).get("detect")
                if det:
                    results.append(det)
            if results:
                await ws.send_text(json.dumps(results))

            await asyncio.sleep(0.2)

    except WebSocketDisconnect:
        print("[WS] Client disconnected")
        subscriptions.pop(ws, None)

# Startup and Shutdown
@app.on_event("startup")
def startup_event():
    for cam_id, url in CAMERA_URLS.items():
        stop_flags[cam_id] = False
        threading.Thread(target=camera_thread, args=(cam_id, url), daemon=True).start()

@app.on_event("shutdown")
def shutdown_event():
    for cam_id in stop_flags.keys():
        stop_flags[cam_id] = True