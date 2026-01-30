# File: detection.py
from setup_log import setup_logger
from overlap_utils import is_roi_covered_enough, calculate_coverage

logger = setup_logger("detection", "logs/detection/log")

def has_object_in_roi(detections, roi, node_id = None):
    try:
        threshold_detect = 0.6
        threshold_coverage = 0.7
        
        x1, y1, w, h = roi
        roi_box = [x1, y1, x1 + w, y1 + h]
        
        has_object = False
        coverage_value = 0.0

        for det in detections:
            det_x, det_y, det_w, det_h, conf, cls = det
            #print(f"DEBUG: det=({det_x:.1f}, {det_y:.1f}, {det_w:.1f}, {det_h:.1f}), conf={conf:.2f}, cls={cls}")
            if cls == 1.0 and conf > threshold_detect:
                det_box = [det_x, det_y, det_w, det_h]
                if is_roi_covered_enough(det_box, roi_box, threshold_coverage):
                    coverage_value = calculate_coverage(det_box, roi_box)
                    #print(f"DEBUG: coverage={coverage_value:.3f}, threshold={threshold_coverage}")
                    has_object = True
                    logger.debug(f"Object detected {node_id} with coverage {coverage_value:.2%}")
                    break
    
        if not has_object:
            logger.debug(f"No object in {node_id} (IoU < 0.6)")
        
        return has_object, coverage_value
    except Exception as e:
        logger.error(f"Error in detection: {e}")
        return False, 0.0