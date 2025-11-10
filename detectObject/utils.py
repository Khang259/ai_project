"""
Module tiện ích chứa các hàm tái sử dụng.
Loại bỏ code trùng lặp và tập trung logic chung.
"""
import cv2
import numpy as np
import time
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timezone

from config import camera_config, ai_config





def decode_jpeg_frame(jpeg_bytes: bytes) -> Optional[np.ndarray]:
    """
    Decode JPEG bytes thành OpenCV frame
    
    Args:
        jpeg_bytes: JPEG encoded bytes
        
    Returns:
        np.ndarray hoặc None nếu decode thất bại
    """
    try:
        nparr = np.frombuffer(jpeg_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return frame
    except Exception as e:
        return None


def encode_frame_to_jpeg(frame: np.ndarray, quality: int = None) -> Optional[bytes]:
    """
    Encode OpenCV frame thành JPEG bytes
    
    Args:
        frame: OpenCV frame (np.ndarray)
        quality: JPEG quality (0-100), mặc định từ config
        
    Returns:
        bytes hoặc None nếu encode thất bại
    """
    if quality is None:
        quality = camera_config.JPEG_QUALITY
    
    try:
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
        return buffer.tobytes()
    except Exception as e:
        return None


def resize_frame(frame: np.ndarray, target_size: Tuple[int, int], 
                 interpolation: int = None) -> Optional[np.ndarray]:
    """
    Resize frame với error handling
    
    Args:
        frame: OpenCV frame
        target_size: (width, height)
        interpolation: cv2 interpolation method, mặc định từ config
        
    Returns:
        Resized frame hoặc None nếu thất bại
    """
    if interpolation is None:
        interpolation = ai_config.RESIZE_INTERPOLATION
    
    try:
        resized = cv2.resize(frame, target_size, interpolation=interpolation)
        return resized
    except Exception as e:
        return None


def calculate_exponential_backoff(retry_count: int, max_time: float = None) -> float:
    """
    Tính thời gian chờ theo exponential backoff
    
    Args:
        retry_count: Số lần retry hiện tại
        max_time: Thời gian chờ tối đa (giây)
        
    Returns:
        Thời gian chờ (giây)
    """
    if max_time is None:
        max_time = camera_config.MAX_BACKOFF_TIME
    
    wait_time = min(2 ** retry_count, max_time)
    return wait_time


def is_frame_valid(frame_data: Dict[str, Any], max_age: float = None) -> bool:
    """
    Kiểm tra frame có hợp lệ không
    
    Args:
        frame_data: Dict chứa thông tin frame {'frame': bytes, 'ts': float, 'status': str}
        max_age: Tuổi tối đa của frame (giây)
        
    Returns:
        bool: True nếu frame hợp lệ
    """
    if max_age is None:
        max_age = camera_config.MAX_FRAME_AGE
    
    current_time = time.time()
    
    # Kiểm tra status
    if frame_data.get('status') != 'ok':
        return False
    
    # Kiểm tra frame có tồn tại
    if frame_data.get('frame') is None:
        return False
    
    # Kiểm tra tuổi của frame
    frame_age = current_time - frame_data.get('ts', 0)
    if frame_age >= max_age:
        return False
    
    return True


def build_camera_status(status: str, **kwargs) -> Dict[str, Any]:
    """
    Tạo dict status cho camera
    
    Args:
        status: Trạng thái ('ok', 'retrying', 'connection_failed')
        **kwargs: Các field bổ sung
        
    Returns:
        Dict chứa status info
    """
    result = {
        'ts': time.time(),
        'status': status
    }
    result.update(kwargs)
    return result


def get_current_timestamp_iso() -> str:
    """
    Lấy timestamp hiện tại theo format ISO 8601 UTC
    
    Returns:
        str: Timestamp ISO format
    """
    return datetime.now(timezone.utc).isoformat()


def get_frame_shape_info(frame: Optional[np.ndarray]) -> Dict[str, int]:
    """
    Lấy thông tin shape của frame
    
    Args:
        frame: OpenCV frame hoặc None
        
    Returns:
        Dict chứa height, width, channels
    """
    if frame is None:
        return {"height": 0, "width": 0, "channels": 0}
    
    h, w = frame.shape[0], frame.shape[1]
    c = frame.shape[2] if len(frame.shape) == 3 else 0
    
    return {
        "height": int(h),
        "width": int(w),
        "channels": int(c)
    }


class FPSController:
    """
    Class điều khiển FPS (Frame Per Second)
    Giúp duy trì target FPS bằng cách kiểm soát interval giữa các frame
    """
    
    def __init__(self, target_fps: float):
        """
        Args:
            target_fps: FPS mục tiêu
        """
        self.target_fps = target_fps
        self.frame_interval = 1.0 / target_fps if target_fps > 0 else 0
        self.last_time = 0
    
    def should_process(self) -> bool:
        """
        Kiểm tra có nên xử lý frame tiếp theo không
        
        Returns:
            bool: True nếu đã đủ thời gian theo target FPS
        """
        current_time = time.time()
        if current_time - self.last_time >= self.frame_interval:
            self.last_time = current_time
            return True
        return False
    
    def get_actual_fps(self) -> float:
        """
        Tính FPS thực tế dựa trên thời gian giữa các lần xử lý
        
        Returns:
            float: FPS thực tế
        """
        current_time = time.time()
        elapsed = current_time - self.last_time
        if elapsed > 0:
            return 1.0 / elapsed
        return 0.0
    
    def reset(self):
        """Reset timer"""
        self.last_time = 0


class PerformanceMonitor:
    """
    Class theo dõi performance (latency, FPS, processing time)
    """
    
    def __init__(self, window_size: int = 100):
        """
        Args:
            window_size: Số lượng samples để tính trung bình
        """
        self.window_size = window_size
        self.times = []
        self.start_time = None
    
    def start(self):
        """Bắt đầu đo thời gian"""
        self.start_time = time.time()
    
    def stop(self) -> float:
        """
        Kết thúc đo và lưu thời gian
        
        Returns:
            float: Thời gian elapsed (giây)
        """
        if self.start_time is None:
            return 0.0
        
        elapsed = time.time() - self.start_time
        self.times.append(elapsed)
        
        # Giữ window size
        if len(self.times) > self.window_size:
            self.times.pop(0)
        
        self.start_time = None
        return elapsed
    
    def get_average_time(self) -> float:
        """Lấy thời gian trung bình"""
        if not self.times:
            return 0.0
        return sum(self.times) / len(self.times)
    
    def get_average_fps(self) -> float:
        """Lấy FPS trung bình"""
        avg_time = self.get_average_time()
        if avg_time > 0:
            return 1.0 / avg_time
        return 0.0
    
    def reset(self):
        """Reset tất cả measurements"""
        self.times.clear()
        self.start_time = None


def format_time(seconds: float) -> str:
    """
    Format thời gian thành string dễ đọc
    
    Args:
        seconds: Số giây
        
    Returns:
        str: Thời gian đã format (vd: "1.234s", "123ms")
    """
    if seconds >= 1.0:
        return f"{seconds:.3f}s"
    else:
        return f"{seconds * 1000:.1f}ms"


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Chia an toàn, tránh divide by zero
    
    Args:
        numerator: Tử số
        denominator: Mẫu số
        default: Giá trị mặc định nếu mẫu = 0
        
    Returns:
        float: Kết quả chia hoặc default
    """
    if denominator == 0:
        return default
    return numerator / denominator

