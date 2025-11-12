"""
Main với Logic Processor đã tích hợp
Đây là phiên bản main.py có thêm Logic Processor

Cách chạy:
    cd D:\WORK\ROI_LOGIC_version2\detectObject
    python main_with_logic.py [options]
"""

import multiprocessing as mp
from multiprocessing import Manager, Process, Queue
import time
import math
from typing import List, Tuple, Optional
import json
from pathlib import Path
import argparse
import sys
import logging
from datetime import datetime

from camera_process import camera_process_worker
from ai_inference import ai_inference_worker
from roi_checker import roi_checker_worker, roi_result_consumer
from roi_visualizer import roi_visualizer_worker
from config import camera_config, ai_config, system_config, validate_config

# Import Logic Processor
sys.path.insert(0, str(Path(__file__).parent.parent))
from logic import logic_processor_worker


# Setup logging
def setup_logging(log_file: str = None):
    """
    Cấu hình logging cho hệ thống
    
    Args:
        log_file: Đường dẫn file log. Nếu None, sử dụng logs/system_{timestamp}.log
    """
    if log_file is None:
        log_dir = Path(__file__).parent / "logs"
        log_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = log_dir / f"system_{timestamp}.log"
    
    logging.basicConfig(
        level=logging.DEBUG,  # Tăng lên DEBUG để xem chi tiết
        format='%(asctime)s | %(levelname)s | %(processName)s | %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
        ]
    )
    
    return str(log_file)


def output_handler_worker(output_queue: Queue, log_file: Optional[str] = None):
    """
    Worker xử lý output từ Logic Processor (Queue B - logic_output_queue)
    Đây là nơi bạn có thể:
    - Gửi API request
    - Lưu vào database
    - Gửi notifications
    - Trigger actions khác
    """
    # Thiết lập logging trong process nếu có log_file được truyền vào
    if log_file:
        root_logger = logging.getLogger()
        if not root_logger.handlers:
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s | %(levelname)s | %(processName)s | %(message)s',
                handlers=[logging.FileHandler(log_file, encoding='utf-8')]
            )
    logger = logging.getLogger('OutputHandler')
    logger.info("Output Handler Worker started")
    
    trigger_count = 0
    
    try:
        while True:
            try:
                # Get từ Queue B
                output = output_queue.get(timeout=1.0)
                trigger_count += 1
                
                # Log ngắn gọn: Get (QR1, QR2, ...)
                qr_codes = output.get('qr_codes', [])
                qr_codes_str = ", ".join(qr_codes) if qr_codes else "N/A"
                logger.info(f"Get ({qr_codes_str})")
                
                # TODO: Gửi API request, lưu DB, etc.
                # api_response = send_to_external_api(output)
                
            except:
                time.sleep(0.01)
                
    except KeyboardInterrupt:
        logger.info(f"Output Handler stopped. Total: {trigger_count}")


