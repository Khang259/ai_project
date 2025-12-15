import cv2
import time

def check_rtsp_alive(rtsp_url: str, timeout_sec: int = 5) -> bool:
    """
    Kiểm tra RTSP có connect được hay không
    - Không đọc frame
    - Không decode
    - Trả về True / False
    """

    start_time = time.time()
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

    while True:
        if cap.isOpened():
            cap.release()
            return True

        if time.time() - start_time > timeout_sec:
            break

        time.sleep(0.1)

    cap.release()
    return False


rtsp_url = "rtsp://127.0.0.1:8554/cam_500"

if check_rtsp_alive(rtsp_url):
    print("Camera ONLINE")
else:
    print("Camera OFFLINE")
