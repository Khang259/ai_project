"""
Optimized ROI Visualizer - Áp dụng kiến trúc Process/Thread để giảm tải CPU
"""

import cv2
import numpy as np
import threading
import time
import json
import os
from typing import Dict, List, Tuple, Any, Optional
from queue_store import SQLiteQueue
from collections import deque
import functools

class ROIVisualizer:
    """Class để vẽ ROI và detections với caching"""
    
    def __init__(self):
        """Khởi tạo với các optimization flags"""
        self._roi_overlay_cache: Dict[str, np.ndarray] = {}
        self._roi_hash_cache: Dict[str, int] = {}
        
        # Pre-computed colors và styles
        self.COLOR_ROI = (0, 255, 0)
        self.COLOR_SHELF_IN_ROI = (0, 0, 255)
        self.COLOR_EMPTY = (128, 0, 0)
        self.COLOR_OUTSIDE_ROI = (128, 128, 128)
        self.COLOR_WHITE = (255, 255, 255)
        
        self.FONT = cv2.FONT_HERSHEY_SIMPLEX
        self.FONT_SCALE = 0.6
        self.FONT_THICKNESS = 2
    
    def _compute_roi_hash(self, roi_slots: List[Dict[str, Any]]) -> int:
        """Tạo hash cho ROI để detect changes"""
        if not roi_slots:
            return 0
        return hash(json.dumps(roi_slots, sort_keys=True))
    
    def draw_roi_on_frame(self, frame: np.ndarray, camera_id: str, 
                         roi_slots: List[Dict[str, Any]]) -> np.ndarray:
        """Vẽ ROI với caching"""
        if not roi_slots:
            return frame
        
        roi_hash = self._compute_roi_hash(roi_slots)
        cache_key = f"{camera_id}_{roi_hash}"
        
        # Check cache
        if cache_key in self._roi_overlay_cache:
            overlay = self._roi_overlay_cache[cache_key]
            return cv2.addWeighted(frame, 1, overlay, 0.3, 0)
        
        # Create overlay
        overlay = np.zeros_like(frame)
        for i, slot in enumerate(roi_slots):
            points = slot["points"]
            if len(points) >= 3:
                pts = np.array(points, dtype=np.int32)
                cv2.polylines(overlay, [pts], True, self.COLOR_ROI, 2)
                for point in points:
                    cv2.circle(overlay, tuple(point), 4, self.COLOR_ROI, -1)
        
        self._roi_overlay_cache[cache_key] = overlay
        return cv2.addWeighted(frame, 1, overlay, 0.3, 0)
    
    def draw_detections_on_frame(self, frame: np.ndarray, detections: List[Dict[str, Any]], 
                                camera_id: str, roi_slots: List[Dict[str, Any]]) -> np.ndarray:
        """Vẽ detections batch"""
        if not detections:
            return frame
        
        for detection in detections:
            bbox = detection["bbox"]
            x1, y1 = int(bbox["x1"]), int(bbox["y1"])
            x2, y2 = int(bbox["x2"]), int(bbox["y2"])
            class_name = detection["class_name"]
            confidence = detection.get("confidence", 1.0)
            
            if class_name == "empty":
                color = self.COLOR_EMPTY
                label = "EMPTY [ROI]"
            else:
                color = self.COLOR_SHELF_IN_ROI
                label = f"{class_name}: {confidence:.2f}"
            
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 5), 
                       self.FONT, self.FONT_SCALE, color, self.FONT_THICKNESS)
        
        return frame
    
    def _is_point_in_polygon(self, point: Tuple[float, float], polygon: List[List[int]]) -> bool:
        """Kiểm tra điểm có nằm trong polygon không"""
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


