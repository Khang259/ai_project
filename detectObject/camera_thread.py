import cv2
import time
import threading
from typing import Optional, Dict, Any

from config import camera_config
from utils import (
    encode_frame_to_jpeg, 
    resize_frame, 
    calculate_exponential_backoff,
    build_camera_status,
    FPSController
)


class CameraThread(threading.Thread):
    """Thread xử lý một camera"""
    
    def __init__(self, cam_name: str, cam_url: str, local_dict: Dict[str, Any], 
                 max_retry_attempts: Optional[int] = None, 
                 target_fps: Optional[float] = None):
        """
        Args:
            cam_name: Tên camera
            cam_url: URL/ID camera
            local_dict: Dict local trong process
            max_retry_attempts: Số lần thử kết nối lại tối đa (mặc định từ config)
            target_fps: FPS mục tiêu cho camera (mặc định từ config)
        """
        super().__init__(daemon=True)
        self.cam_name = cam_name
        self.cam_url = cam_url
        self.local_dict = local_dict
        self.running = False
        
        # Sử dụng config nếu không truyền tham số
        self.max_retry_attempts = max_retry_attempts or camera_config.MAX_RETRY_ATTEMPTS
        self.retry_count = 0
        self.last_successful_connection = None
        
        # FPS controller
        target_fps = target_fps or camera_config.TARGET_FPS
        self.fps_controller = FPSController(target_fps)
    
    def _try_connect_camera(self, timeout: Optional[float] = None) -> Optional[cv2.VideoCapture]:
        """
        Thử kết nối camera với timeout
        
        Args:
            timeout: Thời gian timeout (giây), mặc định từ config
        
        Returns:
            cv2.VideoCapture: Đối tượng camera nếu kết nối thành công, None nếu thất bại
        """
        if timeout is None:
            timeout = camera_config.CONNECTION_TIMEOUT
        
        cap = cv2.VideoCapture(self.cam_url)
        start_time = time.time()
        
        while not cap.isOpened() and (time.time() - start_time) < timeout:
            time.sleep(0.1)
            cap = cv2.VideoCapture(self.cam_url)
        
        if cap.isOpened():
            self.retry_count = 0  # Reset retry count khi kết nối thành công
            self.last_successful_connection = time.time()
            return cap
        else:
            return None
    
    def _handle_connection_failure(self) -> bool:
        """
        Xử lý khi kết nối camera thất bại
        
        Returns:
            bool: True nếu sẽ thử lại, False nếu đã hết số lần thử
        """
        self.retry_count += 1
        
        if self.retry_count >= self.max_retry_attempts:
            self.local_dict[self.cam_name] = build_camera_status(
                'connection_failed',
                frame=None,
                retry_count=self.retry_count,
                last_attempt=time.time()
            )
            return False
        else:
            # Tính thời gian chờ tăng dần (exponential backoff)
            wait_time = calculate_exponential_backoff(self.retry_count)
            
            self.local_dict[self.cam_name] = build_camera_status(
                'retrying',
                frame=None,
                retry_count=self.retry_count,
                next_retry_in=wait_time
            )
            
            time.sleep(wait_time)
            return True
        
    def run(self):
        """Vòng lặp chính đọc frame liên tục"""
        self.running = True
        
        # Thử kết nối camera ban đầu
        cap = self._try_connect_camera()
        if cap is None:
            # Thử kết nối lại nếu thất bại
            while self.running and self.retry_count < self.max_retry_attempts:
                if not self._handle_connection_failure():
                    return  # Đã thử hết số lần cho phép
                
                cap = self._try_connect_camera()
                if cap is not None:
                    break  # Kết nối thành công
        
        while self.running:
            try:
                ret, frame = cap.read()
                if not ret:
                    # Camera mất tín hiệu - thử kết nối lại
                    cap.release()
                    
                    # Thử kết nối lại
                    cap = self._try_connect_camera()
                    if cap is None:
                        # Nếu không kết nối được, thử retry
                        if not self._handle_connection_failure():
                            return  # Đã thử hết số lần cho phép
                        continue
                    else:
                        continue
                
                # Kiểm tra FPS - chỉ xử lý frame nếu đã đủ thời gian
                if not self.fps_controller.should_process():
                    continue  # Bỏ qua frame này để duy trì FPS mục tiêu
                
                # Resize frame
                frame = resize_frame(frame, camera_config.FRAME_SIZE)
                if frame is None:
                    continue
                
                # Encode JPEG để giảm dung lượng
                jpeg_bytes = encode_frame_to_jpeg(frame)
                if jpeg_bytes is None:
                    continue
                
                # Lưu vào local_dict
                self.local_dict[self.cam_name] = build_camera_status(
                    'ok',
                    frame=jpeg_bytes
                )
                
            except Exception:
                cap.release()
                
                # Thử kết nối lại sau lỗi
                cap = self._try_connect_camera()
                if cap is None:
                    # Nếu không kết nối được, thử retry
                    if not self._handle_connection_failure():
                        return  # Đã thử hết số lần cho phép
                    continue
                else:
                    continue
                
        cap.release()
    
    def stop(self):
        """Dừng thread"""
        self.running = False