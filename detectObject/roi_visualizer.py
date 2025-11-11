"""
ROI Visualizer - Hiển thị trực quan kết quả detection trong ROI
Sử dụng threading để hiển thị video real-time với cv2.imshow
"""

import cv2
import numpy as np
import time
import threading
from multiprocessing import Queue
from typing import Dict, List, Any, Optional
from collections import defaultdict, deque
import json
from pathlib import Path

from utils import decode_jpeg_frame


class ROIVisualizer:
    """Class để vẽ và hiển thị ROI trên video"""
    
    def __init__(self, roi_config_path: str = "../logic/roi_config.json"):
        """
        Khởi tạo ROI Visualizer
        
        Args:
            roi_config_path: Đường dẫn đến file ROI config
        """
        self.roi_config_path = roi_config_path
        self.roi_config: Dict[str, List[Dict[str, Any]]] = {}
        self.load_roi_config()
        
        # Cache kết quả ROI matching (camera_id -> slot_id -> result)
        self.roi_matches: Dict[str, Dict[str, Dict[str, Any]]] = defaultdict(dict)
        
        # Lock cho thread safety
        self.lock = threading.Lock()
        
        # FPS tracking
        self.fps_trackers: Dict[str, deque] = defaultdict(lambda: deque(maxlen=30))
        
        # Color palette
        self.colors = {
            'shelf': (0, 255, 0),      # Xanh lá - có hàng
            'empty': (0, 0, 255),      # Đỏ - trống
            'roi_normal': (255, 255, 0),  # Vàng - ROI chưa detect
            'roi_match': (0, 255, 0),     # Xanh lá - ROI có match
            'text': (255, 255, 255),      # Trắng - text
            'bg': (0, 0, 0)               # Đen - background
        }
    
    def load_roi_config(self):
        """Load ROI config từ file JSON"""
        config_path = Path(self.roi_config_path)
        
        if not config_path.exists():
            return
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                self.roi_config = json.load(f)
        except Exception:
            pass
    
    @staticmethod
    def normalize_camera_id(camera_id: str) -> str:
        """Chuẩn hóa camera ID"""
        return camera_id.lower().replace("-", "").replace("_", "")
    
    def get_roi_config(self, camera_id: str) -> List[Dict[str, Any]]:
        """
        Lấy ROI config của camera (hỗ trợ normalization)
        
        Args:
            camera_id: ID camera
            
        Returns:
            Danh sách ROI config
        """
        # Thử tìm trực tiếp
        if camera_id in self.roi_config:
            return self.roi_config[camera_id]
        
        # Normalize và tìm lại
        normalized = self.normalize_camera_id(camera_id)
        for config_cam_id, rois in self.roi_config.items():
            if self.normalize_camera_id(config_cam_id) == normalized:
                return rois
        
        return []
    
    def update_roi_match(self, match_result: Dict[str, Any]):
        """
        Cập nhật kết quả ROI matching
        
        Args:
            match_result: Kết quả match từ ROI Checker
        """
        camera_id = match_result.get('camera_id', 'unknown')
        slot_id = match_result.get('slot_id', 'unknown')
        
        with self.lock:
            self.roi_matches[camera_id][slot_id] = {
                'object_type': match_result.get('object_type', 'unknown'),
                'confidence': match_result.get('confidence', 0.0),
                'iou': match_result.get('iou', 0.0),
                'bbox': match_result.get('bbox', []),
                'timestamp': time.time()
            }
    
    def draw_roi_rect(self, frame: np.ndarray, roi: Dict[str, Any], 
                      match_info: Optional[Dict[str, Any]] = None) -> np.ndarray:
        """
        Vẽ ROI rectangle lên frame
        
        Args:
            frame: OpenCV frame
            roi: ROI config {"slot_id": "ROI_1", "rect": [x, y, w, h]} - tọa độ ở 640x360
            match_info: Thông tin match (nếu có)
            
        Returns:
            Frame đã vẽ
        """
        rect = roi.get('rect', [])
        if len(rect) != 4:
            return frame
        
        # ROI rect được lưu ở 640x360, cần scale lại về kích thước frame hiện tại
        frame_h, frame_w = frame.shape[:2]
        target_w, target_h = 640, 360
        
        scale_x = frame_w / target_w
        scale_y = frame_h / target_h
        
        x = int(rect[0] * scale_x)
        y = int(rect[1] * scale_y)
        w = int(rect[2] * scale_x)
        h = int(rect[3] * scale_y)
        
        slot_id = roi.get('slot_id', 'unknown')
        
        # Chọn màu dựa trên trạng thái
        if match_info:
            object_type = match_info.get('object_type', 'unknown')
            color = self.colors.get(object_type, self.colors['roi_match'])
            thickness = 1
            
            # Vẽ bbox detection nếu có (scale về kích thước frame)
            bbox = match_info.get('bbox', [])
            if len(bbox) == 4:
                # Detection bbox ở 640x360, scale về kích thước frame
                x1 = int(bbox[0] * scale_x)
                y1 = int(bbox[1] * scale_y)
                x2 = int(bbox[2] * scale_x)
                y2 = int(bbox[3] * scale_y)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)
        else:
            color = self.colors['roi_normal']
            thickness = 1
        
        # Vẽ ROI rectangle
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, thickness)
        
        # Vẽ label: slot_id + class (shelf/empty) + confidence
        if match_info:
            obj_type = match_info.get('object_type', 'empty')
            # Nếu class khác 0 (shelf), mặc định là "empty"
            if obj_type not in ['shelf', 'empty']:
                obj_type = 'empty'
            confidence = match_info.get('confidence', 0.0)
            label = f"{slot_id}|{obj_type}|{confidence:.2f}"
        else:
            label = slot_id
        
        # Điều chỉnh font size dựa trên kích thước frame
        # Với frame 640x360, dùng font size nhỏ hơn
        font_scale = 0.35
        font_thickness = 1
        
        # Background cho text
        (text_w, text_h), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness
        )
        
        # Vẽ background với padding nhỏ hơn
        padding = 2
        cv2.rectangle(
            frame,
            (x, y - text_h - baseline - padding - 2),
            (x + text_w + padding * 2, y),
            self.colors['bg'],
            -1
        )
        
        # Vẽ text
        cv2.putText(
            frame,
            label,
            (x + padding, y - padding - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            self.colors['text'],
            font_thickness
        )
        
        return frame
    
    # def draw_info_panel(self, frame: np.ndarray, camera_id: str, fps: float) -> np.ndarray:
        # """
        # Vẽ panel thông tin lên frame
        
        # Args:
        #     frame: OpenCV frame
        #     camera_id: ID camera
        #     fps: FPS hiện tại
            
        # Returns:
        #     Frame đã vẽ
        # """
        # h, w = frame.shape[:2]
        
        # # Vẽ background cho panel
        # panel_h = 80
        # overlay = frame.copy()
        # cv2.rectangle(overlay, (0, 0), (w, panel_h), self.colors['bg'], -1)
        # frame = cv2.addWeighted(overlay, 0.7, frame, 0.3, 0)
        
        # # Camera ID
        # cv2.putText(
        #     frame,
        #     f"Camera: {camera_id}",
        #     (10, 25),
        #     cv2.FONT_HERSHEY_SIMPLEX,
        #     0.7,
        #     self.colors['text'],
        #     2
        # )
        
        # FPS
        # cv2.putText(
        #     frame,
        #     f"FPS: {fps:.1f}",
        #     (10, 50),
        #     cv2.FONT_HERSHEY_SIMPLEX,
        #     0.6,
        #     self.colors['text'],
        #     2
        # )
        
        # Số ROI matches
        # with self.lock:
        #     match_count = len(self.roi_matches.get(camera_id, {}))
        
        # cv2.putText(
        #     frame,
        #     f"Matches: {match_count}",
        #     (150, 50),
        #     cv2.FONT_HERSHEY_SIMPLEX,
        #     0.6,
        #     self.colors['text'],
        #     2
        # )
        
        # # Timestamp
        # timestamp_str = time.strftime("%H:%M:%S")
        # cv2.putText(
        #     frame,
        #     timestamp_str,
        #     (w - 120, 25),
        #     cv2.FONT_HERSHEY_SIMPLEX,
        #     0.6,
        #     self.colors['text'],
        #     2
        # )
        
        # return frame
    
    # def draw_legend(self, frame: np.ndarray) -> np.ndarray:
    #     """
    #     Vẽ legend (chú thích) lên frame
        
    #     Args:
    #         frame: OpenCV frame
            
    #     Returns:
    #         Frame đã vẽ
    #     """
    #     h, w = frame.shape[:2]
        
    #     legend_items = [
    #         ("Shelf (Co hang)", self.colors['shelf']),
    #         ("Empty (Trong)", self.colors['empty']),
    #         ("ROI", self.colors['roi_normal'])
    #     ]
        
    #     y_offset = h - 30
    #     x_start = 10
        
    #     for label, color in legend_items:
    #         # Vẽ box màu
    #         cv2.rectangle(frame, (x_start, y_offset), (x_start + 20, y_offset + 15), color, -1)
    #         cv2.rectangle(frame, (x_start, y_offset), (x_start + 20, y_offset + 15), (255, 255, 255), 1)
            
    #         # Vẽ text
    #         cv2.putText(
    #             frame,
    #             label,
    #             (x_start + 25, y_offset + 12),
    #             cv2.FONT_HERSHEY_SIMPLEX,
    #             0.4,
    #             self.colors['text'],
    #             1
    #         )
            
    #         x_start += 180
        
    #     return frame
    
    def visualize_frame(self, frame: np.ndarray, camera_id: str) -> np.ndarray:
        """
        Vẽ visualization lên frame
        
        Args:
            frame: OpenCV frame
            camera_id: ID camera
            
        Returns:
            Frame đã vẽ visualization
        """
        if frame is None:
            return None
        
        # Lấy ROI config
        rois = self.get_roi_config(camera_id)
        
        # Vẽ từng ROI
        with self.lock:
            camera_matches = self.roi_matches.get(camera_id, {})
            
            for roi in rois:
                slot_id = roi.get('slot_id', 'unknown')
                match_info = camera_matches.get(slot_id)
                
                # Lọc match info cũ (> 2 giây)
                if match_info and (time.time() - match_info.get('timestamp', 0)) > 2.0:
                    match_info = None
                
                frame = self.draw_roi_rect(frame, roi, match_info)
        
        # # Tính FPS
        # current_time = time.time()
        # self.fps_trackers[camera_id].append(current_time)
        
        # if len(self.fps_trackers[camera_id]) >= 2:
        #     time_diff = self.fps_trackers[camera_id][-1] - self.fps_trackers[camera_id][0]
        #     fps = len(self.fps_trackers[camera_id]) / time_diff if time_diff > 0 else 0
        # else:
        #     fps = 0
        
        # Vẽ info panel
        # frame = self.draw_info_panel(frame, camera_id, fps)
        
        # # Vẽ legend
        # frame = self.draw_legend(frame)
        
        return frame


def roi_visualizer_worker(
    shared_dict: Dict[str, Any],
    roi_result_queue: Queue,
    roi_config_path: str = "../logic/roi_config.json",
    window_width: int = 640,
    window_height: int = 360,
    target_fps: float = 15.0
):
    """
    Worker process để hiển thị video với ROI visualization
    
    Args:
        shared_dict: Shared dict chứa frame từ camera
        roi_result_queue: Queue nhận kết quả ROI matching
        roi_config_path: Đường dẫn ROI config
        window_width: Chiều rộng cửa sổ hiển thị
        window_height: Chiều cao cửa sổ hiển thị
        target_fps: FPS mục tiêu cho visualization
    """
    # Khởi tạo visualizer
    visualizer = ROIVisualizer(roi_config_path)
    
    # Thread để đọc ROI matches từ queue
    def roi_match_reader():
        """Thread để đọc ROI match results từ queue"""
        while True:
            try:
                match_result = roi_result_queue.get(timeout=0.1)
                visualizer.update_roi_match(match_result)
            except:
                pass
    
    # Khởi động thread reader
    reader_thread = threading.Thread(target=roi_match_reader, daemon=True)
    reader_thread.start()
    
    # FPS controller
    frame_time = 1.0 / target_fps
    last_update = {}
    
    try:
        while True:
            loop_start = time.time()
            
            # Lấy danh sách camera
            camera_names = list(shared_dict.keys())
            
            if not camera_names:
                time.sleep(0.1)
                continue
            
            # Hiển thị từng camera
            for cam_name in camera_names:
                # FPS control per camera
                current_time = time.time()
                if cam_name in last_update:
                    if (current_time - last_update[cam_name]) < frame_time:
                        continue
                
                last_update[cam_name] = current_time
                
                # Lấy frame data
                cam_data = shared_dict.get(cam_name, {})
                
                if cam_data.get('status') != 'ok':
                    continue
                
                jpeg_bytes = cam_data.get('frame')
                if not jpeg_bytes:
                    continue
                
                try:
                    # Decode frame
                    frame = decode_jpeg_frame(jpeg_bytes)
                    if frame is None:
                        continue
                    
                    # Visualize
                    vis_frame = visualizer.visualize_frame(frame, cam_name)
                    if vis_frame is None:
                        continue
                    
                    # Resize cho hiển thị
                    vis_frame = cv2.resize(vis_frame, (window_width, window_height))
                    
                    # Hiển thị
                    window_name = f"{cam_name}"
                    cv2.imshow(window_name, vis_frame)
                    
                except Exception:
                    pass
            
            # Xử lý keyboard
            key = cv2.waitKey(1) & 0xFF
            if key == 27:  # ESC
                break
            elif key == ord('q'):
                break
            elif key == ord('r'):
                # Reload ROI config
                visualizer.load_roi_config()
            
            # Sleep để đạt target FPS
            elapsed = time.time() - loop_start
            sleep_time = max(0, frame_time - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)
    
    except KeyboardInterrupt:
        pass
    except Exception:
        pass
    finally:
        cv2.destroyAllWindows()


# # Test standalone
# if __name__ == "__main__":
#     """Test ROI Visualizer với video file"""
#     import sys
    
#     print("=" * 60)
#     print("Testing ROI Visualizer")
#     print("=" * 60)
    
#     # Load một frame test
#     video_path = input("Nhập đường dẫn video (hoặc RTSP URL): ").strip()
    
#     if not video_path:
#         video_path = "rtsp://192.168.1.202:8554/live/cam6"
#         print(f"Sử dụng mặc định: {video_path}")
    
#     camera_id = "cam-88"
    
#     # Tạo visualizer
#     visualizer = ROIVisualizer("../logic/roi_config.json")
    
#     # Mô phỏng ROI match
#     test_match = {
#         'camera_id': camera_id,
#         'slot_id': 'ROI_3',
#         'object_type': 'shelf',
#         'confidence': 0.92,
#         'iou': 0.85,
#         'bbox': [710, 118, 928, 335],
#         'timestamp': time.time()
#     }
#     visualizer.update_roi_match(test_match)
    
#     # Mở video
#     cap = cv2.VideoCapture(video_path)
    
#     if not cap.isOpened():
#         print(f"Không mở được video: {video_path}")
#         sys.exit(1)
    
#     print("\nĐang hiển thị video...")
#     print("Nhấn 'q' hoặc ESC để thoát")
#     print("Nhấn 'r' để reload ROI config")
    
#     while True:
#         ret, frame = cap.read()
        
#         if not ret:
#             # Loop video
#             cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
#             continue
        
#         # Visualize
#         vis_frame = visualizer.visualize_frame(frame, camera_id)
        
#         if vis_frame is not None:
#             cv2.imshow(f"ROI Visualizer - {camera_id}", vis_frame)
        
#         # Keyboard
#         key = cv2.waitKey(30) & 0xFF
#         if key == 27 or key == ord('q'):
#             break
#         elif key == ord('r'):
#             print("Reloading ROI config...")
#             visualizer.load_roi_config()
    
#     cap.release()
#     cv2.destroyAllWindows()
#     print("\nĐã thoát!")

