import argparse
import time
import threading
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import cv2
from queue_store import SQLiteQueue


class ROIProcessor:
    def __init__(self, db_path: str = "queues.db"):
        """
        Khởi tạo ROI Processor
        
        Args:
            db_path: Đường dẫn đến database SQLite
        """
        self.queue = SQLiteQueue(db_path)
        # Cache ROI theo camera_id: {camera_id: [slots]}
        self.roi_cache: Dict[str, List[Dict[str, Any]]] = {}
        # Lock để thread-safe
        self.cache_lock = threading.Lock()
        # Running flag
        self.running = False
        
    def calculate_iou(self, bbox1: Dict[str, float], bbox2: Dict[str, float]) -> float:
        """
        Tính IoU giữa 2 bounding box
        
        Args:
            bbox1: Bounding box 1 {x1, y1, x2, y2}
            bbox2: Bounding box 2 {x1, y1, x2, y2}
            
        Returns:
            IoU value (0.0 - 1.0)
        """
        # Tính intersection
        x1 = max(bbox1["x1"], bbox2["x1"])
        y1 = max(bbox1["y1"], bbox2["y1"])
        x2 = min(bbox1["x2"], bbox2["x2"])
        y2 = min(bbox1["y2"], bbox2["y2"])
        
        if x2 <= x1 or y2 <= y1:
            return 0.0
        
        intersection = (x2 - x1) * (y2 - y1)
        
        # Tính area của mỗi bbox
        area1 = (bbox1["x2"] - bbox1["x1"]) * (bbox1["y2"] - bbox1["y1"])
        area2 = (bbox2["x2"] - bbox2["x1"]) * (bbox2["y2"] - bbox2["y1"])
        
        # Tính union
        union = area1 + area2 - intersection
        
        if union <= 0:
            return 0.0
        
        return intersection / union
    
    def is_point_in_polygon(self, point: Tuple[float, float], polygon: List[List[int]]) -> bool:
        """
        Kiểm tra điểm có nằm trong polygon không
        
        Args:
            point: Điểm (x, y)
            polygon: Danh sách các điểm của polygon [[x1, y1], [x2, y2], ...]
            
        Returns:
            True nếu điểm nằm trong polygon
        """
        x, y = point
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
    def is_detection_in_roi(self, detection: Dict[str, Any], roi_slots: List[Dict[str, Any]]) -> bool:
        """
        Kiểm tra detection có nằm trong ROI không
        
        Args:
            detection: Thông tin detection
            roi_slots: Danh sách ROI slots
            
        Returns:
            True nếu detection nằm trong ít nhất 1 ROI
        """
        detection_center = detection["center"]
        
        for slot in roi_slots:
            points = slot["points"]
            if self.is_point_in_polygon((detection_center["x"], detection_center["y"]), points):
                return True
        
        return False
    
    def filter_detections_by_roi(self, detections: List[Dict[str, Any]], camera_id: str) -> List[Dict[str, Any]]:
        """
        Lọc detections theo ROI
        
        Args:
            detections: Danh sách detections
            camera_id: ID của camera
            
        Returns:
            Danh sách detections đã được lọc
        """
        with self.cache_lock:
            roi_slots = self.roi_cache.get(camera_id, [])
        
        if not roi_slots:
            return []
        
        filtered_detections = []
        for detection in detections:
            if self.is_detection_in_roi(detection, roi_slots):
                filtered_detections.append(detection)
        
        return filtered_detections
    
    def update_roi_cache(self, camera_id: str, roi_data: Dict[str, Any]) -> None:
        """
        Cập nhật ROI cache
        
        Args:
            camera_id: ID của camera
            roi_data: Dữ liệu ROI từ queue
        """
        with self.cache_lock:
            self.roi_cache[camera_id] = roi_data.get("slots", [])
            print(f"Đã cập nhật ROI cache cho camera {camera_id}: {len(self.roi_cache[camera_id])} slots")
    
    def process_detection(self, detection_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Xử lý detection data và apply ROI filter
        
        Args:
            detection_data: Dữ liệu detection từ queue
            
        Returns:
            Dữ liệu đã được filter hoặc None nếu không có detection nào
        """
        camera_id = detection_data["camera_id"]
        detections = detection_data["detections"]
        
        # Lọc detections theo ROI
        filtered_detections = self.filter_detections_by_roi(detections, camera_id)
        
        if not filtered_detections:
            return None
        
        # Tạo payload cho roi_detection_queue
        roi_detection_payload = {
            "camera_id": camera_id,
            "frame_id": detection_data["frame_id"],
            "timestamp": detection_data["timestamp"],
            "frame_shape": detection_data["frame_shape"],
            "roi_detections": filtered_detections,
            "roi_detection_count": len(filtered_detections),
            "original_detection_count": len(detections)
        }
        
        return roi_detection_payload
    
    def subscribe_roi_config(self) -> None:
        """
        Subscribe ROI config queue và cập nhật cache
        """
        print("Bắt đầu subscribe ROI config queue...")
        
        # Lấy tất cả camera IDs đã có ROI config
        with self.queue._connect() as conn:
            cur = conn.execute(
                "SELECT DISTINCT key FROM messages WHERE topic = 'roi_config' ORDER BY key"
            )
            camera_ids = [row[0] for row in cur.fetchall()]
        
        # Load ROI config cho mỗi camera
        for camera_id in camera_ids:
            roi_data = self.queue.get_latest("roi_config", camera_id)
            if roi_data:
                self.update_roi_cache(camera_id, roi_data)
        
        print(f"Đã load ROI config cho {len(camera_ids)} cameras: {camera_ids}")
        
        # Monitor cho ROI config updates
        last_roi_ids = {}
        for camera_id in camera_ids:
            roi_data = self.queue.get_latest_row("roi_config", camera_id)
            if roi_data:
                last_roi_ids[camera_id] = roi_data["id"]
        
        while self.running:
            try:
                for camera_id in camera_ids:
                    # Kiểm tra ROI config mới
                    roi_data = self.queue.get_latest_row("roi_config", camera_id)
                    if roi_data and roi_data["id"] > last_roi_ids.get(camera_id, 0):
                        self.update_roi_cache(camera_id, roi_data["payload"])
                        last_roi_ids[camera_id] = roi_data["id"]
                
                time.sleep(1)  # Check mỗi giây
                
            except Exception as e:
                print(f"Lỗi khi subscribe ROI config: {e}")
                time.sleep(5)
    
    def subscribe_raw_detection(self) -> None:
        """
        Subscribe raw detection queue và xử lý
        """
        print("Bắt đầu subscribe raw detection queue...")
        
        # Lấy tất cả camera IDs
        with self.queue._connect() as conn:
            cur = conn.execute(
                "SELECT DISTINCT key FROM messages WHERE topic = 'raw_detection' ORDER BY key"
            )
            camera_ids = [row[0] for row in cur.fetchall()]
        
        if not camera_ids:
            print("Không tìm thấy camera nào trong raw_detection queue")
            return
        
        # Track last processed ID cho mỗi camera
        last_detection_ids = {}
        for camera_id in camera_ids:
            detection_data = self.queue.get_latest_row("raw_detection", camera_id)
            if detection_data:
                last_detection_ids[camera_id] = detection_data["id"]
        
        print(f"Đang monitor {len(camera_ids)} cameras: {camera_ids}")
        
        while self.running:
            try:
                for camera_id in camera_ids:
                    # Lấy detections mới
                    new_detections = self.queue.get_after_id(
                        "raw_detection", 
                        camera_id, 
                        last_detection_ids.get(camera_id, 0),
                        limit=10
                    )
                    
                    for detection_row in new_detections:
                        detection_data = detection_row["payload"]
                        last_detection_ids[camera_id] = detection_row["id"]
                        
                        # Xử lý detection
                        roi_detection_payload = self.process_detection(detection_data)
                        
                        if roi_detection_payload:
                            # Push vào roi_detection_queue
                            self.queue.publish("roi_detection", camera_id, roi_detection_payload)
                            print(f"Camera {camera_id} - Frame {detection_data['frame_id']}: "
                                  f"{roi_detection_payload['roi_detection_count']}/{roi_detection_payload['original_detection_count']} detections")
                
                time.sleep(0.1)  # Check mỗi 100ms
                
            except Exception as e:
                print(f"Lỗi khi subscribe raw detection: {e}")
                time.sleep(1)
    
    def run(self) -> None:
        """
        Chạy ROI processor
        """
        self.running = True
        
        # Tạo threads cho ROI config và raw detection
        roi_thread = threading.Thread(target=self.subscribe_roi_config, daemon=True)
        detection_thread = threading.Thread(target=self.subscribe_raw_detection, daemon=True)
        
        roi_thread.start()
        detection_thread.start()
        
        print("ROI Processor đã bắt đầu chạy...")
        print("Nhấn Ctrl+C để dừng")
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nĐang dừng ROI Processor...")
            self.running = False
        
        print("ROI Processor đã dừng")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="ROI Processor - Filter detections by ROI")
    parser.add_argument("--db-path", type=str, default="queues.db", 
                       help="Đường dẫn đến database SQLite")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        processor = ROIProcessor(args.db_path)
        processor.run()
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
