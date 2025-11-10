"""
Module cấu hình tập trung cho hệ thống camera và AI inference.
Chứa tất cả các hằng số, tham số cấu hình để dễ quản lý và điều chỉnh.
"""
from dataclasses import dataclass
from typing import Tuple


@dataclass
class CameraConfig:
    """Cấu hình cho camera processing"""
    # Kích thước frame sau khi resize (width, height)
    FRAME_SIZE: Tuple[int, int] = (640, 360)
    
    # Chất lượng JPEG compression (0-100)
    JPEG_QUALITY: int = 85
    
    # Target FPS cho camera capture (frames per second)
    TARGET_FPS: float = 1.0
    
    # Thời gian timeout khi kết nối camera (giây)
    CONNECTION_TIMEOUT: float = 5.0
    
    # Số lần thử kết nối lại tối đa
    MAX_RETRY_ATTEMPTS: int = 3
    
    # Thời gian chờ tối đa cho exponential backoff (giây)
    MAX_BACKOFF_TIME: float = 30.0
    
    # Khoảng thời gian update từ local_dict lên shared_dict (giây)
    DICT_UPDATE_INTERVAL: float = 0.7
    
    # Thời gian tối đa để frame được coi là "cũ" (giây)
    MAX_FRAME_AGE: float = 5.0


@dataclass
class AIConfig:
    """Cấu hình cho AI inference"""
    # Kích thước frame input cho model YOLO (width, height)
    INPUT_SIZE: Tuple[int, int] = (640, 360)
    
    # Target FPS cho AI inference (frames per second)
    TARGET_FPS: float = 2.0
    
    # Đường dẫn model YOLO mặc định
    DEFAULT_MODEL_PATH: str = "weights/model-hanam_0506.pt"
    
    # Interpolation method cho resize
    RESIZE_INTERPOLATION: int = 1  # cv2.INTER_LINEAR
    
    # Sleep time khi chờ inference interval (giây)
    SLEEP_TIME: float = 0.01
    
    # Tên topic lưu raw detection vào queue
    RAW_DETECTION_TOPIC: str = "raw_detection"
    


@dataclass
class SystemConfig:
    """Cấu hình cho hệ thống tổng thể"""
    # Số lượng process xử lý camera
    NUM_CAMERA_PROCESSES: int = 5
    
    # Có sử dụng AI detection không
    USE_AI: bool = True
    
    # Khoảng thời gian hiển thị status (giây)
    STATUS_DISPLAY_INTERVAL: float = 1.0
    
    # Timeout khi terminate process (giây)
    PROCESS_TERMINATE_TIMEOUT: float = 5.0
    
    # Timeout khi join thread (giây)
    THREAD_JOIN_TIMEOUT: float = 1.0


# Singleton instances
camera_config = CameraConfig()
ai_config = AIConfig()
system_config = SystemConfig()


def validate_config() -> bool:
    """
    Validate các giá trị cấu hình
    
    Returns:
        bool: True nếu config hợp lệ
    """
    errors = []
    
    # Validate camera config
    if camera_config.TARGET_FPS <= 0:
        errors.append("Camera TARGET_FPS phải > 0")
    
    if camera_config.JPEG_QUALITY < 0 or camera_config.JPEG_QUALITY > 100:
        errors.append("JPEG_QUALITY phải trong khoảng 0-100")
    
    if camera_config.MAX_RETRY_ATTEMPTS < 0:
        errors.append("MAX_RETRY_ATTEMPTS phải >= 0")
    
    # Validate AI config
    if ai_config.TARGET_FPS <= 0:
        errors.append("AI TARGET_FPS phải > 0")
    
    # Validate system config
    if system_config.NUM_CAMERA_PROCESSES <= 0:
        errors.append("NUM_CAMERA_PROCESSES phải > 0")
    
    if errors:
        for error in errors:
            print(f"[CONFIG ERROR] {error}")
        return False
    
    return True


def print_config():
    """In ra cấu hình hiện tại"""
    print("\n" + "="*60)
    print("CAMERA CONFIG:")
    print("="*60)
    print(f"  Frame Size: {camera_config.FRAME_SIZE}")
    print(f"  JPEG Quality: {camera_config.JPEG_QUALITY}")
    print(f"  Target FPS: {camera_config.TARGET_FPS}")
    print(f"  Connection Timeout: {camera_config.CONNECTION_TIMEOUT}s")
    print(f"  Max Retry Attempts: {camera_config.MAX_RETRY_ATTEMPTS}")
    print(f"  Max Backoff Time: {camera_config.MAX_BACKOFF_TIME}s")
    
    print("\n" + "="*60)
    print("AI CONFIG:")
    print("="*60)
    print(f"  Input Size: {ai_config.INPUT_SIZE}")
    print(f"  Target FPS: {ai_config.TARGET_FPS}")
    print(f"  Model Path: {ai_config.DEFAULT_MODEL_PATH}")
    print(f"  Raw Detection Topic: {ai_config.RAW_DETECTION_TOPIC}")
    
    print("\n" + "="*60)
    print("SYSTEM CONFIG:")
    print("="*60)
    print(f"  Num Camera Processes: {system_config.NUM_CAMERA_PROCESSES}")
    print(f"  Use AI: {system_config.USE_AI}")
    print("="*60 + "\n")

