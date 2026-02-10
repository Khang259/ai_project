# File: yolo_visualizer.py
from ultralytics import YOLO
from setup_log import setup_logger
import numpy as np
import pathlib
import platform
if platform.system() == 'Windows':
    pathlib.PosixPath = pathlib.WindowsPath

logger = setup_logger("yolo_visualizer", "logs/yolo_visualizer/log")

def predict_and_visualize(model, frame):
    """Predict YOLO trên toàn bộ frame và trả về detections + annotated frame (không show riêng)."""
    try:
        results = model(frame)
        detections = results[0].boxes.data.cpu().numpy()  # Lấy detections dưới dạng numpy array
        annotated_frame = results[0].plot()  # Trả về frame annotated (bbox, conf, label) dưới dạng NumPy array
        
        return detections, annotated_frame
    except Exception as e:
        logger.error(f"Error in YOLO prediction: {e}")
        return np.array([]), frame  # Trả về detections rỗng và frame gốc nếu lỗi