class CameraDisplayThread(threading.Thread):
    """Thread xử lý display cho một camera - Áp dụng kiến trúc camera_thread.py"""
    
    def __init__(self, camera_id: str, rtsp_url: str, local_dict: Dict,
                 config: Dict[str, Any], visualizer: ROIVisualizer,
                 max_retry_attempts: int = 5, target_fps: float = 10.0):
        """
        Args:
            camera_id: ID camera
            rtsp_url: RTSP URL
            local_dict: Dict local trong main thread
            config: Cấu hình optimization
            visualizer: ROIVisualizer instance
            max_retry_attempts: Số lần thử kết nối lại
            target_fps: FPS mục tiêu
        """
        super().__init__(daemon=True)
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.local_dict = local_dict
        self.config = config
        self.visualizer = visualizer
        self.running = False
        
        # Retry mechanism (giống camera_thread.py)
        self.max_retry_attempts = max_retry_attempts
        self.retry_count = 0
        self.last_successful_connection = None
        
        # FPS control (giống camera_thread.py)
        self.target_fps = target_fps
        self.frame_interval = 1.0 / target_fps
        self.last_frame_time = 0
        
        # Window name
        self.window_name = f"ROI Detection - {camera_id}"
    
    def _try_connect_camera(self, timeout: float = 5.0) -> Optional[cv2.VideoCapture]:
        """Thử kết nối camera với timeout (giống camera_thread.py)"""
        print(f"[{self.camera_id}] Đang kết nối... (lần thử {self.retry_count + 1}/{self.max_retry_attempts})")
        
        cap = cv2.VideoCapture(self.rtsp_url)
        
        # Set buffer size để giảm lag
        buffer_size = self.config.get('buffer_size', 1)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, buffer_size)
        
        start_time = time.time()
        while not cap.isOpened() and (time.time() - start_time) < timeout:
            time.sleep(0.1)
            cap = cv2.VideoCapture(self.rtsp_url)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, buffer_size)
        
        if cap.isOpened():
            print(f"[{self.camera_id}] Kết nối thành công")
            self.retry_count = 0
            self.last_successful_connection = time.time()
            return cap
        else:
            print(f"[{self.camera_id}] Timeout {timeout}s")
            return None
    
    def _handle_connection_failure(self) -> bool:
        """Xử lý khi kết nối thất bại (giống camera_thread.py)"""
        self.retry_count += 1
        
        if self.retry_count >= self.max_retry_attempts:
            print(f"[{self.camera_id}] Đã thử {self.max_retry_attempts} lần. Dừng.")
            self.local_dict[self.camera_id] = {
                'status': 'connection_failed',
                'retry_count': self.retry_count,
                'last_attempt': time.time()
            }
            return False
        else:
            # Exponential backoff
            wait_time = min(2 ** self.retry_count, 30)
            print(f"[{self.camera_id}] Thử lại sau {wait_time}s...")
            
            self.local_dict[self.camera_id] = {
                'status': 'retrying',
                'retry_count': self.retry_count,
                'next_retry_in': wait_time
            }
            
            time.sleep(wait_time)
            return True
    
    def _process_frame(self, frame: np.ndarray, roi_slots: List, detections: List) -> np.ndarray:
        """Xử lý frame: resize + scale coordinates + draw"""
        # Resize để giảm tải (giống camera_thread.py resize 640x360)
        h, w = frame.shape[:2]
        max_dim = self.config.get('max_display_resolution', 1280)
        scale = 1.0
        
        if w > max_dim or h > max_dim:
            scale = max_dim / max(w, h)
            new_w = int(w * scale)
            new_h = int(h * scale)
            frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Scale coordinates nếu cần
        if scale != 1.0 and roi_slots:
            roi_slots = self._scale_roi_coordinates(roi_slots, scale)
        if scale != 1.0 and detections:
            detections = self._scale_detection_coordinates(detections, scale)
        
        # Draw ROI và detections
        if roi_slots:
            frame = self.visualizer.draw_roi_on_frame(frame, self.camera_id, roi_slots)
        if detections:
            frame = self.visualizer.draw_detections_on_frame(frame, detections, self.camera_id, roi_slots)
        
        return frame
    
    def _scale_roi_coordinates(self, roi_slots: List[Dict], scale: float) -> List[Dict]:
        """Scale ROI coordinates"""
        if scale == 1.0:
            return roi_slots
        
        scaled_slots = []
        for slot in roi_slots:
            scaled_slot = dict(slot)
            scaled_points = [[int(p[0] * scale), int(p[1] * scale)] for p in slot["points"]]
            scaled_slot["points"] = scaled_points
            scaled_slots.append(scaled_slot)
        
        return scaled_slots
    
    def _scale_detection_coordinates(self, detections: List[Dict], scale: float) -> List[Dict]:
        """Scale detection coordinates"""
        if scale == 1.0:
            return detections
        
        scaled_detections = []
        for detection in detections:
            scaled_detection = dict(detection)
            
            if "bbox" in detection:
                bbox = detection["bbox"]
                scaled_detection["bbox"] = {
                    "x1": int(bbox["x1"] * scale),
                    "y1": int(bbox["y1"] * scale),
                    "x2": int(bbox["x2"] * scale),
                    "y2": int(bbox["y2"] * scale)
                }
            
            if "center" in detection:
                center = detection["center"]
                scaled_detection["center"] = {
                    "x": center["x"] * scale,
                    "y": center["y"] * scale
                }
            
            scaled_detections.append(scaled_detection)
        
        return scaled_detections
    
    def run(self):
        """Vòng lặp chính (giống camera_thread.py)"""
        self.running = True
        
        # Thử kết nối ban đầu
        cap = self._try_connect_camera()
        if cap is None:
            while self.running and self.retry_count < self.max_retry_attempts:
                if not self._handle_connection_failure():
                    return
                cap = self._try_connect_camera()
                if cap is not None:
                    break
        
        while self.running:
            try:
                ret, frame = cap.read()
                if not ret:
                    print(f"[{self.camera_id}] Mất tín hiệu, thử kết nối lại...")
                    cap.release()
                    cap = self._try_connect_camera()
                    if cap is None:
                        if not self._handle_connection_failure():
                            return
                        continue
                    else:
                        print(f"[{self.camera_id}] Kết nối lại thành công")
                        continue
                
                # FPS control (giống camera_thread.py)
                current_time = time.time()
                if current_time - self.last_frame_time < self.frame_interval:
                    continue
                
                self.last_frame_time = current_time
                
                # Lấy ROI và detections từ local_dict
                roi_slots = self.local_dict.get(f'{self.camera_id}_roi', [])
                roi_detections_data = self.local_dict.get(f'{self.camera_id}_detections', {})
                detections = roi_detections_data.get('roi_detections', [])
                
                # Process frame
                processed_frame = self._process_frame(frame, roi_slots, detections)
                
                # Display
                cv2.imshow(self.window_name, processed_frame)
                
                # Update status
                self.local_dict[self.camera_id] = {
                    'status': 'ok',
                    'last_frame_time': current_time,
                    'fps': self.target_fps
                }
                
                # Check for quit
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    self.running = False
                    break
                
            except Exception as e:
                print(f"[{self.camera_id}] Lỗi: {e}")
                cap.release()
                cap = self._try_connect_camera()
                if cap is None:
                    if not self._handle_connection_failure():
                        return
                    continue
                else:
                    print(f"[{self.camera_id}] Kết nối lại sau lỗi")
                    continue
        
        cap.release()
        cv2.destroyWindow(self.window_name)
    
    def stop(self):
        """Dừng thread"""
        self.running = False


