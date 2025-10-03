"""
ROI Visualizer - Module chuyên dụng để vẽ ROI và detections lên video
"""

import cv2
import numpy as np
import threading
import time
import json
import os
from typing import Dict, List, Tuple, Any, Optional
from queue_store import SQLiteQueue


class ROIVisualizer:
    """Class chuyên dụng để vẽ ROI và detections lên video frame"""
    
    def __init__(self):
        """Khởi tạo ROI Visualizer"""
        pass
    
    def draw_roi_on_frame(self, frame: np.ndarray, camera_id: str, roi_slots: List[Dict[str, Any]]) -> np.ndarray:
        """
        Vẽ ROI lên frame
        
        Args:
            frame: Frame gốc
            camera_id: ID của camera
            roi_slots: Danh sách ROI slots
            
        Returns:
            Frame đã được vẽ ROI
        """
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
                                camera_id: str, roi_slots: List[Dict[str, Any]]) -> np.ndarray:
        """
        Vẽ detections lên frame với highlight cho ROI detections
        
        Args:
            frame: Frame gốc
            detections: Danh sách detections
            camera_id: ID của camera
            roi_slots: Danh sách ROI slots
            
        Returns:
            Frame đã được vẽ detections
        """
        annotated_frame = frame.copy()
        
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
                is_in_roi = self._is_detection_in_roi(detection, roi_slots)
                
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
                self._draw_dashed_rectangle(annotated_frame, (x1, y1), (x2, y2), color, draw_thickness)
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
    
    def draw_info_text(self, frame: np.ndarray, camera_id: str, roi_detection_data: Dict[str, Any], 
                       end_monitoring_count: int = 0) -> np.ndarray:
        """
        Vẽ thông tin text lên frame
        
        Args:
            frame: Frame gốc
            camera_id: ID của camera
            roi_detection_data: Dữ liệu ROI detection
            end_monitoring_count: Số end slots đang được theo dõi
            
        Returns:
            Frame đã được vẽ thông tin
        """
        annotated_frame = frame.copy()
        
        # Mapping video source cho display
        video_mapping = {
            "cam-1": "hanam.mp4",
            "cam-2": "vinhPhuc.mp4"
        }
        video_name = video_mapping.get(camera_id, "unknown")
        
        # Tạo thông tin text
        info_text = f"Camera: {camera_id} ({video_name}) | Frame: {roi_detection_data.get('frame_id', 'N/A')}"
        roi_count = roi_detection_data.get('roi_detection_count', 0)
        total_count = roi_detection_data.get('original_detection_count', 0)
        
        # Đếm shelf và empty trong ROI detections
        roi_detections = roi_detection_data.get('roi_detections', [])
        shelf_count = sum(1 for d in roi_detections if d.get('class_name') == 'shelf')
        empty_count = sum(1 for d in roi_detections if d.get('class_name') == 'empty')
        
        info_text += f" | Shelf: {shelf_count}, Empty: {empty_count}, Total ROI: {roi_count}"
        if end_monitoring_count > 0:
            info_text += f" | End Monitoring: {end_monitoring_count}"
        
        # Vẽ text lên frame
        cv2.putText(annotated_frame, info_text, (10, 30), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        return annotated_frame
    
    def _is_detection_in_roi(self, detection: Dict[str, Any], roi_slots: List[Dict[str, Any]]) -> bool:
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
            if self._is_point_in_polygon((detection_center["x"], detection_center["y"]), points):
                return True
        
        return False
    
    def _is_point_in_polygon(self, point: Tuple[float, float], polygon: List[List[int]]) -> bool:
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
    
    def _draw_dashed_rectangle(self, image: np.ndarray, pt1: Tuple[int, int], pt2: Tuple[int, int], 
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
        self._draw_dashed_line(image, (x1, y1), (x2, y1), color, thickness, dash_length)
        # Cạnh phải
        self._draw_dashed_line(image, (x2, y1), (x2, y2), color, thickness, dash_length)
        # Cạnh dưới
        self._draw_dashed_line(image, (x2, y2), (x1, y2), color, thickness, dash_length)
        # Cạnh trái
        self._draw_dashed_line(image, (x1, y2), (x1, y1), color, thickness, dash_length)
    
    def _draw_dashed_line(self, image: np.ndarray, pt1: Tuple[int, int], pt2: Tuple[int, int], 
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


class VideoDisplayManager:
    """Class quản lý hiển thị video với ROI và detections (RTSP, 1 thread/camera)"""

    def __init__(self, show_video: bool = True, cam_config_path: str = os.path.join("logic", "cam_config.json")):
        """
        Khởi tạo Video Display Manager

        Args:
            show_video: Có hiển thị video không
            cam_config_path: Đường dẫn file cấu hình RTSP
        """
        self.show_video = show_video
        self.visualizer = ROIVisualizer()
        self.running = False
        self.cam_config_path = cam_config_path
        self.cam_urls: Dict[str, str] = {}
        self.cap_by_camera: Dict[str, cv2.VideoCapture] = {}
        self.thread_by_camera: Dict[str, threading.Thread] = {}
        self._lock = threading.RLock()
        # Tham chiếu tới dữ liệu chia sẻ từ processor
        self._roi_cache_ref: Optional[Dict[str, List[Dict[str, Any]]]] = None
        self._latest_roi_det_ref: Optional[Dict[str, Dict[str, Any]]] = None
        self._end_slot_states_ref: Optional[Dict[Tuple[str, int], Dict[str, Any]]] = None

        # DB/queue (queues.db ở root)
        self.db_path: str = "queues.db"
        self.queue: Optional[SQLiteQueue] = None
        try:
            self.queue = SQLiteQueue(self.db_path)
        except Exception as e:
            print(f"[ROI-DB] Lỗi khởi tạo SQLiteQueue: {e}")

        # Cache ROI khi đọc trực tiếp từ DB (fallback nếu roi_cache_ref trống)
        self._roi_cache_db: Dict[str, List[Dict[str, Any]]] = {}
        self._roi_last_row_id: Dict[str, int] = {}
        self._roi_last_fetch_ts: Dict[str, float] = {}

        self._load_cam_config()

    def _load_cam_config(self) -> None:
        """Load cấu hình RTSP từ cam_config.json"""
        try:
            if not os.path.exists(self.cam_config_path):
                print(f"[RTSP] Không tìm thấy cam_config: {self.cam_config_path}")
                return
            with open(self.cam_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            cam_urls = {}
            for item in cfg.get("cam_urls", []):
                if isinstance(item, list) and len(item) >= 2:
                    cam_id, url = item[0], item[1]
                    cam_urls[str(cam_id)] = str(url)
            self.cam_urls = cam_urls
            print(f"[RTSP] Đã load {len(self.cam_urls)} RTSP urls từ {self.cam_config_path}")
        except Exception as e:
            print(f"[RTSP] Lỗi load cam_config: {e}")

    def _get_rtsp_url(self, camera_id: str) -> Optional[str]:
        return self.cam_urls.get(camera_id)

    def _open_capture(self, camera_id: str) -> Optional[cv2.VideoCapture]:
        url = self._get_rtsp_url(camera_id)
        if not url:
            print(f"[RTSP] Không tìm thấy URL cho {camera_id}")
            return None
        cap = cv2.VideoCapture(url)
        if not cap.isOpened():
            cap.release()
            print(f"[RTSP] Không mở được stream cho {camera_id}: {url}")
            return None
        print(f"[RTSP] Đã kết nối {camera_id}: {url}")
        return cap

    def _get_roi_slots(self, camera_id: str) -> List[Dict[str, Any]]:
        """Lấy ROI slots cho camera. Ưu tiên tham chiếu từ processor, nếu trống thì đọc từ queues.db."""
        # 1) Thử lấy từ tham chiếu sống (roi_cache) nếu có và không rỗng
        try:
            if self._roi_cache_ref and camera_id in self._roi_cache_ref:
                slots = self._roi_cache_ref.get(camera_id) or []
                if isinstance(slots, list) and len(slots) > 0:
                    return slots
        except Exception:
            pass

        # 2) Fallback: đọc từ queues.db (topic roi_config, key=camera_id)
        #    Thực hiện lazy-fetch và throttle theo thời gian
        now = time.time()
        last_fetch = self._roi_last_fetch_ts.get(camera_id, 0.0)
        if now - last_fetch < 2.0:  # tránh query quá dày
            return self._roi_cache_db.get(camera_id, [])

        self._roi_last_fetch_ts[camera_id] = now

        if not self.queue:
            return self._roi_cache_db.get(camera_id, [])

        try:
            with self.queue._connect() as conn:
                cur = conn.execute(
                    """
                    SELECT id, payload FROM messages
                    WHERE topic = 'roi_config' AND key = ?
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    (camera_id,),
                )
                row = cur.fetchone()
                if not row:
                    return self._roi_cache_db.get(camera_id, [])

                row_id, payload = row
                if self._roi_last_row_id.get(camera_id) == row_id:
                    return self._roi_cache_db.get(camera_id, [])

                data = json.loads(payload) if isinstance(payload, str) else payload
                slots = data.get("slots", [])
                if isinstance(slots, list):
                    self._roi_cache_db[camera_id] = slots
                    self._roi_last_row_id[camera_id] = row_id
                    print(f"[ROI-DB] Đã cập nhật ROI từ DB cho {camera_id}: {len(slots)} slots (row_id={row_id})")
                return self._roi_cache_db.get(camera_id, [])
        except Exception as e:
            print(f"[ROI-DB] Lỗi khi đọc ROI cho {camera_id}: {e}")
            return self._roi_cache_db.get(camera_id, [])

    def _get_latest_detection(self, camera_id: str) -> Optional[Dict[str, Any]]:
        try:
            return self._latest_roi_det_ref.get(camera_id) if self._latest_roi_det_ref else None
        except Exception:
            return None

    def _camera_loop(self, camera_id: str) -> None:
        window_name = f"ROI Detection - {camera_id}"
        cap: Optional[cv2.VideoCapture] = None
        last_reconnect_ts = 0.0
        reconnect_interval = 5.0  # giây

        while self.running:
            try:
                if cap is None or not cap.isOpened():
                    now = time.time()
                    if now - last_reconnect_ts < 0.5:
                        time.sleep(0.5)
                        continue
                    last_reconnect_ts = now
                    cap = self._open_capture(camera_id)
                    with self._lock:
                        self.cap_by_camera[camera_id] = cap if cap and cap.isOpened() else None
                    if cap is None:
                        time.sleep(reconnect_interval)
                        continue

                ret, frame = cap.read()
                if not ret or frame is None:
                    time.sleep(0.02)
                    continue

                roi_slots = self._get_roi_slots(camera_id)
                frame_with_roi = self.visualizer.draw_roi_on_frame(frame, camera_id, roi_slots)

                latest_roi_detection = self._get_latest_detection(camera_id)
                if latest_roi_detection and latest_roi_detection.get("roi_detections"):
                    frame_with_detections = self.visualizer.draw_detections_on_frame(
                        frame_with_roi, latest_roi_detection["roi_detections"], camera_id, roi_slots
                    )
                    end_monitoring_count = 0
                    if self._end_slot_states_ref:
                        try:
                            end_monitoring_count = sum(1 for end_slot in self._end_slot_states_ref.keys() if end_slot[0] == camera_id)
                        except Exception:
                            end_monitoring_count = 0
                    frame_with_info = self.visualizer.draw_info_text(
                        frame_with_detections, camera_id, latest_roi_detection, end_monitoring_count
                    )
                    if self.show_video:
                        cv2.imshow(window_name, frame_with_info)
                else:
                    if self.show_video:
                        cv2.imshow(window_name, frame_with_roi)

                if self.show_video:
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord('q'):
                        self.running = False
                        break
                time.sleep(0.01)

            except Exception as e:
                print(f"[RTSP] Lỗi thread camera {camera_id}: {e}")
                time.sleep(1)

        # Cleanup cho thread
        try:
            if cap is not None:
                cap.release()
        except Exception:
            pass
        if self.show_video:
            try:
                cv2.destroyWindow(window_name)
            except Exception:
                pass

    def display_video(self, roi_cache: Dict[str, List[Dict[str, Any]]], 
                      latest_roi_detections: Dict[str, Dict[str, Any]],
                      end_slot_states: Dict[Tuple[str, int], Dict[str, Any]],
                      video_captures: Dict[str, Any],
                      frame_cache: Dict[str, np.ndarray],
                      update_frame_cache_func) -> None:
        """
        Hiển thị video real-time với ROI và detections bằng RTSP, 1 thread/camera

        Args:
            roi_cache: Cache ROI theo camera_id (tham chiếu sống)
            latest_roi_detections: Latest ROI detection data cho mỗi camera (tham chiếu sống)
            end_slot_states: Trạng thái end slots (tham chiếu sống)
            video_captures: (Không dùng với RTSP threading, giữ để tương thích)
            frame_cache: (Không dùng với RTSP threading, giữ để tương thích)
            update_frame_cache_func: (Không dùng với RTSP threading, giữ để tương thích)
        """
        if not self.show_video:
            return

        self._roi_cache_ref = roi_cache
        self._latest_roi_det_ref = latest_roi_detections
        self._end_slot_states_ref = end_slot_states

        print("Bắt đầu hiển thị video (RTSP, 1 thread/camera)...")
        self.running = True

        # Tạo thread cho mỗi camera có trong cam_config (không phụ thuộc roi_cache)
        started = 0
        for camera_id in list(self.cam_urls.keys()):
            if camera_id in self.thread_by_camera and self.thread_by_camera[camera_id].is_alive():
                continue
            t = threading.Thread(target=self._camera_loop, args=(camera_id,), daemon=True)
            self.thread_by_camera[camera_id] = t
            t.start()
            started += 1
        if started:
            print(f"[RTSP] Đã khởi tạo {started} thread camera từ cam_config.json")

        # Vòng lặp giám sát threads
        try:
            while self.running:
                alive_any = False
                for cam_id, t in list(self.thread_by_camera.items()):
                    if t.is_alive():
                        alive_any = True
                    else:
                        # Thử khởi động lại nếu còn trong cam_config
                        if cam_id in self.cam_urls and self.running:
                            nt = threading.Thread(target=self._camera_loop, args=(cam_id,), daemon=True)
                            self.thread_by_camera[cam_id] = nt
                            nt.start()
                # Khởi động thread mới nếu cam_config có camera mới
                for cam_id in list(self.cam_urls.keys()):
                    if cam_id not in self.thread_by_camera or not self.thread_by_camera[cam_id].is_alive():
                        if self.running:
                            nt = threading.Thread(target=self._camera_loop, args=(cam_id,), daemon=True)
                            self.thread_by_camera[cam_id] = nt
                            nt.start()
                # Nếu không còn thread nào và vẫn running, ngủ ngắn
                time.sleep(0.5)
        except KeyboardInterrupt:
            self.running = False
        finally:
            self.stop()

    def stop(self):
        """Dừng hiển thị video, dừng tất cả thread và giải phóng camera"""
        self.running = False
        # Dừng threads và release captures
        with self._lock:
            for cam_id, cap in list(self.cap_by_camera.items()):
                try:
                    if cap is not None:
                        cap.release()
                except Exception:
                    pass
                self.cap_by_camera[cam_id] = None
        # Hủy các cửa sổ
        try:
            cv2.destroyAllWindows()
        except Exception:
            pass
