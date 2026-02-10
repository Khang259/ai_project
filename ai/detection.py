# File: detection.py
from setup_log import setup_logger
from overlap_utils import is_roi_covered_enough, calculate_coverage

logger = setup_logger("detection", "logs/detection/log")

def has_object_in_roi(detections, roi, node_id = None):
    try:
        threshold_detect = 0.4
        threshold_coverage = 0.5
        
        # ROI đã có format [x, y, w, h] từ config, không cần convert
        roi_box = roi
        
        has_object = False
        coverage_value = 0.0

        for det in detections:
            det_x, det_y, det_x1, det_y1, conf, cls = det
            if cls == 0.0 and conf > threshold_detect:
                det_box = [det_x, det_y, det_x1, det_y1]
                if is_roi_covered_enough(det_box, roi_box, threshold_coverage):
                    coverage_value = calculate_coverage(det_box, roi_box)
                    #print(f"DEBUG: coverage={coverage_value:.3f}, threshold={threshold_coverage}")
                    has_object = True
                    #logger.debug(f"Object detected {node_id} with coverage {coverage_value:.2%}")
                    break
    
        # if not has_object:
        #     logger.debug(f"No object in {node_id} (IoU < 0.6)")
        
        return has_object, coverage_value
    except Exception as e:
        logger.error(f"Error in detection: {e}")
        return False, 0.0