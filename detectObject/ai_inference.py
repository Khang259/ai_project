import cv2
import numpy as np
import time
from ultralytics import YOLO
import json
import torch
import os
from datetime import datetime, timezone
import sys
import os
from ultralytics.nn.tasks import DetectionModel


# ⚙️ Patch tạm thời để cho phép load model đầy đủ
torch.serialization.load = lambda f, *a, **kw: torch.load(f, *a, weights_only=False, **kw)

# Thêm thư mục cha vào path để import queue_store
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
from queue_store import SQLiteQueue

class YOLOInference:
    def __init__(self, model_path):
        if not torch.cuda.is_available():
            print("[YOLO] Lỗi: CUDA không khả dụng. Vui lòng chạy trên máy có GPU/CUDA.")
            raise SystemExit(1)
        self.device = "cuda:0"

        torch.serialization.add_safe_globals([DetectionModel])

        # ⚙️ Patch để cho phép load model đầy đủ (bỏ giới hạn weights_only)
        torch_load_original = torch.load
        def torch_load_safe(f, *a, **kw):
            kw["weights_only"] = False
            return torch_load_original(f, *a, **kw)
        torch.load = torch_load_safe

        # Load model và chuyển sang thiết bị tương ứng
        self.model = YOLO(model_path)
        try:
            self.model.to(self.device)
        except Exception:
            pass
        print(f"Đã load model YOLO: {model_path} | device={self.device}")

    
    def detect(self, frame):
        """
        Detect objects trong frame
        
        Args:
            frame: OpenCV frame
            
        Returns:
            results: YOLO results object
        """
        try:
            # Hỗ trợ cả đơn frame (np.ndarray) và batch (List[np.ndarray])
            results = self.model(frame, device=self.device, verbose=False)
            return results
        except Exception as e:
            print(f"Lỗi inference: {e}")
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

