import time
import signal
import atexit
from typing import List, Tuple, Dict, Any, Optional

from camera_thread import CameraThread
from config import camera_config, system_config


def camera_process_worker(process_id: int, 
                         camera_list: List[Tuple[str, str]], 
                         shared_dict: Dict[str, Any],
                         max_retry_attempts: Optional[int] = None, 
                         target_fps: Optional[float] = None) -> None:
    """
    Worker function cho mỗi process xử lý camera
    
    Args:
        process_id: ID process
        camera_list: Danh sách camera [(name, url), ...]
        shared_dict: Multiprocessing.Manager().dict()
        max_retry_attempts: Số lần thử kết nối lại tối đa (mặc định từ config)
        target_fps: FPS mục tiêu cho camera (mặc định từ config)
    """
    # Sử dụng config nếu không truyền tham số
    max_retry_attempts = max_retry_attempts or camera_config.MAX_RETRY_ATTEMPTS
    target_fps = target_fps or camera_config.TARGET_FPS
    
    # Dict local trong process
    local_dict = {}
    
    # Tạo và khởi động các camera thread
    threads = []
    for cam_name, cam_url in camera_list:
        thread = CameraThread(cam_name, cam_url, local_dict, max_retry_attempts, target_fps)
        threads.append(thread)
        thread.start()
    
    def cleanup_threads():
        """Cleanup function để dừng tất cả threads"""
        for thread in threads:
            thread.stop()
        join_timeout = system_config.THREAD_JOIN_TIMEOUT
        for thread in threads:
            thread.join(timeout=join_timeout)
        local_dict.clear()
    
    # Đăng ký cleanup khi process bị terminate
    atexit.register(cleanup_threads)
    
    # Handler cho SIGTERM (khi bị terminate)
    def sigterm_handler(signum, frame):
        cleanup_threads()
        raise SystemExit(0)
    
    try:
        signal.signal(signal.SIGTERM, sigterm_handler)
    except Exception:
        pass  # Windows có thể không hỗ trợ SIGTERM trong subprocess
    
    # Vòng lặp cập nhật từ local_dict lên shared_dict
    try:
        update_interval = camera_config.DICT_UPDATE_INTERVAL
        
        while True:
            # Copy dữ liệu từ local_dict lên shared_dict
            for cam_name, data in local_dict.items():
                shared_dict[cam_name] = data
            
            time.sleep(update_interval)
            
    except (KeyboardInterrupt, SystemExit):
        pass
    finally:
        # Cleanup threads khi thoát
        cleanup_threads()
        atexit.unregister(cleanup_threads)