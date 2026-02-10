# File: overlap_utils.py
import numpy as np

def calculate_coverage(detection_box, roi_box):
    """
    Tính IoU giữa detection box và ROI.
    detection_box: format [x1, y1, x2, y2]
    roi_box: format [x, y, w, h]
    """
    # Unpack detection_box [x1, y1, x2, y2]
    det_x1, det_y1, det_x2, det_y2 = detection_box
    
    # Unpack roi_box [x, y, w, h]
    roi_x, roi_y, roi_w, roi_h = roi_box
    
    # Convert roi_box sang [x1, y1, x2, y2]
    roi_x1, roi_y1 = roi_x, roi_y
    roi_x2, roi_y2 = roi_x + roi_w, roi_y + roi_h
    
    # Tính intersection
    inter_x1 = max(det_x1, roi_x1)
    inter_y1 = max(det_y1, roi_y1)
    inter_x2 = min(det_x2, roi_x2)
    inter_y2 = min(det_y2, roi_y2)
    
    inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
    
    # Tính diện tích ROI
    roi_area = roi_w * roi_h

    if roi_area == 0:
        return 0.0
    
    return inter_area / roi_area

def is_roi_covered_enough(detection_box, roi_box, threshold_coverage=0.7):
    coverage = calculate_coverage(detection_box, roi_box)
    return coverage >= threshold_coverage