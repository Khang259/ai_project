# File: camera_processor.py
import cv2
import threading
import time
from detection import has_object_in_roi
from state_manager import StateManager
from setup_log import setup_logger
from yolo_visualizer import predict_and_visualize  # Để predict YOLO và lấy annotated frame
from roi_drawer import draw_rois_on_frame  # Để vẽ ROI

logger = setup_logger("camera_processor", "logs/camera_processor/log")

class CameraProcessor(threading.Thread):
    def __init__(self, rtsp, rois, state_manager):
        super().__init__()
        self.rtsp = rtsp
        self.rois = rois  # list of {"node_id": str, "roi": [x,y,w,h]}
        self.state_manager = state_manager
        self.running = True
        self.window_name = f"Camera {rtsp.split('/')[-1]}"  # Unique window name
        self.FRAME_WIDTH = 1280   # Giữ tạm, nhưng sẽ lấy động từ stream
        self.FRAME_HEIGHT = 720

    def run(self):
        cap = cv2.VideoCapture(self.rtsp, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            logger.error(f"Không mở được RTSP: {self.rtsp}")
            return

        # Lấy kích thước frame thực tế từ stream (rất quan trọng!)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if width > 0 and height > 0:
            self.FRAME_WIDTH = width
            self.FRAME_HEIGHT = height
            logger.debug(f"Stream size: {width}x{height} cho {self.rtsp}")
        else:
            logger.warning(f"Không lấy được size frame, dùng default 1280x720")

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

            detections, annotated_frame = predict_and_visualize(frame)

            frame = annotated_frame.copy()

            draw_rois_on_frame(frame, self.rois)

            for roi_dict in self.rois:
                node_id = roi_dict["node_id"]
                state = has_object_in_roi(detections, roi_dict["roi"])
                self.state_manager.update_state(node_id, state)

            # Display
            display_frame = cv2.resize(frame, (self.FRAME_WIDTH, self.FRAME_HEIGHT))
            cv2.imshow(self.window_name, display_frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                self.running = False
            time.sleep(0.01)

        # Cleanup
        cap.release()
        cv2.destroyWindow(self.window_name)