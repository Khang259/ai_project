import multiprocessing as mp
from multiprocessing import Manager, Process, Queue
import time
import math
from typing import List, Tuple, Optional
import json
from pathlib import Path
import argparse

from camera_process import camera_process_worker
from ai_inference import ai_inference_worker
from roi_checker import roi_checker_worker, roi_result_consumer
from roi_visualizer import roi_visualizer_worker
from config import camera_config, ai_config, system_config, validate_config, print_config


# detection_result_consumer đã bị thay thế bởi roi_checker_worker
# ROI Checker sẽ xử lý detection queue và gửi kết quả match vào roi_result_queue


class CameraOrchestrator:
    """Orchestrator chính quản lý toàn bộ hệ thống"""
    
    def __init__(self, 
                 camera_urls: List[Tuple[str, str]], 
                 num_processes: Optional[int] = None, 
                 max_retry_attempts: Optional[int] = None, 
                 use_ai: Optional[bool] = None, 
                 model_path: Optional[str] = None, 
                 target_fps: Optional[float] = None,
                 enable_visualization: Optional[bool] = True):
        """
        Args:
            camera_urls: List các URL camera [(name, url), ...]
            num_processes: Số process (mặc định từ config)
            max_retry_attempts: Số lần thử kết nối lại tối đa (mặc định từ config)
            use_ai: Có sử dụng AI detection không (mặc định từ config)
            model_path: Đường dẫn model YOLO .pt (mặc định từ config)
            target_fps: FPS mục tiêu cho camera và AI (mặc định từ config)
            enable_visualization: Có hiển thị visualization không (mặc định: True)
        """
        # Validate config trước khi khởi động
        if not validate_config():
            raise ValueError("Config không hợp lệ. Vui lòng kiểm tra lại.")
        
        self.camera_urls = camera_urls
        self.num_processes = num_processes or system_config.NUM_CAMERA_PROCESSES
        self.max_retry_attempts = max_retry_attempts or camera_config.MAX_RETRY_ATTEMPTS
        self.use_ai = use_ai if use_ai is not None else system_config.USE_AI
        self.model_path = model_path or ai_config.DEFAULT_MODEL_PATH
        self.target_fps = target_fps or camera_config.TARGET_FPS
        self.enable_visualization = enable_visualization
        
        self.manager = Manager()
        self.shared_dict = self.manager.dict()
        self.result_dict = self.manager.dict()  # Dict cho kết quả AI (legacy, không dùng nữa)
        self.detection_queue = Queue(maxsize=1000)  # Queue cho detection results
        self.roi_result_queue = Queue(maxsize=1000)  # Queue cho ROI matching results
        self.processes = []
        
    def _divide_cameras(self) -> List[List[Tuple[str, str]]]:
        """
        Chia nhóm camera cho các process
        
        Returns:
            List các nhóm camera
        """
        total_cameras = len(self.camera_urls)
        cameras_per_process = math.ceil(total_cameras / self.num_processes)
        
        camera_groups = []
        for i in range(0, total_cameras, cameras_per_process):
            group = self.camera_urls[i:i + cameras_per_process]
            camera_groups.append(group)
        
        return camera_groups
    
    def start(self):
        """Khởi động hệ thống"""
        # In cấu hình
        print_config()
        
        # Chia nhóm camera
        camera_groups = self._divide_cameras()
        
        # Tạo và spawn các process camera
        for i, camera_group in enumerate(camera_groups):
            process = Process(
                target=camera_process_worker,
                args=(i, camera_group, self.shared_dict, self.max_retry_attempts, self.target_fps)
            )
            self.processes.append(process)
            process.start()
        
        if self.use_ai:
            # Một tiến trình AI duy nhất xử lý batch tất cả camera để tận dụng GPU tốt hơn
            ai_process = Process(
                target=ai_inference_worker,
                args=(self.shared_dict, self.result_dict, self.detection_queue, self.model_path, ai_config.TARGET_FPS)
            )
            self.processes.append(ai_process)
            ai_process.start()
            
            # Khởi động ROI Checker worker
            # Thông số: iou_threshold=0.5 (tăng từ 0.3), conf_threshold=0.4 (giảm từ 0.6)
            roi_checker_process = Process(
                target=roi_checker_worker,
                args=(self.detection_queue, self.roi_result_queue, "../logic/roi_config.json", 0.5, 0.4)
            )
            self.processes.append(roi_checker_process)
            roi_checker_process.start()
            
            # Khởi động ROI Result Consumer để hiển thị kết quả (chỉ khi không dùng visualizer)
            if not self.enable_visualization:
                roi_consumer_process = Process(
                    target=roi_result_consumer,
                    args=(self.roi_result_queue,)
                )
                self.processes.append(roi_consumer_process)
                roi_consumer_process.start()
            
            # Khởi động ROI Visualizer nếu được bật
            if self.enable_visualization:
                visualizer_process = Process(
                    target=roi_visualizer_worker,
                    args=(self.shared_dict, self.roi_result_queue, "../logic/roi_config.json", 1280, 720, 15.0)
                )
                self.processes.append(visualizer_process)
                visualizer_process.start()
    
    def run_lifecycle(self):
        """Chạy vòng đời hệ thống"""
        try:
            while True:
                time.sleep(system_config.STATUS_DISPLAY_INTERVAL)
                
                # Hiển thị thống kê
                active_cameras = len(self.shared_dict)
                ok_cameras = sum(1 for cam_data in self.shared_dict.values() 
                               if cam_data.get('status') == 'ok')
                
                print(f"Camera: {ok_cameras}/{active_cameras} OK", end='\r')
                
        except KeyboardInterrupt:
            self._stop()
    
    def _stop(self):
        """Dừng tất cả process"""
        for process in self.processes:
            process.terminate()
        
        timeout = system_config.PROCESS_TERMINATE_TIMEOUT
        
        for process in self.processes:
            process.join(timeout=timeout)


