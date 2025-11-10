"""
ROI Checker - Xử lý kiểm tra ROI với 2 lớp (2-layer check)
Lấy detection từ Queue, tra cứu ROI theo camera_id, và kiểm tra:
    - Check 1 (Vị trí): Detection có nằm trong ROI không? (sử dụng IoU)
    - Check 2 (Đối tượng): Class có phải là shelf/empty dựa trên confidence
"""

import time
import json
import os
from multiprocessing import Queue
from typing import Dict, List, Any, Tuple
from pathlib import Path


class ROIHashTable:
    """Hash Table để lưu ROI của từng camera"""
    
    def __init__(self, roi_config_path: str = "logic/roi_config.json"):
        """
        Khởi tạo ROI Hash Table từ file config
        
        Args:
            roi_config_path: Đường dẫn đến file roi_config.json
        """
        self.roi_config_path = roi_config_path
        self.roi_table: Dict[str, List[Dict[str, Any]]] = {}
        self.camera_id_mapping: Dict[str, str] = {}  # Mapping normalized_id -> original_id
        self._load_roi_config()
    
    @staticmethod
    def _normalize_camera_id(camera_id: str) -> str:
        """
        Chuẩn hóa camera_id để tìm kiếm linh hoạt
        Ví dụ: "cam-88", "Cam_88", "CAM_88" -> "cam88"
        
        Args:
            camera_id: Camera ID gốc
            
        Returns:
            Camera ID đã chuẩn hóa (lowercase, bỏ dấu - và _)
        """
        return camera_id.lower().replace("-", "").replace("_", "")
    
    def _load_roi_config(self):
        """Load ROI config từ file JSON"""
        config_path = Path(self.roi_config_path)
        
        if not config_path.exists():
            self.roi_table = {}
            self.camera_id_mapping = {}
            return
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                raw_config = json.load(f)
            
            # Xây dựng roi_table và camera_id_mapping
            self.roi_table = raw_config
            self.camera_id_mapping = {}
            
            for original_cam_id in raw_config.keys():
                normalized_id = self._normalize_camera_id(original_cam_id)
                self.camera_id_mapping[normalized_id] = original_cam_id
            
            camera_count = len(self.roi_table)
            total_rois = sum(len(rois) for rois in self.roi_table.values())
            
            # Log chi tiết từng camera
            for cam_id, rois in self.roi_table.items():
                normalized = self._normalize_camera_id(cam_id)
                
        except Exception as e:
            self.roi_table = {}
            self.camera_id_mapping = {}
    
    def get_rois(self, camera_id: str) -> List[Dict[str, Any]]:
        """
        Lấy danh sách ROI của camera (hỗ trợ tìm kiếm linh hoạt)
        
        Args:
            camera_id: ID camera (ví dụ: "cam-88", "Cam_88", "CAM_88")
            
        Returns:
            Danh sách ROI dạng [{"slot_id": "ROI_1", "rect": [x, y, w, h]}, ...]
        """
        # Thử tìm trực tiếp trước
        if camera_id in self.roi_table:
            return self.roi_table[camera_id]
        
        # Nếu không có, thử normalize và tìm lại
        normalized_id = self._normalize_camera_id(camera_id)
        original_id = self.camera_id_mapping.get(normalized_id)
        
        if original_id:
            return self.roi_table.get(original_id, [])
        
        return []
    
    def reload(self):
        """Reload lại ROI config từ file"""
        self._load_roi_config()


