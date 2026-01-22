# File: overlap_utils.py
import numpy as np

def calculate_iou(box1, box2):
    """Tính IoU giữa hai bounding boxes (format [x1, y1, x2, y2])."""
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2
    
    # Tính intersection
    inter_x1 = max(x1_1, x1_2)
    inter_y1 = max(y1_1, y1_2)
    inter_x2 = min(x2_1, x2_2)
    inter_y2 = min(y2_1, y2_2)
    
    inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
    
    # Tính union
    box1_area = (x2_1 - x1_1) * (y2_1 - y1_1)
    box2_area = (x2_2 - x1_2) * (y2_2 - y1_2)
    union_area = box1_area + box2_area - inter_area
    
    # Tránh chia cho 0
    if union_area == 0:
        return 0.0
    
    return inter_area / union_area

def check_iou_overlap(det_box, roi_box, threshold_iou=0.7):
    """Kiểm tra nếu IoU giữa det_box và roi_box >= threshold (0.7)."""
    iou = calculate_iou(det_box, roi_box)
    return iou >= threshold_iou