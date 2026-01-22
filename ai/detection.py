# File: detection.py
import time
from setup_log import setup_logger
from overlap_utils import check_iou_overlap

logger = setup_logger("detection", "logs/detection/log")

def has_object_in_roi(detections, roi):
    """Kiểm tra có object (class 0) trong ROI dựa trên detections, với IoU >= 0.7."""
    try:
        threshold_detect = 0.7  # Confidence threshold
        
        x1, y1, w, h = roi
        roi_box = [x1, y1, x1 + w, y1 + h]  # Chuyển về [x1, y1, x2, y2]
        
        has_object = False
        for det in detections:
            det_x1, det_y1, det_x2, det_y2, conf, cls = det
            if cls == 0 and conf > threshold_detect:
                det_box = [det_x1, det_y1, det_x2, det_y2]
                if check_iou_overlap(det_box, roi_box):
                    has_object = True
                    logger.debug(f"Object detected in ROI {roi} with IoU >= 0.7")
                    break
        
        if not has_object:
            logger.debug(f"No object in ROI {roi} (IoU < 0.7)")
        
        return has_object
    except Exception as e:
        logger.error(f"Error in detection: {e}")
        return False