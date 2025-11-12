import multiprocessing as mp
from multiprocessing import Manager, Process
import time
import math
from camera_process import camera_process_worker
from display_worker import display_worker
from ai_inference import ai_inference_worker
from ai_display_worker import ai_display_worker
from fps_config import get_fps_config, print_fps_presets

class CameraOrchestrator:
    """Orchestrator chính quản lý toàn bộ hệ thống"""
    
    def __init__(self, camera_urls, num_processes=4, max_retry_attempts=5, use_ai=True, model_path="yolov8n.pt", target_fps=1.0):
        """
        Args:
            camera_urls: List các URL camera
            num_processes: Số process (có thể tùy chỉnh)
            max_retry_attempts: Số lần thử kết nối lại tối đa cho mỗi camera
            use_ai: Có sử dụng AI detection không
            model_path: Đường dẫn model YOLO .pt
            target_fps: FPS mục tiêu cho camera và AI inference (mặc định: 2.0 FPS)
        """
        self.camera_urls = camera_urls
        self.num_processes = num_processes
        self.max_retry_attempts = max_retry_attempts
        self.use_ai = use_ai
        self.model_path = model_path
        self.target_fps = target_fps
        self.manager = Manager()
        self.shared_dict = self.manager.dict()
        self.result_dict = self.manager.dict()  # Dict cho kết quả AI
        self.processes = []
        
    def _divide_cameras(self):
        """Chia nhóm camera cho các process"""
        total_cameras = len(self.camera_urls)
        cameras_per_process = math.ceil(total_cameras / self.num_processes)
        
        camera_groups = []
        for i in range(0, total_cameras, cameras_per_process):
            group = self.camera_urls[i:i + cameras_per_process]
            camera_groups.append(group)
        
        # print(f"Chia {total_cameras} camera thành {len(camera_groups)} process:")
        # for i, group in enumerate(camera_groups):
        #     print(f"  Process {i}: {len(group)} camera")
        
        return camera_groups
    
    def start(self):
        """Khởi động hệ thống"""
        print("Bắt đầu khởi động hệ thống camera...")
        print(f"AI Detection: {'BẬT' if self.use_ai else 'TẮT'}")
        print(f"Target FPS: {self.target_fps}")
        if self.use_ai:
            print(f"Model YOLO: {self.model_path}")
        
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
            print("Khởi động AI inference process (GPU, batch tất cả camera)...")
            # Một tiến trình AI duy nhất xử lý batch tất cả camera để tận dụng GPU tốt hơn
            ai_process = Process(
                target=ai_inference_worker,
                args=(self.shared_dict, self.result_dict, self.model_path, self.target_fps)
            )
            self.processes.append(ai_process)
            ai_process.start()
            
            # # AI display worker (hiển thị kết quả có AI)
            # ai_display_process = Process(
            #     target=ai_display_worker,
            #     args=(self.result_dict,)
            # )
            # self.processes.append(ai_display_process)
            # ai_display_process.start()
            
        else:
            # Display worker thường (hiển thị frame gốc)
            display_process = Process(
                target=display_worker,
                args=(self.shared_dict,)
            )
            self.processes.append(display_process)
            display_process.start()
        
        print(f"Đã khởi động {len(self.processes)} process")
    
    def run_lifecycle(self):
        """Chạy vòng đời hệ thống"""
        try:
            print("Hệ thống đang chạy. Nhấn Ctrl+C để dừng...")
            while True:
                time.sleep(1)
                
                # Hiển thị thống kê (optional)
                active_cameras = len(self.shared_dict)
                print(f"Camera hoạt động: {active_cameras}", end='\r')
                
        except KeyboardInterrupt:
            print("\nĐang dừng hệ thống...")
            self._stop()
    
    def _stop(self):
        """Dừng tất cả process"""
        for process in self.processes:
            process.terminate()
        
        for process in self.processes:
            process.join(timeout=5.0)
        
        print("Đã dừng hệ thống")

