import cv2
import time
import threading
import numpy as np

class CameraThread(threading.Thread):
    """Thread xử lý một camera"""
    
    def __init__(self, cam_name, cam_url, local_dict, max_retry_attempts=5, target_fps=1.0):
        """
        Args:
            cam_name: Tên camera
            cam_url: URL/ID camera
            local_dict: Dict local trong process
            max_retry_attempts: Số lần thử kết nối lại tối đa (mặc định: 5)
            target_fps: FPS mục tiêu cho camera (mặc định: 2.0 FPS)
        """
        super().__init__(daemon=True)
        self.cam_name = cam_name
        self.cam_url = cam_url
        self.local_dict = local_dict
        self.running = False
        self.max_retry_attempts = max_retry_attempts
        self.retry_count = 0
        self.last_successful_connection = None
        self.target_fps = target_fps
        self.frame_interval = 1.0 / target_fps  # Khoảng thời gian giữa các frame
        self.last_frame_time = 0
    
    def _try_connect_camera(self, timeout=5.0):
        """
        Thử kết nối camera với timeout
        
        Returns:
            cv2.VideoCapture: Đối tượng camera nếu kết nối thành công, None nếu thất bại
        """
        print(f"Đang kết nối camera {self.cam_name}... (lần thử {self.retry_count + 1}/{self.max_retry_attempts})")
        
        cap = cv2.VideoCapture(self.cam_url)
        start_time = time.time()
        
        while not cap.isOpened() and (time.time() - start_time) < timeout:
            time.sleep(0.1)
            cap = cv2.VideoCapture(self.cam_url)
        
        if cap.isOpened():
            print(f"Camera {self.cam_name} đã kết nối thành công")
            self.retry_count = 0  # Reset retry count khi kết nối thành công
            self.last_successful_connection = time.time()
            return cap
        else:
            print(f"Không thể kết nối camera {self.cam_name} (timeout {timeout}s)")
            return None
    
    def _handle_connection_failure(self):
        """Xử lý khi kết nối camera thất bại"""
        self.retry_count += 1
        
        if self.retry_count >= self.max_retry_attempts:
            print(f"Camera {self.cam_name} đã thử kết nối {self.max_retry_attempts} lần nhưng thất bại. Dừng thử lại.")
            self.local_dict[self.cam_name] = {
                'frame': None,
                'ts': time.time(),
                'status': 'connection_failed',
                'retry_count': self.retry_count,
                'last_attempt': time.time()
            }
            return False
        else:
            # Tính thời gian chờ tăng dần (exponential backoff)
            wait_time = min(2 ** self.retry_count, 30)  # Tối đa 30 giây
            print(f"Camera {self.cam_name} sẽ thử kết nối lại sau {wait_time} giây...")
            
            self.local_dict[self.cam_name] = {
                'frame': None,
                'ts': time.time(),
                'status': 'retrying',
                'retry_count': self.retry_count,
                'next_retry_in': wait_time
            }
            
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
                    print(f"Camera {self.cam_name} mất tín hiệu, thử kết nối lại...")
                    cap.release()
                    
                    # Thử kết nối lại
                    cap = self._try_connect_camera()
                    if cap is None:
                        # Nếu không kết nối được, thử retry
                        if not self._handle_connection_failure():
                            return  # Đã thử hết số lần cho phép
                        continue
                    else:
                        print(f"Camera {self.cam_name} đã kết nối lại thành công")
                        continue
                
                # Kiểm tra FPS - chỉ xử lý frame nếu đã đủ thời gian
                current_time = time.time()
                if current_time - self.last_frame_time < self.frame_interval:
                    continue  # Bỏ qua frame này để duy trì FPS mục tiêu
                
                self.last_frame_time = current_time
                
                # Resize frame
                frame = cv2.resize(frame, (640, 360))
                
                # Encode JPEG để giảm dung lượng
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                jpeg_bytes = buffer.tobytes()
                
                # Lưu vào local_dict
                self.local_dict[self.cam_name] = {
                    'frame': jpeg_bytes,
                    'ts': current_time,
                    'status': 'ok'
                }
                
            except Exception as e:
                print(f"Lỗi camera {self.cam_name}: {e}")
                cap.release()
                
                # Thử kết nối lại sau lỗi
                cap = self._try_connect_camera()
                if cap is None:
                    # Nếu không kết nối được, thử retry
                    if not self._handle_connection_failure():
                        return  # Đã thử hết số lần cho phép
                    continue
                else:
                    print(f"Camera {self.cam_name} đã kết nối lại sau lỗi")
                    continue
                
        cap.release()
    
    def stop(self):
        """Dừng thread"""
        self.running = False