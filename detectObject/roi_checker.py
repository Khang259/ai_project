"""
ROI Checker - Xử lý kiểm tra ROI với 2 lớp (2-layer check)
Lấy detection từ Queue, tra cứu ROI theo camera_id, và kiểm tra:
    - Check 1 (Vị trí): Detection có nằm trong ROI không? (center-in-ROI)
    - Check 2 (Đối tượng): Model detect class "hang" (class_id=0) → shelf, không detect → empty
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
    Phân loại object dựa trên detection của model "hang"
    
    Logic:
    - Có detection (class_id = 0 = "hang", confidence >= threshold) → "shelf" (có hàng)
    - Confidence thấp → "empty" (không chắc chắn có hàng)
    
    Args:
        class_id: Class ID từ YOLO (0 = "hang")
        confidence: Confidence score của detection
        conf_threshold: Ngưỡng confidence tối thiểu (mặc định 0.5)
        
    Returns:
        "shelf" nếu detect "hang" với confidence đủ mạnh
        "empty" nếu confidence thấp (không chắc chắn)
    """
    # Model detect class "hang" (class_id = 0)
    if class_id == 0 and confidence >= conf_threshold:
        return "shelf"  # Có hàng (detection hợp lệ)
    else:
        return "empty"  # Confidence thấp hoặc class không hợp lệ


def check_detection_in_roi(
    detection: Dict[str, Any],
    roi: Dict[str, Any],
    conf_threshold: float = 0.5
) -> Tuple[bool, str, float]:
    """
    Kiểm tra detection thuộc ROI bằng phương pháp center-in-ROI
    
    Args:
        detection: Detection object {"class": 0, "bbox": [x1,y1,x2,y2], "confidence": 0.95}
        roi: ROI object {"slot_id": "ROI_1", "rect": [x, y, w, h]}
        conf_threshold: Ngưỡng confidence để phân biệt shelf/empty
        
    Returns:
        Tuple (is_match, object_type, score)
        - is_match: True nếu detection nằm trong ROI (bằng center)
        - object_type: "shelf" nếu conf > conf_threshold, "empty" nếu conf <= conf_threshold
        - score: 1.0 nếu center nằm trong ROI, ngược lại 0.0 (giữ trường 'iou' tương thích downstream)
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
    
    # Check vị trí - chỉ dùng center-in-ROI
    is_position_match = False
    score = 0.0
    
    # Tính center point của bbox
    center_x = (bbox[0] + bbox[2]) / 2
    center_y = (bbox[1] + bbox[3]) / 2
    
    # Kiểm tra center point trong ROI
    if point_in_roi(center_x, center_y, roi_rect):
        is_position_match = True
        score = 1.0  # dùng làm 'iou' tương thích downstream
    
    # Phân loại shelf/empty theo confidence
    class_id = detection.get("class", -1)
    confidence = detection.get("confidence", 0.0)
    object_type = classify_object(class_id, confidence, conf_threshold)
    
    return is_position_match, object_type, score


def process_detection_result(
    result: Dict[str, Any],
    roi_hash_table: ROIHashTable,
    conf_threshold: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Xử lý kết quả detection từ Queue
    Model có 1 class "hang" (class_id = 0), logic:
    - Có detection "hang" với conf >= threshold trong ROI → "shelf" (có hàng)
    - Không có detection hoặc conf < threshold → "empty" (trống)
    
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
            "iou": 1.0,  # 1.0 nếu center match, 0.0 nếu không
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
    
    # Bước 1: Tìm detection tốt nhất cho mỗi ROI bằng center-in-ROI
    for detection in detections:
        det_confidence = detection.get("confidence", 0.0)
        
        for roi in rois:
            is_match, object_type, score = check_detection_in_roi(
                detection, roi, conf_threshold
            )
            
            if is_match:
                slot_id = roi.get("slot_id", "unknown")
                
                # Giữ detection có confidence cao nhất cho mỗi ROI
                if slot_id not in roi_detection_map or det_confidence > roi_detection_map[slot_id]["confidence"]:
                    roi_detection_map[slot_id] = {
                        "detection": detection,
                        "object_type": object_type,
                        "confidence": det_confidence,
                        "iou": score
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
                "iou": det_info["iou"],  # 1.0 nếu center match
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
    conf_threshold: float = 0.5
):
    """
    Worker process để xử lý ROI checking
    
    Args:
        detection_queue: Queue nhận detection results từ AI inference
        result_queue: Queue gửi matched results đi
        roi_config_path: Đường dẫn đến file ROI config
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
