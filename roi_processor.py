import argparse
import time
import threading
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import cv2
from queue_store import SQLiteQueue


class ROIProcessor:
    def __init__(self, db_path: str = "queues.db", show_video: bool = True):
        """
        Khởi tạo ROI Processor
        
        Args:
            db_path: Đường dẫn đến database SQLite
            show_video: Hiển thị video real-time
        """
        self.queue = SQLiteQueue(db_path)
        # Cache ROI theo camera_id: {camera_id: [slots]}
        self.roi_cache: Dict[str, List[Dict[str, Any]]] = {}
        # Lock để thread-safe
        self.cache_lock = threading.Lock()
        # Running flag
        self.running = False
        # Video display
        self.show_video = show_video
        # Video capture cho mỗi camera
        self.video_captures: Dict[str, cv2.VideoCapture] = {}
        # Frame cache cho mỗi camera
        self.frame_cache: Dict[str, np.ndarray] = {}
        # Latest detection data cho mỗi camera
        self.latest_detections: Dict[str, Dict[str, Any]] = {}
        # Latest ROI detection data cho mỗi camera (bao gồm empty)
        self.latest_roi_detections: Dict[str, Dict[str, Any]] = {}
        
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
        Lọc detections theo ROI và thêm "empty" cho ROI không có shelf hoặc confidence < 0.5
        
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
        roi_has_shelf = [False] * len(roi_slots)  # Track xem ROI nào có shelf
        
        # Lọc detections có trong ROI và là shelf với confidence >= 0.5
        for detection in detections:
            if detection.get("class_name") == "shelf" and detection.get("confidence", 0) >= 0.5:
                for i, slot in enumerate(roi_slots):
                    if self.is_detection_in_roi(detection, [slot]):
                        # Gắn slot_number cho detection thuộc ROI i
                        detection_with_slot = dict(detection)
                        detection_with_slot["slot_number"] = i + 1
                        filtered_detections.append(detection_with_slot)
                        roi_has_shelf[i] = True
                        break
        
        # Thêm "empty" cho các ROI không có shelf hoặc confidence < 0.5
        for i, slot in enumerate(roi_slots):
            if not roi_has_shelf[i]:
                # Tạo detection "empty" cho ROI này và gắn slot_number
                empty_detection = {
                    "class_name": "empty",
                    "confidence": 1.0,
                    "class_id": -1,
                    "bbox": {
                        "x1": min(point[0] for point in slot["points"]),
                        "y1": min(point[1] for point in slot["points"]),
                        "x2": max(point[0] for point in slot["points"]),
                        "y2": max(point[1] for point in slot["points"])
                    },
                    "center": {
                        "x": sum(point[0] for point in slot["points"]) / len(slot["points"]),
                        "y": sum(point[1] for point in slot["points"]) / len(slot["points"])
                    },
                    "slot_number": i + 1,
                }
                filtered_detections.append(empty_detection)
        
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
            Dữ liệu đã được filter (luôn có kết quả cho mỗi ROI)
        """
        camera_id = detection_data["camera_id"]
        detections = detection_data["detections"]
        
        # Lọc detections theo ROI (sẽ luôn có kết quả cho mỗi ROI)
        filtered_detections = self.filter_detections_by_roi(detections, camera_id)
        
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
    
    def draw_roi_on_frame(self, frame: np.ndarray, camera_id: str) -> np.ndarray:
        """
        Vẽ ROI lên frame
        
        Args:
            frame: Frame gốc
            camera_id: ID của camera
            
        Returns:
            Frame đã được vẽ ROI
        """
        with self.cache_lock:
            roi_slots = self.roi_cache.get(camera_id, [])
        
        if not roi_slots:
            return frame
        
        annotated_frame = frame.copy()
        
        for i, slot in enumerate(roi_slots):
            points = slot["points"]
            if len(points) >= 3:  # Cần ít nhất 3 điểm để tạo polygon
                # Chuyển đổi points thành numpy array
                pts = np.array(points, dtype=np.int32)
                
                # Vẽ polygon ROI
                cv2.polylines(annotated_frame, [pts], True, (0, 255, 0), 2)
                
                # Vẽ vertices
                for point in points:
                    cv2.circle(annotated_frame, tuple(point), 4, (0, 255, 0), -1)
                
                # Vẽ label cho ROI
                if points:
                    label_pos = (points[0][0], points[0][1] - 10)
                    cv2.putText(annotated_frame, f"ROI-{i+1}", label_pos, 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        return annotated_frame
    
    def draw_detections_on_frame(self, frame: np.ndarray, detections: List[Dict[str, Any]], 
                                camera_id: str) -> np.ndarray:
        """
        Vẽ detections lên frame với highlight cho ROI detections
        
        Args:
            frame: Frame gốc
            detections: Danh sách detections
            camera_id: ID của camera
            
        Returns:
            Frame đã được vẽ detections
        """
        annotated_frame = frame.copy()
        
        # Lấy ROI detections
        with self.cache_lock:
            roi_slots = self.roi_cache.get(camera_id, [])
        
        for detection in detections:
            bbox = detection["bbox"]
            x1, y1 = int(bbox["x1"]), int(bbox["y1"])
            x2, y2 = int(bbox["x2"]), int(bbox["y2"])
            confidence = detection["confidence"]
            class_name = detection["class_name"]
            
            # Xử lý empty detections (luôn trong ROI)
            if class_name == "empty":
                # Màu vàng cho empty ROI
                color = (128, 0, 0)  # Vàng cho empty
                thickness = 0.5
                label_color = (0, 255, 255)
                is_in_roi = True
            else:
                # Kiểm tra xem detection có trong ROI không (cho các class khác)
                is_in_roi = self.is_detection_in_roi(detection, roi_slots)
                
                # Chọn màu và style dựa trên việc có trong ROI hay không
                if is_in_roi:
                    # Highlight detections trong ROI (shelf)
                    color = (0, 0, 255)  # Đỏ cho shelf trong ROI
                    thickness = 1
                    label_color = (0, 0, 255)
                else:
                    # Detections ngoài ROI
                    color = (128, 128, 128)  # Xám cho detections ngoài ROI
                    thickness = 1
                    label_color = (128, 128, 128)
            
            # Vẽ bounding box
            # Ép thickness về số nguyên tối thiểu 1 để tránh lỗi OpenCV
            draw_thickness = max(1, int(round(thickness)))
            if class_name == "empty":
                # Vẽ bounding box đứt nét cho empty ROI
                self.draw_dashed_rectangle(annotated_frame, (x1, y1), (x2, y2), color, draw_thickness)
            else:
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, draw_thickness)
            
            # Tạo label
            if class_name == "empty":
                label = f"EMPTY [ROI]"
            else:
                label = f"{class_name}: {confidence:.2f}"
                if is_in_roi:
                    label += " [ROI]"
            
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            
            # Vẽ background cho label
            cv2.rectangle(annotated_frame, (x1, y1 - label_size[1] - 10), 
                        (x1 + label_size[0], y1), color, -1)
            
            # Vẽ text
            cv2.putText(annotated_frame, label, (x1, y1 - 5), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        return annotated_frame
    
    def draw_dashed_rectangle(self, image: np.ndarray, pt1: Tuple[int, int], pt2: Tuple[int, int], 
                             color: Tuple[int, int, int], thickness: int, dash_length: int = 10) -> None:
        """
        Vẽ hình chữ nhật đứt nét
        
        Args:
            image: Hình ảnh để vẽ
            pt1: Điểm góc trên trái (x1, y1)
            pt2: Điểm góc dưới phải (x2, y2)
            color: Màu sắc
            thickness: Độ dày đường
            dash_length: Độ dài mỗi đoạn đứt nét
        """
        x1, y1 = pt1
        x2, y2 = pt2
        
        # Ép thickness về số nguyên tối thiểu 1 để tránh lỗi OpenCV
        thickness = max(1, int(round(thickness)))

        # Vẽ 4 cạnh đứt nét
        # Cạnh trên
        self.draw_dashed_line(image, (x1, y1), (x2, y1), color, thickness, dash_length)
        # Cạnh phải
        self.draw_dashed_line(image, (x2, y1), (x2, y2), color, thickness, dash_length)
        # Cạnh dưới
        self.draw_dashed_line(image, (x2, y2), (x1, y2), color, thickness, dash_length)
        # Cạnh trái
        self.draw_dashed_line(image, (x1, y2), (x1, y1), color, thickness, dash_length)
    
    def draw_dashed_line(self, image: np.ndarray, pt1: Tuple[int, int], pt2: Tuple[int, int], 
                        color: Tuple[int, int, int], thickness: int, dash_length: int) -> None:
        """
        Vẽ đường thẳng đứt nét
        
        Args:
            image: Hình ảnh để vẽ
            pt1: Điểm đầu (x1, y1)
            pt2: Điểm cuối (x2, y2)
            color: Màu sắc
            thickness: Độ dày đường
            dash_length: Độ dài mỗi đoạn đứt nét
        """
        x1, y1 = pt1
        x2, y2 = pt2
        
        # Tính khoảng cách và hướng
        dx = x2 - x1
        dy = y2 - y1
        distance = int(np.sqrt(dx*dx + dy*dy))
        
        if distance == 0:
            return
        
        # Ép tham số về số nguyên hợp lệ
        thickness = max(1, int(round(thickness)))
        dash_length = max(1, int(round(dash_length)))

        # Tính số đoạn đứt nét
        dash_count = max(1, distance // (dash_length * 2))
        
        # Vẽ các đoạn đứt nét
        for i in range(dash_count):
            start_ratio = (i * 2 * dash_length) / distance
            end_ratio = ((i * 2 + 1) * dash_length) / distance
            
            start_x = int(x1 + dx * start_ratio)
            start_y = int(y1 + dy * start_ratio)
            end_x = int(x1 + dx * end_ratio)
            end_y = int(y1 + dy * end_ratio)
            
            cv2.line(image, (start_x, start_y), (end_x, end_y), color, thickness)
    
    def get_video_capture(self, camera_id: str) -> Optional[cv2.VideoCapture]:
        """
        Lấy video capture cho camera
        
        Args:
            camera_id: ID của camera
            
        Returns:
            VideoCapture object hoặc None
        """
        if camera_id not in self.video_captures:
            # Mapping camera_id với video source tương ứng
            video_mapping = {
                "cam-1": "video/hanam.mp4",
                "cam-2": "video/vinhPhuc.mp4"
            }
            
            # Lấy video source cho camera này
            video_source = video_mapping.get(camera_id, "video/hanam.mp4")
            
            cap = cv2.VideoCapture(video_source)
            if cap.isOpened():
                self.video_captures[camera_id] = cap
                print(f"Đã kết nối video source cho camera {camera_id}: {video_source}")
            else:
                cap.release()
                print(f"Không thể kết nối video source cho camera {camera_id}: {video_source}")
                return None
        
        return self.video_captures[camera_id]
    
    def update_frame_cache(self, camera_id: str) -> bool:
        """
        Cập nhật frame cache cho camera
        
        Args:
            camera_id: ID của camera
            
        Returns:
            True nếu cập nhật thành công
        """
        cap = self.get_video_capture(camera_id)
        if cap is None:
            return False
        
        ret, frame = cap.read()
        if ret:
            self.frame_cache[camera_id] = frame
            return True
        
        return False
    
    def display_video(self) -> None:
        """
        Hiển thị video real-time với ROI và detections
        """
        if not self.show_video:
            return
        
        print("Bắt đầu hiển thị video...")
        
        while self.running:
            try:
                # Cập nhật frame cho tất cả camera có ROI config
                for camera_id in list(self.roi_cache.keys()):
                    if self.update_frame_cache(camera_id):
                        frame = self.frame_cache[camera_id]
                        
                        # Vẽ ROI lên frame
                        frame_with_roi = self.draw_roi_on_frame(frame, camera_id)
                        
                        # Lấy ROI detections mới nhất cho camera này (bao gồm empty)
                        with self.cache_lock:
                            latest_roi_detection = self.latest_roi_detections.get(camera_id)
                        
                        if latest_roi_detection and latest_roi_detection.get("roi_detections"):
                            # Vẽ ROI detections lên frame (bao gồm empty)
                            frame_with_detections = self.draw_detections_on_frame(
                                frame_with_roi, latest_roi_detection["roi_detections"], camera_id
                            )
                            
                            # Hiển thị thông tin với video source
                            video_mapping = {
                                "cam-1": "hanam.mp4",
                                "cam-2": "vinhPhuc.mp4"
                            }
                            video_name = video_mapping.get(camera_id, "unknown")
                            
                            info_text = f"Camera: {camera_id} ({video_name}) | Frame: {latest_roi_detection.get('frame_id', 'N/A')}"
                            roi_count = latest_roi_detection.get('roi_detection_count', 0)
                            total_count = latest_roi_detection.get('original_detection_count', 0)
                            
                            # Đếm shelf và empty trong ROI detections
                            roi_detections = latest_roi_detection.get('roi_detections', [])
                            shelf_count = sum(1 for d in roi_detections if d.get('class_name') == 'shelf')
                            empty_count = sum(1 for d in roi_detections if d.get('class_name') == 'empty')
                            
                            info_text += f" | Shelf: {shelf_count}, Empty: {empty_count}, Total ROI: {roi_count}"
                            
                            cv2.putText(frame_with_detections, info_text, (10, 30), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                            
                            # Hiển thị frame
                            cv2.imshow(f"ROI Detection - {camera_id} ({video_name})", frame_with_detections)
                        else:
                            # Chỉ hiển thị ROI nếu chưa có detection
                            video_mapping = {
                                "cam-1": "hanam.mp4",
                                "cam-2": "vinhPhuc.mp4"
                            }
                            video_name = video_mapping.get(camera_id, "unknown")
                            cv2.imshow(f"ROI Detection - {camera_id} ({video_name})", frame_with_roi)
                
                # Xử lý phím bấm
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                
                time.sleep(0.03)  # ~30 FPS
                
            except Exception as e:
                print(f"Lỗi khi hiển thị video: {e}")
                time.sleep(1)
    
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
                    # Chỉ xử lý camera có ROI config
                    with self.cache_lock:
                        if camera_id not in self.roi_cache:
                            continue
                    
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
                        
                        # Lưu detection data để hiển thị video
                        with self.cache_lock:
                            self.latest_detections[camera_id] = detection_data
                        
                        # Xử lý detection (luôn có kết quả cho mỗi ROI)
                        roi_detection_payload = self.process_detection(detection_data)
                        
                        # Lưu ROI detection data để hiển thị video (bao gồm empty)
                        with self.cache_lock:
                            self.latest_roi_detections[camera_id] = roi_detection_payload
                        
                        # Push vào roi_detection_queue
                        self.queue.publish("roi_detection", camera_id, roi_detection_payload)
                        
                        # Đếm số shelf và empty
                        shelf_count = sum(1 for d in roi_detection_payload['roi_detections'] if d['class_name'] == 'shelf')
                        empty_count = sum(1 for d in roi_detection_payload['roi_detections'] if d['class_name'] == 'empty')
                        
                        # Hiển thị thông tin với video source
                        video_mapping = {
                            "cam-1": "hanam.mp4",
                            "cam-2": "vinhPhuc.mp4"
                        }
                        video_name = video_mapping.get(camera_id, "unknown")
                        
                        # print(f"Camera {camera_id} ({video_name}) - Frame {detection_data['frame_id']}: "
                            #   f"Shelf: {shelf_count}, Empty: {empty_count}, Total ROI: {roi_detection_payload['roi_detection_count']}")
                
                time.sleep(0.1)  # Check mỗi 100ms
                
            except Exception as e:
                print(f"Lỗi khi subscribe raw detection: {e}")
                time.sleep(1)
    
    def run(self) -> None:
        """
        Chạy ROI processor
        """
        self.running = True
        
        # Tạo threads cho ROI config, raw detection và video display
        roi_thread = threading.Thread(target=self.subscribe_roi_config, daemon=True)
        detection_thread = threading.Thread(target=self.subscribe_raw_detection, daemon=True)
        
        roi_thread.start()
        detection_thread.start()
        
        # Thread cho video display
        if self.show_video:
            video_thread = threading.Thread(target=self.display_video, daemon=True)
            video_thread.start()
        
        print("ROI Processor đã bắt đầu chạy...")
        if self.show_video:
            print("Video display đã được bật - Nhấn 'q' trong cửa sổ video để thoát")
        print("Nhấn Ctrl+C để dừng")
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nĐang dừng ROI Processor...")
            self.running = False
        
        # Đóng video captures
        for cap in self.video_captures.values():
            cap.release()
        cv2.destroyAllWindows()
        
        print("ROI Processor đã dừng")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="ROI Processor - Filter detections by ROI")
    parser.add_argument("--db-path", type=str, default="queues.db", 
                       help="Đường dẫn đến database SQLite")
    parser.add_argument("--no-video", action="store_true", 
                       help="Tắt hiển thị video")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        processor = ROIProcessor(args.db_path, show_video=not args.no_video)
        processor.run()
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
