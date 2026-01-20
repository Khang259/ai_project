import logging
import os
import threading
import subprocess
from datetime import datetime

date_str =  datetime.now().strftime("%Y%m%d")
os.makedirs("logs/logs_camera_thread", exist_ok=True)

log_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
log_handler = logging.FileHandler(f"logs/logs_camera_thread/log_camera_thread_{date_str}.log")
log_handler.setFormatter(log_formatter)

logger = logging.getLogger("camera_thread")
logger.setLevel(logging.DEBUG)
logger.addHandler(log_handler)

class CameraThread(threading.Thread):
    def __init__(self):
        super().__init__()

    def run(self):
        command = [
            "ffmpeg",
            "-rtsp_transport", "tcp",
            "-i", self.url,
            "-loglevel", "quiet",
            "-an",
            "-f", "image2pipe",
            "-pix_fmt", "bgr24",
            "-vcodec", "rawvideo",
            "-"
        ]
