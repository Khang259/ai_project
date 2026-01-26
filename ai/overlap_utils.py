# File: overlap_utils.py
import numpy as np

def calculate_coverage(detection_box, roi_box):
    """Tính IoU giữa hai bounding boxes (format [x1, y1, x2, y2])."""
    x1_1, y1_1, x2_1, y2_1 = detection_box
    x1_2, y1_2, x2_2, y2_2 = roi_box
    
    # Tính intersection
    inter_x1 = max(x1_1, x1_2)
    inter_y1 = max(y1_1, y1_2)
    inter_x2 = min(x2_1, x2_2)
    inter_y2 = min(y2_1, y2_2)
    
    inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
    
    # Tính union
    roi_area = (x2_2 - x1_2) * (y2_2 - y1_2)

    if roi_area == 0:
        return 0.0
    
    return inter_area / roi_area

def is_roi_covered_enough(detection_box, roi_box, threshold_coverage=0.7):
    coverage = calculate_coverage(detection_box, roi_box)
    return coverage >= threshold_coverage