def main():

    camera_urls = [
        ("cam-1","rtsp://localhost:8554/cam33"),
        ("cam-2","rtsp://localhost:8554/cam34"),
        ("cam-3","rtsp://localhost:8554/cam1")
        #   ("cam-1","rtsp://192.168.1.202:8554/live/cam1"),
        #   ("cam-2","rtsp://192.168.1.202:8554/live/cam2"),
        #   ("cam-3","rtsp://192.168.1.202:8554/live/cam3"),
        #   ("cam-4","rtsp://192.168.1.202:8554/live/cam4"),
        #   ("cam-5","rtsp://192.168.1.202:8554/live/cam5"),
        #   ("cam-6","rtsp://192.168.1.202:8554/live/cam6"),
        #   ("cam-7","rtsp://192.168.1.202:8554/live/cam7"),
        #   ("cam-8","rtsp://192.202.1.202:8554/live/cam8"),
        #   ("cam-9","rtsp://192.168.1.202:8554/live/cam9"),
        #   ("cam_10","rtsp://192.168.1.202:8554/live/cam10"),
        #   ("cam_11","rtsp://192.168.1.202:8554/live/cam11"),
        #   ("cam_12","rtsp://192.168.1.202:8554/live/cam12"),
        #   ("cam-13","rtsp://192.168.1.202:8554/live/cam13"),
        #   ("cam-14","rtsp://192.202.1.202:8554/live/cam14"),
        #   ("cam-15","rtsp://192.168.1.202:8554/live/cam15"),
        #   ("cam-16","rtsp://192.202.1.202:8554/live/cam16"),
        #   ("cam-17","rtsp://192.168.1.202:8554/live/cam17"),
        #   ("cam-18","rtsp://192.168.1.202:8554/live/cam18"),
        #   ("cam-19","rtsp://192.168.1.202:8554/live/cam19"),
        #   ("cam-20","rtsp://192.202.1.202:8554/live/cam20"),
        #   ("cam-21","rtsp://192.168.1.202:8554/live/cam21"),
        #   ("cam-22","rtsp://192.168.1.202:8554/live/cam22"),
        #   ("cam-23","rtsp://192.168.1.202:8554/live/cam23"),
        #   ("cam-24","rtsp://192.168.1.202:8554/live/cam24"),
        #   ("cam-25","rtsp://192.202.1.202:8554/live/cam25"),
        #   ("cam-26","rtsp://192.168.1.202:8554/live/cam26"),
        #   ("cam-27","rtsp://192.202.1.202:8554/live/cam27"),
        #   ("cam-28","rtsp://192.168.1.202:8554/live/cam28"),
        #   ("cam-29","rtsp://192.168.1.202:8554/live/cam29"),
        #   ("cam-30","rtsp://192.168.1.202:8554/live/cam30"),
        #   ("cam-31","rtsp://192.168.1.202:8554/live/cam31"),
        #   ("cam-32","rtsp://192.168.1.202:8554/live/cam32"),
        #   ("cam-33","rtsp://192.168.1.202:8554/live/cam33"),
        #   ("cam-34","rtsp://192.168.1.202:8554/live/cam34"),
        #   ("cam-35","rtsp://192.168.1.202:8554/live/cam35")
     ]
    

# def main():