def ai_inference_worker(shared_dict, result_dict, model_path="weights/model-hanam_0506.pt", target_fps=2.0, enable=True):
    """
AI Inference worker process
    
    Args:
shared_dict: Dict chứa frame từ camera
        result_dict: Dict để lưu kết quả detection
        model_path: Đường dẫn model YOLO
        target_fps: FPS mục tiêu cho AI inference (mặc định: 2.0 FPS)
    """
    print("AI Inference worker: Bắt đầu batch processing (không vẽ, chỉ lưu & in JSON)")
    print(f"Processing all cameras in single process for better efficiency (GPU batch, FPS: {target_fps})")
    
    # Load YOLO model
    try:
        yolo = YOLOInference(model_path)
    except Exception as e:
        print(f"Lỗi load model: {e}")
        return
    
    frame_count = 0
    inference_interval = 1.0 / target_fps  # Khoảng thời gian giữa các lần inference
    last_inference_time = 0

    # Khởi tạo SQLiteQueue để lưu kết quả detection (lưu trong thư mục cha)
    queue_db_path = os.path.join(parent_dir, "queues.db")
    queue = SQLiteQueue(queue_db_path)
    print(f"Đã khởi tạo SQLiteQueue để lưu kết quả detection vào raw_detection topic tại: {queue_db_path}")

    def build_detection_payload(cam_name: str, frame: np.ndarray, results, frame_id: int) -> dict:
        """Chuẩn hoá payload theo định dạng yêu cầu."""
        # frame shape
        h, w = (frame.shape[0], frame.shape[1]) if frame is not None else (0, 0)
        c = frame.shape[2] if frame is not None and len(frame.shape) == 3 else 0

        detections = []
        if results is not None and hasattr(results, 'boxes') and len(results.boxes) > 0:
            for box in results.boxes:
                # Toạ độ bbox
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                confidence = float(box.conf[0].cpu().numpy())
                class_id = int(box.cls[0].cpu().numpy())
                class_name = results.names[class_id]
                # Tâm bbox
                cx = float((x1 + x2) / 2.0)
                cy = float((y1 + y2) / 2.0)
                detections.append({
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "bbox": {
                        "x1": float(x1),
                        "y1": float(y1),
                        "x2": float(x2),
                        "y2": float(y2)
                    },
                    "center": {
                        "x": cx,
                        "y": cy
                    }
                })

        payload = {
            "camera_id": cam_name,
            "frame_id": frame_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "frame_shape": {
                "height": int(h),
                "width": int(w),
                "channels": int(c)
            },
            "detections": detections,
            "detection_count": len(detections)
        }
        return payload
    
    try:
        while True:
            if enable is not None and enable.value == 0:
                time.sleep(0.1)  # AI tắt → chỉ sleep
                continue
            # Kiểm tra FPS - chỉ inference nếu đã đủ thời gian
            current_time = time.time()
            if current_time - last_inference_time < inference_interval:
                time.sleep(0.01)  # Sleep ngắn để không chiếm CPU
                continue
            
            last_inference_time = current_time
            
            # Lấy danh sách camera
            camera_names = list(shared_dict.keys())
            if not camera_names:
                time.sleep(0.1)
                continue
            
            # === TRUE BATCH PROCESSING ===
            # Bước 1: Thu thập tất cả frame hợp lệ
            valid_frames = {}
            
            TARGET_WIDTH, TARGET_HEIGHT = 1280, 720
            for cam_name in camera_names:
                cam_data = shared_dict.get(cam_name, {})
                frame_age = current_time - cam_data.get('ts', 0)
                
                if (cam_data.get('status') == 'ok' and 
                    cam_data.get('frame') is not None and 
                    frame_age < 5.0):
                    
                    try:
                        # Decode frame từ JPEG
                        jpeg_bytes = cam_data['frame']
                        nparr = np.frombuffer(jpeg_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        # Resize frame về 1280x720
                        if frame is not None:
                            try:
                                frame = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT), interpolation=cv2.INTER_LINEAR)
                            except Exception as re:
                                print(f"Lỗi resize frame {cam_name}: {re}")
                        
                        if frame is not None:
                            valid_frames[cam_name] = {
                                'frame': frame,
                                'timestamp': current_time,
                                'original_data': cam_data
                            }
                    except Exception as e:
                        print(f"Lỗi decode frame {cam_name}: {e}")
            
            # Bước 2: True batch inference nếu có frames hợp lệ
            if valid_frames:
                batch_start_time = time.time()
                
                # Prepare batch data
                frames_list = []
                cam_names_list = []
                
                for cam_name, frame_data in valid_frames.items():
                    frames_list.append(frame_data['frame'])
                    cam_names_list.append(cam_name)
                
                # True batch inference với YOLO
                try:
                    batch_results = yolo.detect(frames_list)
                    batch_inference_time = time.time() - batch_start_time

                    # Bước 3: Xử lý kết quả batch (LƯU VÀO RAW_DETECTION TOPIC)
                    for i, (cam_name, results) in enumerate(zip(cam_names_list, batch_results)):
                        frame_data = valid_frames[cam_name]
                        frame = frames_list[i]
                        frame_count += 1
                        payload = build_detection_payload(cam_name, frame, results, frame_id=frame_count)
                        
                        # # In ra stdout (mỗi dòng 1 JSON) - để debug
                        # try:
                        #     print(json.dumps(payload, ensure_ascii=False))
                        # except Exception:
                        #     # Fallback nếu có ký tự đặc biệt
                        #     print(json.dumps(payload))
                        
                        # Lưu vào raw_detection topic với key là camera_id
                        try:
                            queue.publish("raw_detection", cam_name, payload)
                        except Exception as qe:
                            print(f"Lỗi lưu vào queue: {qe}")
                    # Log hiệu năng batch
                    avg_time_per_frame = batch_inference_time / max(1, len(frames_list))
                    # print(f"True batch: {len(frames_list)} cams in {batch_inference_time:.3f}s (avg: {avg_time_per_frame:.3f}s/frame)")

                except Exception as e:
                    print(f"Batch inference failed: {e}")
                    # Fallback to sequential processing
                    pass
            
            # Bước 4: (Bỏ ghi result_dict/no_signal). Ở chế độ này chỉ in & lưu vào raw_detection topic.
            
    except KeyboardInterrupt:
        print("AI Inference worker: Đang dừng...")
    except Exception as e:
        print(f"AI Inference worker lỗi: {e}")
    finally:
        print("AI Inference worker: Đã dừng")