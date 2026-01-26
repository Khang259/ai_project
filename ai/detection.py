# File: detection.py
import time
from setup_log import setup_logger
from overlap_utils import is_roi_covered_enough

logger = setup_logger("detection", "logs/detection/log")

def has_object_in_roi(detections, roi, node_id = None):
    try:
        threshold_detect = 0.6
        threshold_coverage = 0.7 
        
        x1, y1, w, h = roi
        roi_box = [x1, y1, x1 + w, y1 + h]
        
        has_object = False
        for det in detections:
            det_x1, det_y1, det_x2, det_y2, conf, cls = det
            if cls == 0 and conf > threshold_detect:
                det_box = [det_x1, det_y1, det_x2, det_y2]
                if is_roi_covered_enough(det_box, roi_box, threshold_coverage):
                    has_object = True
                    logger.debug(f"Object detected {node_id}")
                    break
    
        if not has_object:
            logger.debug(f"No object in {node_id} (IoU < 0.6)")
        
        return has_object
    except Exception as e:
        logger.error(f"Error in detection: {e}")
        return False