def load_camera_config(config_file: str = "camera_config.json") -> dict:
    """
    Load cấu hình camera từ file JSON
    
    Args:
        config_file: Đường dẫn file config
        
    Returns:
        dict: Config đã load
    """
    config_path = Path(__file__).parent / config_file
    
    if not config_path.exists():
        return {}
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        return config
    except Exception:
        return {}


def main():
    """Main function - khởi động hệ thống camera"""
    
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description='Hệ thống Camera Detection với AI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ sử dụng:
  python main.py                    # Chạy đầy đủ với visualization
  python main.py --no-video         # Tắt visualization (chỉ log kết quả)
  python main.py --no-ai            # Tắt AI detection (chỉ hiển thị camera)
  python main.py --model custom.pt  # Sử dụng model tùy chỉnh
  python main.py --fps 3.0          # Đặt FPS cho AI inference
        """
    )
    
    parser.add_argument('--no-video', action='store_true',
                       help='Tắt visualization window (chỉ chạy detection và log kết quả)')
    parser.add_argument('--no-ai', action='store_true',
                       help='Tắt AI detection (chỉ hiển thị camera feed)')
    parser.add_argument('--model', type=str, default=None,
                       help='Đường dẫn model YOLO custom (mặc định: từ config)')
    parser.add_argument('--fps', type=float, default=None,
                       help='FPS mục tiêu cho AI inference (mặc định: từ config)')
    parser.add_argument('--processes', type=int, default=None,
                       help='Số lượng camera process (mặc định: từ config)')
    parser.add_argument('--config', type=str, default='camera_config.json',
                       help='Đường dẫn file cấu hình camera (mặc định: camera_config.json)')
    
    args = parser.parse_args()

    # Load camera config từ file
    config = load_camera_config(args.config)

    # Lấy danh sách camera từ config
    camera_urls = [
        (cam['name'], cam['url']) 
        for cam in config.get('cameras', [])
        if cam.get('enabled', True)
    ]
    
    if not camera_urls:
        return

    # Lấy system settings
    system_settings = config.get('system', {})
    num_processes = args.processes or system_settings.get('num_processes', system_config.NUM_CAMERA_PROCESSES)
    use_ai = system_settings.get('use_ai', system_config.USE_AI) and not args.no_ai
    model_path = args.model or system_settings.get('model_path', ai_config.DEFAULT_MODEL_PATH)

    # Lấy camera settings
    camera_settings = config.get('camera_settings', {})
    max_retry = camera_settings.get('max_retry_attempts', camera_config.MAX_RETRY_ATTEMPTS)
    camera_fps = args.fps or camera_settings.get('target_fps', camera_config.TARGET_FPS)
    
    # Tạo orchestrator
    orchestrator = CameraOrchestrator(
        camera_urls=camera_urls,
        num_processes=num_processes,
        max_retry_attempts=max_retry,
        use_ai=use_ai,
        model_path=model_path,
        target_fps=camera_fps,
        enable_visualization=not args.no_video  # Tắt visualization nếu có --no-video
    )
    
    # Khởi động và chạy
    orchestrator.start()
    orchestrator.run_lifecycle()

if __name__ == "__main__":
    main()