class VideoDisplayManager:
    """
    Optimized Video Display Manager - Áp dụng kiến trúc camera_process.py
    Sử dụng local_dict để giảm lock contention
    """
    
    def __init__(self, show_video: bool = True, 
                 cam_config_path: str = os.path.join("logic", "cam_config.json"),
                 config_path: str = "visualizer_config.json"):
        """Initialize với optimized defaults"""
        self.show_video = show_video
        self.visualizer = ROIVisualizer()
        self.running = False
        
        # Load config
        self.config = self._load_config(config_path)
        
        # Camera URLs
        self.cam_urls: Dict[str, str] = {}
        self._load_cam_config(cam_config_path)
        
        # Display threads (giống camera_threads trong camera_process.py)
        self.display_threads: Dict[str, CameraDisplayThread] = {}
        
        # Local dict (giống local_dict trong camera_process.py)
        self.local_dict: Dict[str, Any] = {}
        
        # Shared data references (từ processor)
        self._roi_cache_ref: Optional[Dict[str, List[Dict[str, Any]]]] = None
        self._latest_roi_det_ref: Optional[Dict[str, Dict[str, Any]]] = None
        self._end_slot_states_ref: Optional[Dict[Tuple[str, int], Dict[str, Any]]] = None
        
        # DB/queue
        self.db_path: str = "queues.db"
        self.queue: Optional[SQLiteQueue] = None
        try:
            self.queue = SQLiteQueue(self.db_path)
        except Exception as e:
            print(f"[ROI-DB] Lỗi khởi tạo SQLiteQueue: {e}")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load optimized configuration"""
        default_config = {
            'max_workers': 4,
            'buffer_size': 1,
            'target_fps': 10,
            'max_display_resolution': 1280,
            'roi_cache_ttl': 30.0,
            'reconnect_delay': 5.0,
            'max_retry_attempts': 5
        }
        
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    default_config.update(config)
                print(f"[CONFIG] Đã load từ {config_path}")
        except Exception as e:
            print(f"[CONFIG] Sử dụng mặc định: {e}")
        
        return default_config
    
    def _load_cam_config(self, cam_config_path: str):
        """Load camera RTSP URLs"""
        try:
            if os.path.exists(cam_config_path):
                with open(cam_config_path, 'r') as f:
                    cfg = json.load(f)
                for item in cfg.get("cam_urls", []):
                    if isinstance(item, list) and len(item) >= 2:
                        self.cam_urls[str(item[0])] = str(item[1])
                print(f"[RTSP] Loaded {len(self.cam_urls)} camera URLs")
        except Exception as e:
            print(f"[RTSP] Error: {e}")
    
    def _update_local_dict_from_processor(self):
        """
        Update local_dict từ processor data
        (giống việc copy từ local_dict → shared_dict trong camera_process.py)
        """
        try:
            # Update ROI cache
            if self._roi_cache_ref:
                for camera_id, roi_slots in self._roi_cache_ref.items():
                    self.local_dict[f'{camera_id}_roi'] = roi_slots
            
            # Update detection cache
            if self._latest_roi_det_ref:
                for camera_id, roi_det_data in self._latest_roi_det_ref.items():
                    self.local_dict[f'{camera_id}_detections'] = roi_det_data
        
        except Exception as e:
            print(f"[UPDATE] Lỗi update local_dict: {e}")
    
    def display_video(self, roi_cache: Dict, latest_roi_detections: Dict,
                      end_slot_states: Dict, video_captures: Dict,
                      frame_cache: Dict, update_frame_cache_func):
        """
        Display video với multi-threading optimization
        Áp dụng kiến trúc camera_process_worker
        """
        if not self.show_video:
            return
        
        # Set shared references
        self._roi_cache_ref = roi_cache
        self._latest_roi_det_ref = latest_roi_detections
        self._end_slot_states_ref = end_slot_states
        
        self.running = True
        print(f"[DISPLAY] Starting optimized display (target_fps={self.config['target_fps']})")
        
        # Tạo display threads cho mỗi camera (giống camera_process.py)
        target_fps = self.config.get('target_fps', 10)
        max_retry = self.config.get('max_retry_attempts', 5)
        
        for camera_id, rtsp_url in self.cam_urls.items():
            if camera_id in self.display_threads and self.display_threads[camera_id].is_alive():
                continue
            
            thread = CameraDisplayThread(
                camera_id=camera_id,
                rtsp_url=rtsp_url,
                local_dict=self.local_dict,
                config=self.config,
                visualizer=self.visualizer,
                max_retry_attempts=max_retry,
                target_fps=target_fps
            )
            self.display_threads[camera_id] = thread
            thread.start()
            print(f"[DISPLAY] Khởi động thread {camera_id} (FPS: {target_fps})")
        
        # Vòng lặp update local_dict (giống camera_process.py update loop)
        try:
            while self.running:
                # Update local_dict từ processor data
                self._update_local_dict_from_processor()
                
                # Check thread health
                for cam_id, thread in list(self.display_threads.items()):
                    if not thread.is_alive() and self.running:
                        # Restart thread nếu chết
                        if cam_id in self.cam_urls:
                            new_thread = CameraDisplayThread(
                                camera_id=cam_id,
                                rtsp_url=self.cam_urls[cam_id],
                                local_dict=self.local_dict,
                                config=self.config,
                                visualizer=self.visualizer,
                                max_retry_attempts=max_retry,
                                target_fps=target_fps
                            )
                            self.display_threads[cam_id] = new_thread
                            new_thread.start()
                            print(f"[DISPLAY] Restart thread {cam_id}")
                
                time.sleep(0.1)  # Update mỗi 100ms (giống camera_process.py)
        
        except KeyboardInterrupt:
            self.running = False
        finally:
            self.stop()
    
    def stop(self):
        """Dừng tất cả threads"""
        self.running = False
        
        # Dừng tất cả display threads (giống camera_process.py)
        for camera_id, thread in self.display_threads.items():
            thread.stop()
        
        # Đợi threads kết thúc
        for camera_id, thread in self.display_threads.items():
            thread.join(timeout=1.0)
        
        cv2.destroyAllWindows()
        print("[DISPLAY] Stopped")