def calculate_iou(bbox: List[float], roi_rect: List[int]) -> float:
    """
    Tính IoU (Intersection over Union) giữa bbox detection và ROI rect
    
    Args:
        bbox: Bounding box detection dạng [x1, y1, x2, y2]
        roi_rect: ROI rectangle dạng [x, y, w, h]
        
    Returns:
        IoU value (0.0 - 1.0)
    """
    # Chuyển roi_rect [x, y, w, h] sang [x1, y1, x2, y2]
    roi_x1 = roi_rect[0]
    roi_y1 = roi_rect[1]
    roi_x2 = roi_rect[0] + roi_rect[2]
    roi_y2 = roi_rect[1] + roi_rect[3]
    
    # Detection bbox đã là [x1, y1, x2, y2]
    det_x1, det_y1, det_x2, det_y2 = bbox
    
    # Tính vùng giao nhau (intersection)
    inter_x1 = max(det_x1, roi_x1)
    inter_y1 = max(det_y1, roi_y1)
    inter_x2 = min(det_x2, roi_x2)
    inter_y2 = min(det_y2, roi_y2)
    
    # Kiểm tra có giao nhau không
    if inter_x1 >= inter_x2 or inter_y1 >= inter_y2:
        return 0.0
    
    # Diện tích giao nhau
    inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
    
    # Diện tích bbox detection
    det_area = (det_x2 - det_x1) * (det_y2 - det_y1)
    
    # Diện tích ROI
    roi_area = roi_rect[2] * roi_rect[3]
    
    # Diện tích hợp (union)
    union_area = det_area + roi_area - inter_area
    
    # Tính IoU
    if union_area == 0:
        return 0.0
    
    iou = inter_area / union_area
    return iou


def classify_object(class_id: int, confidence: float, conf_threshold: float = 0.6) -> str:
    """
    Phân loại object dựa trên class và confidence
    
    Args:
        class_id: Class ID từ YOLO
        confidence: Confidence score
        conf_threshold: Ngưỡng confidence để phân biệt shelf/empty
        
    Returns:
        "shelf" nếu class=0 và conf > threshold, "empty" nếu conf <= threshold
    """
    if class_id == 0:
        if confidence > conf_threshold:
            return "shelf"
        else:
            return "empty"
    else:
        # Class khác 0, có thể xử lý thêm tùy theo yêu cầu
        return f"class_{class_id}"


def check_detection_in_roi(
    detection: Dict[str, Any],
    roi: Dict[str, Any],
    iou_threshold: float = 0.3,
    conf_threshold: float = 0.6
) -> Tuple[bool, str, float]:
    """
    Kiểm tra 2 lớp (2-layer check) cho detection
    
    Args:
        detection: Detection object {"class": 0, "bbox": [x1,y1,x2,y2], "confidence": 0.95}
        roi: ROI object {"slot_id": "ROI_1", "rect": [x, y, w, h]}
        iou_threshold: Ngưỡng IoU để coi là nằm trong ROI
        conf_threshold: Ngưỡng confidence để phân biệt shelf/empty
        
    Returns:
        Tuple (is_match, object_type, iou_score)
        - is_match: True nếu detection nằm trong ROI
        - object_type: "shelf", "empty", hoặc "class_X"
        - iou_score: Giá trị IoU
    """
    # Check 1: Vị trí - Kiểm tra IoU
    bbox = detection.get("bbox", [])
    roi_rect = roi.get("rect", [])
    
    if len(bbox) != 4 or len(roi_rect) != 4:
        return False, "invalid", 0.0
    
    iou_score = calculate_iou(bbox, roi_rect)
    is_position_match = iou_score >= iou_threshold
    
    # Check 2: Đối tượng - Phân loại shelf/empty
    class_id = detection.get("class", -1)
    confidence = detection.get("confidence", 0.0)
    object_type = classify_object(class_id, confidence, conf_threshold)
    
    return is_position_match, object_type, iou_score


