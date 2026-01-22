# File: roi_drawer.py
import cv2

def draw_rois_on_frame(frame, rois):
    """Vẽ các vùng ROI và node_id lên frame."""
    for roi_dict in rois:
        node_id = roi_dict["node_id"]
        x, y, w, h = roi_dict["roi"]
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(frame, node_id, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)