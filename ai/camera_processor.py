# File: camera_processor.py
import cv2
import threading
import time
from detection import has_object_in_roi
from state_manager import StateManager
from setup_log import setup_logger
from yolo_visualizer import predict_and_visualize
from roi_drawer import draw_rois_on_frame

logger = setup_logger("camera_processor", "logs/camera_processor/log")

class CameraProcessor(threading.Thread):
    def __init__(self, rtsp, rois, state_manager):
        super().__init__()
        self.rtsp = rtsp
        self.rois = rois  # list of {"node_id": ..., "roi": ...}
        self.state_manager = state_manager
        self.running = True
        self.window_name = f"Camera {rtsp.split('/')[-1]}"

    def run(self):
        cap = cv2.VideoCapture(self.rtsp, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            logger.error(f"Không mở được RTSP: {self.rtsp}")
            return

        # Lấy kích thước frame thực tế
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if width > 0 and height > 0:
            self.FRAME_WIDTH = width
            self.FRAME_HEIGHT = height
            logger.debug(f"Stream size: {width}x{height} cho {self.rtsp}")
        else:
            logger.warning("Không lấy được size frame")
            self.FRAME_WIDTH = 1280
            self.FRAME_HEIGHT = 720

        logger.debug(f"Thread bắt đầu xử lý RTSP: {self.rtsp}")

        while self.running and cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                logger.warning(f"Mất frame từ {self.rtsp} - thử reconnect...")
                cap.release()
                time.sleep(1)
                cap = cv2.VideoCapture(self.rtsp, cv2.CAP_FFMPEG)
                if not cap.isOpened():
                    logger.error(f"Reconnect thất bại: {self.rtsp}")
                    break
                continue

            # ── YOLO predict ────────────────────────────────────────
            detections, annotated_frame = predict_and_visualize(frame)
            frame = annotated_frame.copy()   # đã có bbox YOLO

            # ── Tính trạng thái từng ROI trong frame hiện tại ───────
            current_states = {}
            for roi_dict in self.rois:
                node_id = roi_dict["node_id"]
                roi = roi_dict["roi"]
                has_obj = has_object_in_roi(detections, roi, node_id)
                current_states[node_id] = has_obj
                self.state_manager.update_state(node_id, has_obj)

            # ── Vẽ ROI với màu theo trạng thái ──────────────────────
            draw_rois_on_frame(frame, self.rois, current_states)
            cv2.imshow(self.window_name, frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.running = False

            time.sleep(0.01)

        cap.release()
        try:
            cv2.destroyWindow(self.window_name)
        except:
            pass