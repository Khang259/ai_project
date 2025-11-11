import cv2
import numpy as np
import time
import torch
import os
import sys
from typing import Optional, Dict, Any, List
from pathlib import Path
from ultralytics import YOLO
from multiprocessing import Queue

# Thêm thư mục cha vào path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from config import ai_config, camera_config
from utils import (
    decode_jpeg_frame,
    resize_frame,
    is_frame_valid,
    get_current_timestamp_iso,
    get_frame_shape_info,
    FPSController,
    PerformanceMonitor
)

class YOLOInference:
    """Class xử lý inference YOLO với tối ưu GPU"""
    
    def __init__(self, model_path: str, use_fp16: bool = True):
        """
        Args:
            model_path: Đường dẫn file .pt
            use_fp16: Sử dụng FP16 (half precision) để tăng tốc GPU
        """
        # Bắt buộc dùng GPU. Nếu không có CUDA, dừng chương trình.
        if not torch.cuda.is_available():
            raise SystemExit(1)
        
        self.device = "cuda:0"
        self.model_path = model_path
        self.use_fp16 = use_fp16

        # Load model và chuyển sang thiết bị tương ứng
        try:
            self.model = YOLO(model_path)
            
            # Chuyển model lên GPU
            try:
                self.model.to(self.device)
            except Exception:
                pass
            
            # Bật FP16 (half precision) để tăng tốc trên GPU RTX
            if use_fp16:
                try:
                    self.model.model.half()  # Chuyển model sang FP16
                except Exception:
                    pass
            
            # Warm-up GPU để tránh cold start
            self._warmup_gpu()
        except Exception as e:
            raise
    
    def _warmup_gpu(self):
        """Warm-up GPU với một vài lần inference để tránh cold start"""
        try:
            dummy_input = np.zeros((640, 640, 3), dtype=np.uint8)
            for _ in range(3):
                _ = self.model(dummy_input, device=self.device, verbose=False, half=self.use_fp16)
            torch.cuda.synchronize()  # Đợi GPU hoàn thành
        except Exception:
            pass
    
    def detect(self, frame, stream: bool = True):
        """
        Detect objects trong frame với tối ưu GPU
        
        Args:
            frame: OpenCV frame hoặc List[np.ndarray] cho batch
            stream: Sử dụng stream mode để giảm overhead
            
        Returns:
            results: YOLO results object hoặc None nếu lỗi
        """
        try:
            # Hỗ trợ cả đơn frame (np.ndarray) và batch (List[np.ndarray])
            # stream=True giảm overhead, half=True dùng FP16
            results = self.model(
                frame, 
                device=self.device, 
                verbose=False,
                half=self.use_fp16,
                stream=stream
            )
            return results
        except Exception:
            return None
    
    def draw_results(self, frame, results):
        """
        Vẽ bounding box và label lên frame
        
        Args:
            frame: OpenCV frame
            results: YOLO results
            
        Returns:
            frame: Frame đã vẽ kết quả
        """
        if results is None or len(results.boxes) == 0:
            return frame
        
        # Vẽ từng detection
        for box in results.boxes:
            # Lấy tọa độ
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            confidence = box.conf[0].cpu().numpy()
            class_id = int(box.cls[0].cpu().numpy())
            
            # Lấy tên class
            class_name = results.names[class_id]
            
            # Vẽ bounding box
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            
            # Vẽ label
            label = f"{class_name}: {confidence:.2f}"
            cv2.putText(frame, label, (int(x1), int(y1)-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        return frame
    
    def get_detection_info(self, results):
        """
        Lấy thông tin detection để in ra
        
        Args:
            results: YOLO results
            
        Returns:
            dict: Thông tin detection
        """
        if results is None or len(results.boxes) == 0:
            return {"detections": 0, "objects": []}
        
        objects = []
        for box in results.boxes:
            confidence = box.conf[0].cpu().numpy()
            class_id = int(box.cls[0].cpu().numpy())
            class_name = results.names[class_id]
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            
            objects.append({
                "class": class_name,
                "confidence": float(confidence),
                "bbox": [float(x1), float(y1), float(x2), float(y2)]
            })
        
        return {
            "detections": len(objects),
            "objects": objects
        }

def ai_inference_worker(shared_dict: Dict[str, Any], 
                       result_dict: Dict[str, Any],
                       detection_queue: Queue,
                       model_path: Optional[str] = None, 
                       target_fps: Optional[float] = None) -> None:
    """
    AI Inference worker process
    
    Args:
        shared_dict: Dict chứa frame từ camera
        result_dict: Dict để lưu kết quả detection (không sử dụng)
        detection_queue: Queue để gửi kết quả detection
        model_path: Đường dẫn model YOLO (mặc định từ config)
        target_fps: FPS mục tiêu cho AI inference (mặc định từ config)
    """
    # Sử dụng config nếu không truyền tham số
    model_path = model_path or ai_config.DEFAULT_MODEL_PATH
    target_fps = target_fps or ai_config.TARGET_FPS
    
    # Load YOLO model
    try:
        yolo = YOLOInference(model_path)
    except Exception:
        return
    
    frame_count = 0
    fps_controller = FPSController(target_fps)
    perf_monitor = PerformanceMonitor(window_size=50)
    
    # Tối ưu CUDA
    torch.backends.cudnn.benchmark = True  # Tự động tìm thuật toán convolution tối ưu
    torch.cuda.empty_cache()  # Xóa cache GPU
    
    # Tạo CUDA stream riêng để tăng throughput
    cuda_stream = torch.cuda.Stream()

    def build_detection_payload(cam_name: str, results) -> Dict[str, Any]:
        """
        Chuẩn hoá payload theo định dạng yêu cầu
        
        Args:
            cam_name: Tên camera
            results: YOLO results
            
        Returns:
            Dict chứa thông tin detection theo format:
            {
              "camera_id": "cam-56",
              "timestamp": 1678886400,
              "detection_results": [
                {
                  "class": 0, 
                  "bbox": [10, 15, 50, 60],
                  "confidence": 0.95
                }
              ]
            }
        """
        detection_results = []
        if results is not None and hasattr(results, 'boxes') and len(results.boxes) > 0:
            for box in results.boxes:
                # Toạ độ bbox
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0].cpu().numpy())
                class_id = int(box.cls[0].cpu().numpy())
                
                detection_results.append({
                    "class": class_id,
                    "bbox": [float(x1), float(y1), float(x2), float(y2)],
                    "confidence": confidence
                })

        payload = {
            "camera_id": cam_name,
            "timestamp": int(time.time()),
            "detection_results": detection_results
        }
        return payload
    
    try:
        while True:
            # Kiểm tra FPS - chỉ inference nếu đã đủ thời gian
            if not fps_controller.should_process():
                time.sleep(ai_config.SLEEP_TIME)
                continue
            
            current_time = time.time()
            
            # Lấy danh sách camera
            camera_names = list(shared_dict.keys())
            if not camera_names:
                time.sleep(0.1)
                continue
            
            # === OPTIMIZED BATCH PROCESSING ===
            # Bước 1: Thu thập tất cả frame hợp lệ và xử lý song song
            valid_frames = {}
            frames_to_process = []
            
            for cam_name in camera_names:
                cam_data = shared_dict.get(cam_name, {})
                
                # Kiểm tra frame hợp lệ
                if not is_frame_valid(cam_data):
                    continue
                
                try:
                    # Decode frame từ JPEG (vẫn trên CPU, nhưng batch decode)
                    jpeg_bytes = cam_data['frame']
                    frame = decode_jpeg_frame(jpeg_bytes)
                    
                    if frame is None:
                        continue
                    
                    # Resize frame về kích thước AI input
                    frame = resize_frame(frame, ai_config.INPUT_SIZE)
                    
                    if frame is not None:
                        valid_frames[cam_name] = {
                            'frame': frame,
                            'timestamp': current_time,
                            'original_data': cam_data
                        }
                        frames_to_process.append((cam_name, frame))
                except Exception:
                    pass
            
            # Bước 2: OPTIMIZED batch inference với GPU stream
            if frames_to_process:
                perf_monitor.start()
                
                # Prepare batch data
                frames_list = [f[1] for f in frames_to_process]
                cam_names_list = [f[0] for f in frames_to_process]
                
                # True batch inference với YOLO + CUDA optimization
                try:
                    # Sử dụng CUDA stream để tăng throughput
                    with torch.cuda.stream(cuda_stream):
                        # Chuyển batch lên GPU cùng lúc (tối ưu data transfer)
                        batch_results = yolo.detect(frames_list, stream=False)
                        
                        # Đảm bảo GPU hoàn thành trước khi xử lý kết quả
                        torch.cuda.synchronize()
                    
                    batch_inference_time = perf_monitor.stop()

                    # Bước 3: Xử lý kết quả batch (GỬI VÀO QUEUE)
                    for i, (cam_name, results) in enumerate(zip(cam_names_list, batch_results)):
                        frame_count += 1
                        payload = build_detection_payload(cam_name, results)
                        
                        # Gửi vào detection queue
                        try:
                            detection_queue.put(payload, block=False)
                        except Exception:
                            pass

                except Exception:
                    perf_monitor.stop()  # Reset timer nếu có lỗi
                    torch.cuda.empty_cache()  # Xóa cache nếu lỗi
                    
    except KeyboardInterrupt:
        pass
    except Exception:
        pass