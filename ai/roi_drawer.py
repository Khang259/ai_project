# File: roi_drawer.py
import cv2

def draw_rois_on_frame(frame, rois, states_dict):
    """
    Vẽ các vùng ROI với màu sắc dựa trên trạng thái.
    
    Args:
        frame: ảnh gốc
        rois: list of {"node_id": str, "roi": [x,y,w,h]}
        states_dict: dict {node_id: bool}  # True = có object overlap >=70%, False = không
    """
    for roi_dict in rois:
        node_id = roi_dict["node_id"]
        x, y, w, h = roi_dict["roi"]
        
        has_object = states_dict.get(node_id, False)
        color = (0, 255, 0) if has_object else (0, 0, 255)
        
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
        
        text_color = (0, 255, 0) if has_object else (0, 0, 255)
        cv2.putText(
            frame,
            node_id,
            (x, y - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,        
            text_color,
            2
        )