class CameraOrchestrator:
    """Orchestrator chính quản lý toàn bộ hệ thống"""
    
    def __init__(self, 
                 camera_urls: List[Tuple[str, str]], 
                 num_processes: Optional[int] = None, 
                 max_retry_attempts: Optional[int] = None, 
                 use_ai: Optional[bool] = None, 
                 model_path: Optional[str] = None, 
                 target_fps: Optional[float] = None,
                 enable_visualization: Optional[bool] = True,
                 enable_logic_processor: Optional[bool] = True):
        """
        Args:
            camera_urls: List các URL camera [(name, url), ...]
            num_processes: Số process (mặc định từ config)
            max_retry_attempts: Số lần thử kết nối lại tối đa (mặc định từ config)
            use_ai: Có sử dụng AI detection không (mặc định từ config)
            model_path: Đường dẫn model YOLO .pt (mặc định từ config)
            target_fps: FPS mục tiêu cho camera và AI (mặc định từ config)
            enable_visualization: Có hiển thị visualization không (mặc định: True)
            enable_logic_processor: Có chạy Logic Processor không (mặc định: True)
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
        self.enable_logic_processor = enable_logic_processor
        
        self.manager = Manager()
        self.shared_dict = self.manager.dict()
        self.result_dict = self.manager.dict()
        self.detection_queue = Queue(maxsize=1000)  # AI → ROI Checker
        self.roi_result_queue = Queue(maxsize=1000)  # ROI Checker → Logic Processor (Queue 1)
        self.logic_output_queue = Queue(maxsize=1000)  # Logic Processor → Output (Queue 2)
        self.processes = []
        
    def _divide_cameras(self) -> List[List[Tuple[str, str]]]:
        """Chia nhóm camera cho các process"""
        total_cameras = len(self.camera_urls)
        cameras_per_process = math.ceil(total_cameras / self.num_processes)
        
        camera_groups = []
        for i in range(0, total_cameras, cameras_per_process):
            group = self.camera_urls[i:i + cameras_per_process]
            camera_groups.append(group)
        
        return camera_groups
    
    def start(self):
        """Khởi động hệ thống"""
        logger = logging.getLogger('CameraOrchestrator')
        
        # Log cấu hình
        logger.info("=" * 60)
        logger.info("SYSTEM CONFIGURATION")
        logger.info("=" * 60)
        logger.info(f"Camera Frame Size: {camera_config.FRAME_SIZE}")
        logger.info(f"Camera Target FPS: {camera_config.TARGET_FPS}")
        logger.info(f"AI Input Size: {ai_config.INPUT_SIZE}")
        logger.info(f"AI Target FPS: {ai_config.TARGET_FPS}")
        logger.info(f"Model Path: {ai_config.DEFAULT_MODEL_PATH}")
        logger.info(f"Num Camera Processes: {system_config.NUM_CAMERA_PROCESSES}")
        logger.info(f"Use AI: {system_config.USE_AI}")
        logger.info("=" * 60)
        
        # Chia nhóm camera
        camera_groups = self._divide_cameras()
        logger.info(f"Starting {len(camera_groups)} camera process groups")
        
        # Tạo và spawn các process camera
        for i, camera_group in enumerate(camera_groups):
            process = Process(
                target=camera_process_worker,
                args=(i, camera_group, self.shared_dict, self.max_retry_attempts, self.target_fps)
            )
            self.processes.append(process)
            process.start()
            logger.info(f"Camera process {i} started with {len(camera_group)} cameras")
        
        if self.use_ai:
            # AI Inference Worker
            ai_process = Process(
                target=ai_inference_worker,
                args=(self.shared_dict, self.result_dict, self.detection_queue, self.model_path, ai_config.TARGET_FPS)
            )
            self.processes.append(ai_process)
            ai_process.start()
            logger.info("AI Inference Worker started")
            
            # ROI Checker Worker
            # Thông số: iou_threshold=0.5 (tăng từ 0.3), conf_threshold=0.4 (giảm từ 0.6)
            roi_checker_process = Process(
                target=roi_checker_worker,
                args=(self.detection_queue, self.roi_result_queue, "../logic/roi_config.json", 0.5)
            )
            self.processes.append(roi_checker_process)
            roi_checker_process.start()
            logger.info("ROI Checker Worker started (Center-in-ROI, Conf: 0.5)")
            
            # Logic Processor Worker
            if self.enable_logic_processor:
                logic_processor_process = Process(
                    target=logic_processor_worker,
                    args=(self.roi_result_queue, self.logic_output_queue, "../logic/config.json", logging.getLogger().handlers[0].baseFilename if logging.getLogger().handlers else None)
                )
                self.processes.append(logic_processor_process)
                logic_processor_process.start()
                logger.info("Logic Processor Worker started")
                
                # Output Handler Worker
                output_handler_process = Process(
                    target=output_handler_worker,
                    args=(self.logic_output_queue, logging.getLogger().handlers[0].baseFilename if logging.getLogger().handlers else None)
                )
                self.processes.append(output_handler_process)
                output_handler_process.start()
                logger.info("Output Handler Worker started")
            
            # ROI Result Consumer (chỉ khi không dùng visualizer và không dùng logic processor)
            if not self.enable_visualization and not self.enable_logic_processor:
                roi_consumer_process = Process(
                    target=roi_result_consumer,
                    args=(self.roi_result_queue,)
                )
                self.processes.append(roi_consumer_process)
                roi_consumer_process.start()
                logger.info("ROI Result Consumer started")
            
            # ROI Visualizer (nếu được bật)
            if self.enable_visualization:
                visualizer_process = Process(
                    target=roi_visualizer_worker,
                    args=(self.shared_dict, self.roi_result_queue, "../logic/roi_config.json", 1280, 720, 15.0)
                )
                self.processes.append(visualizer_process)
                visualizer_process.start()
                logger.info("ROI Visualizer Worker started")
        
        logger.info("All workers started successfully")
    
    def run_lifecycle(self):
        """Chạy vòng đời hệ thống"""
        logger = logging.getLogger('CameraOrchestrator')
        
        try:
            logger.info("System lifecycle started")
            last_log_time = time.time()
            log_interval = 10.0  # Log status mỗi 10 giây
            
            while True:
                time.sleep(system_config.STATUS_DISPLAY_INTERVAL)
                
                # Log thống kê định kỳ
                current_time = time.time()
                if current_time - last_log_time >= log_interval:
                    active_cameras = len(self.shared_dict)
                    ok_cameras = sum(1 for cam_data in self.shared_dict.values() 
                                   if cam_data.get('status') == 'ok')
                    
                    logger.info(f"Status: {ok_cameras}/{active_cameras} cameras OK | Logic: {'ON' if self.enable_logic_processor else 'OFF'}")
                    last_log_time = current_time
                
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received, stopping system...")
            self._stop()
    
    def _stop(self):
        """Dừng tất cả process"""
        for process in self.processes:
            process.terminate()
        
        timeout = system_config.PROCESS_TERMINATE_TIMEOUT
        
        for process in self.processes:
            process.join(timeout=timeout)


def load_camera_config(config_file: str = "camera_config.json") -> dict:
    """Load cấu hình camera từ file JSON"""
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
    """Main function - khởi động hệ thống camera với Logic Processor"""
    
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description='Hệ thống Camera Detection với AI và Logic Processor',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ sử dụng:
  python main_with_logic.py                    # Chạy đầy đủ với Logic Processor
  python main_with_logic.py --no-video         # Tắt visualization
  python main_with_logic.py --no-logic         # Tắt Logic Processor
  python main_with_logic.py --no-ai            # Tắt AI detection
  python main_with_logic.py --model custom.pt  # Sử dụng model tùy chỉnh
  python main_with_logic.py --fps 3.0          # Đặt FPS cho AI inference
  python main_with_logic.py --log-file logs/custom.log  # Chỉ định file log
        """
    )
    
    parser.add_argument('--no-video', action='store_true',
                       help='Tắt visualization window')
    parser.add_argument('--no-logic', action='store_true',
                       help='Tắt Logic Processor')
    parser.add_argument('--no-ai', action='store_true',
                       help='Tắt AI detection')
    parser.add_argument('--model', type=str, default=None,
                       help='Đường dẫn model YOLO custom')
    parser.add_argument('--fps', type=float, default=None,
                       help='FPS mục tiêu cho AI inference')
    parser.add_argument('--processes', type=int, default=None,
                       help='Số lượng camera process')
    parser.add_argument('--config', type=str, default='camera_config.json',
                       help='Đường dẫn file cấu hình camera')
    parser.add_argument('--log-file', type=str, default=None,
                       help='Đường dẫn file log (mặc định: logs/system_{timestamp}.log)')
    
    args = parser.parse_args()
    
    # Setup logging
    log_file_path = setup_logging(args.log_file)
    logger = logging.getLogger('Main')
    logger.info("="*60)
    logger.info("SYSTEM STARTING")
    logger.info("="*60)
    logger.info(f"Log file: {log_file_path}")

    # Load camera config từ file
    config = load_camera_config(args.config)

    # Lấy danh sách camera từ config
    camera_urls = [
        (cam['name'], cam['url']) 
        for cam in config.get('cameras', [])
        if cam.get('enabled', True)
    ]
    
    if not camera_urls:
        logger.error("No cameras configured")
        return
    
    logger.info(f"Loaded {len(camera_urls)} cameras from config")

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
        enable_visualization=not args.no_video,
        enable_logic_processor=not args.no_logic and use_ai  # Logic cần AI
    )
    
    # Khởi động và chạy
    orchestrator.start()
    orchestrator.run_lifecycle()

if __name__ == "__main__":
    main()