def process_detection_result(
    result: Dict[str, Any],
    roi_hash_table: ROIHashTable,
    iou_threshold: float = 0.3,
    conf_threshold: float = 0.6
) -> List[Dict[str, Any]]:
    """
    Xử lý kết quả detection từ Queue
    
    Args:
        result: Detection result từ Queue
                {
                  "camera_id": "cam-88",
                  "timestamp": 1678886400,
                  "detection_results": [
                    {"class": 0, "bbox": [10, 15, 50, 60], "confidence": 0.95}
                  ]
                }
        roi_hash_table: ROI Hash Table
        iou_threshold: Ngưỡng IoU
        conf_threshold: Ngưỡng confidence
        
    Returns:
        Danh sách kết quả match
        [
          {
            "camera_id": "cam-88",
            "timestamp": 1678886400,
            "slot_id": "ROI_1",
            "object_type": "shelf",
            "confidence": 0.95,
            "iou": 0.85,
            "bbox": [10, 15, 50, 60]
          }
        ]
    """
    camera_id = result.get("camera_id", "unknown")
    timestamp = result.get("timestamp", 0)
    detections = result.get("detection_results", [])
    
    # Tra cứu ROI của camera này
    rois = roi_hash_table.get_rois(camera_id)
    
    if not rois:
        return []
    
    matched_results = []
    matched_roi_ids = set()  # Track ROI nào đã có detection match
    
    # Lặp qua từng detection
    for det_idx, detection in enumerate(detections):
        # Kiểm tra với từng ROI
        for roi in rois:
            is_match, object_type, iou_score = check_detection_in_roi(
                detection, roi, iou_threshold, conf_threshold
            )
            
            if is_match:
                slot_id = roi.get("slot_id", "unknown")
                matched_roi_ids.add(slot_id)  # Đánh dấu ROI đã match
                
                matched_result = {
                    "camera_id": camera_id,
                    "timestamp": timestamp,
                    "slot_id": slot_id,
                    "object_type": object_type,
                    "confidence": detection.get("confidence", 0.0),
                    "iou": iou_score,
                    "bbox": detection.get("bbox", [])
                }
                matched_results.append(matched_result)
                
    
    # Gửi "empty" cho các ROI không có detection match
    for roi in rois:
        slot_id = roi.get("slot_id", "unknown")
        if slot_id not in matched_roi_ids:
            empty_result = {
                "camera_id": camera_id,
                "timestamp": timestamp,
                "slot_id": slot_id,
                "object_type": "empty",
                "confidence": 0.0,
                "iou": 0.0,
                "bbox": []
            }
            matched_results.append(empty_result)
            
    
    return matched_results


def roi_checker_worker(
    detection_queue: Queue,
    result_queue: Queue,
    roi_config_path: str = "logic/roi_config.json",
    iou_threshold: float = 0.3,
    conf_threshold: float = 0.6
):
    """
    Worker process để xử lý ROI checking
    
    Args:
        detection_queue: Queue nhận detection results từ AI inference
        result_queue: Queue gửi matched results đi
        roi_config_path: Đường dẫn đến file ROI config
        iou_threshold: Ngưỡng IoU để coi là match
        conf_threshold: Ngưỡng confidence để phân biệt shelf/empty
    """
    # Khởi tạo ROI Hash Table
    roi_hash_table = ROIHashTable(roi_config_path)
    
    process_count = 0
    match_count = 0
    
    try:
        while True:
            try:
                # Đọc từ detection queue với timeout
                result = detection_queue.get(timeout=1.0)
                process_count += 1
                
                # Xử lý detection result
                matched_results = process_detection_result(
                    result,
                    roi_hash_table,
                    iou_threshold,
                    conf_threshold
                )
                
                # Gửi kết quả vào result queue
                for matched_result in matched_results:
                    try:
                        result_queue.put(matched_result, block=False)
                        match_count += 1
                    except Exception:
                        pass
                
            except Exception:
                time.sleep(0.01)
                
    except KeyboardInterrupt:
        pass
    except Exception:
        pass


def roi_result_consumer(result_queue: Queue):
    """
    Consumer process để đọc và xử lý kết quả ROI matching
    
    Args:
        result_queue: Queue chứa matched results
    """
    try:
        while True:
            try:
                # Đọc từ queue với timeout
                matched_result = result_queue.get(timeout=1.0)
                
                # Xử lý kết quả match (có thể thêm logic xử lý ở đây)
                pass
                
            except Exception:
                time.sleep(0.01)
                
    except KeyboardInterrupt:
        pass
    except Exception:
        pass



