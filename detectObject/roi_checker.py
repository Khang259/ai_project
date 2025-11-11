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


def point_in_roi(center_x: float, center_y: float, roi_rect: List[int]) -> bool:
    """
    Kiểm tra điểm center có nằm trong ROI không
    
    Args:
        center_x: Tọa độ x của center point
        center_y: Tọa độ y của center point
        roi_rect: ROI rectangle dạng [x, y, w, h]
        
    Returns:
        True nếu center nằm trong ROI
    """
    if len(roi_rect) != 4:
        return False
    
    x, y, w, h = roi_rect
    return x <= center_x <= (x + w) and y <= center_y <= (y + h)


def calculate_iou(bbox: List[float], roi_rect: List[int]) -> float:
    """
    Tính IoU (Intersection over Union) giữa bbox detection và ROI rect
    
    QUAN TRỌNG: bbox và roi_rect PHẢI cùng không gian tọa độ (cùng độ phân giải)
    
    Args:
        bbox: Bounding box detection dạng [x1, y1, x2, y2] ở độ phân giải 1280x720
        roi_rect: ROI rectangle dạng [x, y, w, h] ở độ phân giải 1280x720
        
    Returns:
        IoU value (0.0 - 1.0)
    """
    # Chuyển bbox và roi_rect sang dict format để tính toán rõ ràng hơn
    bbox_dict = {
        "x1": bbox[0],
        "y1": bbox[1],
        "x2": bbox[2],
        "y2": bbox[3]
    }
    
    # Chuyển roi_rect [x, y, w, h] sang dict [x1, y1, x2, y2]
    roi_dict = {
        "x1": roi_rect[0],
        "y1": roi_rect[1],
        "x2": roi_rect[0] + roi_rect[2],
        "y2": roi_rect[1] + roi_rect[3]
    }
    
    # Tính intersection
    x1 = max(bbox_dict["x1"], roi_dict["x1"])
    y1 = max(bbox_dict["y1"], roi_dict["y1"])
    x2 = min(bbox_dict["x2"], roi_dict["x2"])
    y2 = min(bbox_dict["y2"], roi_dict["y2"])
    
    # Kiểm tra có giao nhau không
    if x2 <= x1 or y2 <= y1:
        return 0.0
    
    # Tính diện tích intersection
    intersection = (x2 - x1) * (y2 - y1)
    
    # Tính area của mỗi bbox
    area_bbox = (bbox_dict["x2"] - bbox_dict["x1"]) * (bbox_dict["y2"] - bbox_dict["y1"])
    area_roi = (roi_dict["x2"] - roi_dict["x1"]) * (roi_dict["y2"] - roi_dict["y1"])
    
    # Tính union
    union = area_bbox + area_roi - intersection
    
    if union <= 0:
        return 0.0
    
    iou = intersection / union
    
    return iou


def classify_object(class_id: int, confidence: float, conf_threshold: float = 0.5) -> str:
    """
    Phân loại object dựa trên confidence
    Model chỉ có 1 class duy nhất là "shelf"
    
    Args:
        class_id: Class ID từ YOLO (luôn = 0 với model 1 class)
        confidence: Confidence score của detection
        conf_threshold: Ngưỡng confidence để phân biệt shelf/empty (mặc định 0.5)
        
    Returns:
        "shelf" nếu conf > conf_threshold (có hàng)
        "empty" nếu conf <= conf_threshold (trống)
    """
    # Model chỉ có 1 class (shelf), nên chỉ cần check confidence
    if confidence > conf_threshold:
        return "shelf"  # Có hàng
    else:
        return "empty"  # Trống (confidence thấp = không chắc chắn có hàng)