#     camera_urls = [
        # ("cam-1", "rtsp://admin:SPtech2024@192.168.50.15:554/Streaming/Channels/101"),  # Cam1 (192.168.50.15)
        # ("cam-2", "rtsp://admin:SPtech2024@192.168.50.26:554/Streaming/Channels/101"),  # Cam2 (192.168.50.26)
        # ("cam-3", "rtsp://admin:SPtech2024@192.168.50.5:554/Streaming/Channels/101"),   # Cam3 (192.168.50.5)
        # ("cam-4", "rtsp://admin:SPtech2024@192.168.50.28:554/Streaming/Channels/101"),  # Cam4 (192.168.50.28)
        # ("cam-5", "rtsp://admin:SPtech2024@192.168.50.13:554/Streaming/Channels/101"),  # Cam5 (192.168.50.13)
        # ("cam-6", "rtsp://admin:SPtech2024@192.168.50.4:554/Streaming/Channels/101"),   # Cam6 (192.168.50.4)
        # ("cam-7", "rtsp://admin:SPtech2024@192.168.50.14:554/Streaming/Channels/101"),  # Cam7 (192.168.50.14)
        # ("cam-8", "rtsp://admin:SPtech2024@192.168.50.27:554/Streaming/Channels/101"),  # Cam8 (192.168.50.27)
        # ("cam-9", "rtsp://admin:SPtech2024@192.168.50.12:554/Streaming/Channels/101"),  # Cam9 (192.168.50.12)
        # ("cam-10", "rtsp://admin:SPtech2024@192.168.50.7:554/Streaming/Channels/101"),  # Cam10 (192.168.50.7)
        # ("cam-11", "rtsp://admin:SPtech2024@192.168.50.3:554/Streaming/Channels/101"),  # Cam11 (192.168.50.3)
        # ("cam-12", "rtsp://admin:SPtech2024@192.168.50.17:554/Streaming/Channels/101"), # Cam12 (192.168.50.17)
        # ("cam-13", "rtsp://admin:SPtech2024@192.168.50.24:554/Streaming/Channels/101"), # Cam13 (192.168.50.24)
        # ("cam-14", "rtsp://admin:SPtech2024@192.168.50.2:554/Streaming/Channels/101"),  # Cam14 (192.168.50.2)
        # ("cam-17", "rtsp://admin:SPtech2024@192.168.50.16:554/Streaming/Channels/101"), # Cam17 (192.168.50.16)
        # ("cam-18", "rtsp://admin:SPtech2024@192.168.50.32:554/Streaming/Channels/101"), # Cam18 (192.168.50.32)
        # ("cam-19", "rtsp://admin:SPtech2024@192.168.50.29:554/Streaming/Channels/101"), # Cam19 (192.168.50.29)
        # ("cam-20", "rtsp://admin:SPtech2024@192.168.50.20:554/Streaming/Channels/101"), # Cam20 (192.168.50.20)
        # ("cam-21", "rtsp://admin:SPtech2024@192.168.50.34:554/Streaming/Channels/101"), # Cam21 (192.168.50.34)
        # ("cam-22", "rtsp://admin:SPtech2024@192.168.50.22:554/Streaming/Channels/101"), # Cam22 (192.168.50.22)
        # ("cam-23", "rtsp://admin:SPtech2024@192.168.50.8:554/Streaming/Channels/101"),  # Cam23 (192.168.50.8)
        # ("cam-24", "rtsp://admin:SPtech2024@192.168.50.33:554/Streaming/Channels/101"), # Cam24 (192.168.50.33)
        # ("cam-25", "rtsp://admin:SPtech2024@192.168.50.10:554/Streaming/Channels/101"), # Cam25 (192.168.50.10)
        # ("cam-26", "rtsp://admin:SPtech2024@192.168.50.25:554/Streaming/Channels/101"), # Cam26 (192.168.50.25)
        # ("cam-27", "rtsp://admin:SPtech2024@192.168.50.6:554/Streaming/Channels/101"),  # Cam27 (192.168.50.6)
        # ("cam-28", "rtsp://admin:SPtech2024@192.168.50.36:554/Streaming/Channels/101"), # Cam28 (192.168.50.36)
        # ("cam-29", "rtsp://admin:SPtech2024@192.168.50.35:554/Streaming/Channels/101"), # Cam29 (192.168.50.35)
        # ("cam-30", "rtsp://admin:SPtech2024@192.168.50.31:554/Streaming/Channels/101"), # Cam30 (192.168.50.31)
        # ("cam-31", "rtsp://admin:SPtech2024@192.168.50.19:554/Streaming/Channels/101"), # Cam31 (192.168.50.19)
        # ("cam-32", "rtsp://admin:SPtech2024@192.168.50.9:554/Streaming/Channels/101"),  # Cam32 (192.168.50.9)
        # ("cam-33", "rtsp://admin:SPtech2024@192.168.50.18:554/Streaming/Channels/101"), # Cam33 (192.168.50.18)
        # ("cam-34", "rtsp://admin:SPtech2024@192.168.50.21:554/Streaming/Channels/101"), # Cam34 (192.168.50.21)
        # ("cam-1", "rtsp://192.168.1.77:8080/h264_ulaw.sdp")
    # ]


    # Tạo orchestrator với số process tùy chỉnh
    NUM_PROCESSES = 5  # Có thể thay đổi số này
    MAX_RETRY_ATTEMPTS = 5  # Số lần thử kết nối lại tối đa
    USE_AI = True  # Bật/tắt AI detection
    MODEL_PATH = "weights/yolov8boxdetectV2run2.pt"  # Đường dẫn model YOLO
    
    # Cấu hình FPS - có thể thay đổi ở đây
    FPS_PRESET = "low"  # Chọn preset: "very_low", "low", "normal", "high", "very_high"
    # HOẶC sử dụng FPS tùy chỉnh:
    # CUSTOM_FPS = 1.5  # FPS tùy chỉnh
    # TARGET_FPS = get_fps_config(custom_fps=CUSTOM_FPS)
    TARGET_FPS = get_fps_config(preset_name=FPS_PRESET)
    
    print(f"Sử dụng FPS preset: {FPS_PRESET} ({TARGET_FPS} FPS)")
    
    orchestrator = CameraOrchestrator(camera_urls, NUM_PROCESSES, MAX_RETRY_ATTEMPTS, USE_AI, MODEL_PATH, TARGET_FPS)
    
    # Khởi động và chạy
    orchestrator.start()
    orchestrator.run_lifecycle()

if __name__ == "__main__":
    main()