def check_detection_in_roi(
    detection: Dict[str, Any],
    roi: Dict[str, Any],
    iou_threshold: float = 0.3,
    conf_threshold: float = 0.5
) -> Tuple[bool, str, float]:
    """
    Kiểm tra 2 lớp (2-layer check) cho detection với phương pháp kết hợp IoU + Center
    
    Phương pháp:
    1. Ưu tiên: Kiểm tra center point có nằm trong ROI không
    2. Fallback: Nếu center không nằm trong, kiểm tra IoU
    
    Args:
        detection: Detection object {"class": 0, "bbox": [x1,y1,x2,y2], "confidence": 0.95}
        roi: ROI object {"slot_id": "ROI_1", "rect": [x, y, w, h]}
        iou_threshold: Ngưỡng IoU để coi là nằm trong ROI (dùng khi center không match)
        conf_threshold: Ngưỡng confidence để phân biệt shelf/empty
        
    Returns:
        Tuple (is_match, object_type, iou_score)
        - is_match: True nếu detection nằm trong ROI (bằng center hoặc IoU)
        - object_type: "shelf" nếu conf > conf_threshold, "empty" nếu conf <= conf_threshold
        - iou_score: Giá trị IoU (hoặc 1.0 nếu match bằng center)
    """
    # Validation: Lấy bbox và roi_rect
    bbox = detection.get("bbox", [])
    roi_rect = roi.get("rect", [])
    
    # Validation: Đảm bảo tọa độ hợp lệ (phải ở cùng không gian 1280x720)
    if len(bbox) != 4 or len(roi_rect) != 4:
        return False, "invalid", 0.0
    
    # Validation: Kiểm tra tọa độ không âm và trong phạm vi hợp lệ
    if any(x < 0 for x in bbox) or any(x < 0 for x in roi_rect):
        return False, "invalid", 0.0
    
    # Check 1: Vị trí - Phương pháp kết hợp Center + IoU
    is_position_match = False
    iou_score = 0.0
    match_method = ""
    
    # Tính center point của bbox
    center_x = (bbox[0] + bbox[2]) / 2
    center_y = (bbox[1] + bbox[3]) / 2
    
    # Ưu tiên 1: Kiểm tra center point trong ROI
    if point_in_roi(center_x, center_y, roi_rect):
        is_position_match = True
        iou_score = 1.0  # Đánh dấu match hoàn hảo bằng center
        match_method = "center"
    else:
        # Ưu tiên 2: Fallback sang IoU nếu center không match
        iou_score = calculate_iou(bbox, roi_rect)
        if iou_score >= iou_threshold:
            is_position_match = True
            match_method = "iou"
    
    # Check 2: Đối tượng - Phân loại shelf/empty
    class_id = detection.get("class", -1)
    confidence = detection.get("confidence", 0.0)
    object_type = classify_object(class_id, confidence, conf_threshold)
    
    return is_position_match, object_type, iou_score


def process_detection_result(
    result: Dict[str, Any],
    roi_hash_table: ROIHashTable,
    iou_threshold: float = 0.3,
    conf_threshold: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Xử lý kết quả detection từ Queue
    Model chỉ có 1 class "shelf", logic:
    - Có detection với conf > threshold trong ROI → "shelf"
    - Không có detection hoặc conf <= threshold → "empty"
    
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
        iou_threshold: Ngưỡng IoU để match detection với ROI
        conf_threshold: Ngưỡng confidence để phân biệt shelf/empty
        
    Returns:
        Danh sách kết quả match
        [
          {
            "camera_id": "cam-88",
            "timestamp": 1678886400,
            "slot_id": "ROI_1",
            "object_type": "shelf",  # hoặc "empty"
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
    roi_detection_map = {}  # Map ROI -> detection với confidence cao nhất
    
    # Bước 1: Tìm detection tốt nhất cho mỗi ROI
    for detection in detections:
        # Chỉ xét detection có confidence > conf_threshold
        det_confidence = detection.get("confidence", 0.0)
        
        for roi in rois:
            is_match, object_type, iou_score = check_detection_in_roi(
                detection, roi, iou_threshold, conf_threshold
            )
            
            if is_match:
                slot_id = roi.get("slot_id", "unknown")
                
                # Giữ detection có confidence cao nhất cho mỗi ROI
                if slot_id not in roi_detection_map or det_confidence > roi_detection_map[slot_id]["confidence"]:
                    roi_detection_map[slot_id] = {
                        "detection": detection,
                        "object_type": object_type,
                        "confidence": det_confidence,
                        "iou": iou_score
                    }
    
    # Bước 2: Tạo kết quả cho tất cả ROI
    for roi in rois:
        slot_id = roi.get("slot_id", "unknown")
        
        if slot_id in roi_detection_map:
            # ROI có detection match
            det_info = roi_detection_map[slot_id]
            matched_result = {
                "camera_id": camera_id,
                "timestamp": timestamp,
                "slot_id": slot_id,
                "object_type": det_info["object_type"],
                "confidence": det_info["confidence"],
                "iou": det_info["iou"],
                "bbox": det_info["detection"].get("bbox", [])
            }
        else:
            # ROI không có detection → empty
            matched_result = {
                "camera_id": camera_id,
                "timestamp": timestamp,
                "slot_id": slot_id,
                "object_type": "empty",
                "confidence": 0.0,
                "iou": 0.0,
                "bbox": []
            }
        
        matched_results.append(matched_result)
    
    return matched_results


def roi_checker_worker(
    detection_queue: Queue,
    result_queue: Queue,
    roi_config_path: str = "logic/roi_config.json",
    iou_threshold: float = 0.3,
    conf_threshold: float = 0.5
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
