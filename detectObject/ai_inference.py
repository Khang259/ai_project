import cv2
import numpy as np
import time
from ultralytics import YOLO
import json
from datetime import datetime
import os
import sys

# Add parent directory to path để import queue_store
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from queue_store import SQLiteQueue

def convert_camera_name_to_id(camera_name):
    """
    Chuyển đổi camera name thành camera_id theo format cam-X
    Format: cam-1, cam-2, ..., cam-9, cam-10, cam-11, ..., cam-35
    
    Args:
        camera_name: Tên camera gốc (ví dụ: "Camera_30", "Camera1", "cam-1")
        
    Returns:
        str: Camera ID theo format cam-X (ví dụ: "cam-1", "cam-10", "cam-30")
    """
    if not camera_name:
        return "cam-1"
    
    # Nếu đã có format cam-X thì chuẩn hóa số
    if camera_name.startswith("cam-"):
        number_part = camera_name[4:]  # Bỏ "cam-"
        try:
            number = int(number_part)
            return f"cam-{number}"
        except ValueError:
            return camera_name
    
    # Xử lý format "Camera_30" -> "cam-30"
    if '_' in camera_name:
        number_part = camera_name.split('_')[-1]
        try:
            number = int(number_part)
            return f"cam-{number}"
        except ValueError:
            return f"cam-{number}"
    
    # Xử lý format "Camera30" -> "cam-30"
    if camera_name.lower().startswith("camera"):
        number_part = camera_name.lower().replace("camera", "")
        try:
            number = int(number_part)
            return f"cam-{number}"
        except ValueError:
            return f"cam-{number}"
    
    # Xử lý format "30" -> "cam-30"
    try:
        number = int(camera_name)
        return f"cam-{number}"
    except ValueError:
        pass
    
    # Mặc định: thêm prefix cam-
    return f"cam-{camera_name}"

class YOLOInference:
    """Class xử lý inference YOLO"""
    
    def __init__(self, model_path, db_path="../queues.db", save_to_queue=True):
        """
        Args:
            model_path: Đường dẫn file .pt
            db_path: Đường dẫn database SQLite
            save_to_queue: Có lưu kết quả vào queue không
        """
        self.model = YOLO(model_path)
        self.save_to_queue = save_to_queue
        if self.save_to_queue:
            self.queue = SQLiteQueue(db_path)
        print(f"Đã load model YOLO: {model_path}")
        if self.save_to_queue:
            print(f"Đã kết nối database: {db_path}")
    
    def detect(self, frame):
        """
        Detect objects trong frame
        
        Args:
            frame: OpenCV frame
            
        Returns:
            results: YOLO results object
        """
        try:
            results = self.model(frame,device="cuda")
            return results[0]  # Lấy result đầu tiên
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
    
    def get_detection_info(self, results, frame_shape):
        """
        Lấy thông tin detection theo định dạng JSON yêu cầu
        
        Args:
            results: YOLO results
            frame_shape: Tuple (height, width, channels)
            
        Returns:
            dict: Thông tin detection theo format JSON
        """
        if results is None or len(results.boxes) == 0:
            return {
                "detections": [],
                "detection_count": 0
            }
        
        detections = []
        for box in results.boxes:
            confidence = box.conf[0].cpu().numpy()
            class_id = int(box.cls[0].cpu().numpy())
            class_name = results.names[class_id]
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            
            # Tính center point
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2
            
            detections.append({
                "class_id": class_id,
                "class_name": class_name,
                "confidence": float(confidence),
                "bbox": {
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2)
                },
                "center": {
                    "x": float(center_x),
                    "y": float(center_y)
                }
            })
        
        return {
            "detections": detections,
            "detection_count": len(detections)
        }
    
    def save_to_queue(self, camera_id, detections, frame_shape, frame_id):
        """
        Lưu kết quả detection vào raw_detection queue (tương tự yolo_detector.py)
        
        Args:
            camera_id: ID của camera
            detections: Danh sách detections
            frame_shape: Kích thước frame (height, width, channels)
            frame_id: ID của frame hiện tại
        """
        if not self.save_to_queue:
            return
            
        payload = {
            "camera_id": camera_id,
            "frame_id": frame_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "frame_shape": {
                "height": int(frame_shape[0]),
                "width": int(frame_shape[1]),
                "channels": int(frame_shape[2]) if len(frame_shape) > 2 else 1
            },
            "detections": detections,
            "detection_count": len(detections)
        }
        
        # Lưu vào raw_detection queue với key là camera_id (giống yolo_detector.py)
        self.queue.publish("raw_detection", camera_id, payload)
        print(f"Đã lưu detection cho camera {camera_id}: {len(detections)} objects")

def ai_inference_worker(shared_dict, result_dict, cam_names=None, model_path="weights/model_vl_0205.pt", 
                       db_path="../queues.db", save_to_queue=True, save_interval=5):
    """
    AI Inference worker process
    
    Args:
        shared_dict: Dict chứa frame từ camera
        result_dict: Dict để lưu kết quả detection
        cam_names: List tên camera cần process (None để process tất cả)
        model_path: Đường dẫn model YOLO
        db_path: Đường dẫn database SQLite
        save_to_queue: Có lưu kết quả vào queue không
        save_interval: Lưu vào queue mỗi N frame (giống yolo_detector.py)
    """
    print("AI Inference worker: Bắt đầu")
    if cam_names is None:
        print("Processing all cameras")
    else:
        print(f"Processing {len(cam_names)} specific cameras")
    
    if save_to_queue:
        print(f"Lưu kết quả vào queue: {db_path}")
        print(f"Lưu mỗi {save_interval} frame")
    
    # Load YOLO model
    try:
        yolo = YOLOInference(model_path, db_path, save_to_queue)
    except Exception as e:
        print(f"Lỗi load model: {e}")
        return
    
    frame_count = 0
    
    try:
        while True:
            # Lấy danh sách camera
            camera_names = list(shared_dict.keys())
            if cam_names is not None:
                camera_names = [cam for cam in camera_names if cam in cam_names]
            
            if not camera_names:
                time.sleep(0.1)
                continue
            
            # Process từng camera
            for cam_name in camera_names:
                cam_data = shared_dict.get(cam_name, {})
                
                # Kiểm tra frame có hợp lệ không
                current_time = time.time()
                frame_age = current_time - cam_data.get('ts', 0)
                
                if (cam_data.get('status') == 'ok' and 
                    cam_data.get('frame') is not None and 
                    frame_age < 2.0):
                    
                    try:
                        # Decode frame từ JPEG
                        jpeg_bytes = cam_data['frame']
                        nparr = np.frombuffer(jpeg_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        
                        if frame is not None:
                            # Resize frame về 1280x720
                            frame = cv2.resize(frame, (1280, 720))
                            
                            # Chạy inference
                            start_time = time.time()
                            results = yolo.detect(frame)
                            inference_time = time.time() - start_time
                            
                            if results is not None:
                                # Lấy thông tin detection theo format JSON
                                frame_shape = frame.shape
                                detection_info = yolo.get_detection_info(results, frame_shape)
                                
                                # Vẽ bbox + label lên frame để hiển thị
                                annotated_frame = yolo.draw_results(frame.copy(), results)
                                ok, enc = cv2.imencode('.jpg', annotated_frame)
                                annotated_jpeg = enc.tobytes() if ok else None
                                
                                # Chuyển đổi camera name thành format cam-X
                                camera_id = convert_camera_name_to_id(cam_name)
                                
                                # Lưu vào queue mỗi save_interval frame (giống yolo_detector.py)
                                if frame_count % save_interval == 0:
                                    yolo.save_to_queue(camera_id, detection_info["detections"], frame_shape, frame_count)
                                
                                # Tạo kết quả JSON theo format yêu cầu
                                json_result = {
                                    "camera_id": camera_id,
                                    "frame_id": frame_count,
                                    "timestamp": datetime.utcnow().isoformat() + "Z",
                                    "frame_shape": {
                                        "height": int(frame_shape[0]),
                                        "width": int(frame_shape[1]),
                                        "channels": int(frame_shape[2])
                                    },
                                    "detections": detection_info["detections"],
                                    "detection_count": detection_info["detection_count"]
                                }
                                
                                # In kết quả JSON ra console (chỉ khi có detection hoặc mỗi 10 frame)
                                if detection_info["detection_count"] > 0 or frame_count % 10 == 0:
                                    print(f"Camera {camera_id} (từ {cam_name}) - Frame {frame_count}: {detection_info['detection_count']} detections")
                                    if detection_info["detection_count"] > 0:
                                        print(json.dumps(json_result, indent=2))
                                
                                # Lưu vào result_dict (frame đã annotate để hiển thị)
                                result_dict[cam_name] = {
                                    'frame': annotated_jpeg,
                                    'ts': current_time,
                                    'status': 'ok',
                                    'inference_time': inference_time,
                                    'detections': detection_info['detection_count'],
                                    'objects': detection_info['detections']
                                }
                            else:
                                # Inference lỗi
                                camera_id = convert_camera_name_to_id(cam_name)
                                result_dict[cam_name] = {
                                    'frame': None,
                                    'ts': current_time,
                                    'status': 'inference_error',
                                    'inference_time': 0,
                                    'detections': 0,
                                    'objects': []
                                }
                        
                    except Exception as e:
                        print(f"Lỗi process camera {cam_name}: {e}")
                        result_dict[cam_name] = {
                            'frame': None,
                            'ts': current_time,
                            'status': 'error',
                            'inference_time': 0,
                            'detections': 0,
                            'objects': []
                        }
                
                else:
                    # Camera không có tín hiệu
                    if cam_name in result_dict:
                        result_dict[cam_name]['status'] = 'no_signal'
            
            frame_count += 1
            
            # Không cần inference quá nhanh
            time.sleep(0.05)  # ~20 FPS
            
    except KeyboardInterrupt:
        print("AI Inference worker: Đang dừng...")
    except Exception as e:
        print(f"AI Inference worker lỗi: {e}")
    finally:
        print("AI Inference worker: Đã dừng")

def create_yolo_inference(model_path="weights/model_vl_0205.pt", db_path="../queues.db", save_to_queue=True):
    """
    Tạo instance YOLOInference với cấu hình mặc định
    
    Args:
        model_path: Đường dẫn model YOLO
        db_path: Đường dẫn database SQLite
        save_to_queue: Có lưu kết quả vào queue không
        
    Returns:
        YOLOInference: Instance đã được khởi tạo
    """
    return YOLOInference(model_path, db_path, save_to_queue)

def process_single_frame(yolo_inference, frame, camera_id="cam-1", frame_id=0, save_to_queue=True):
    """
    Xử lý một frame đơn lẻ và lưu kết quả
    
    Args:
        yolo_inference: Instance YOLOInference
        frame: OpenCV frame
        camera_id: ID của camera
        frame_id: ID của frame
        save_to_queue: Có lưu vào queue không
        
    Returns:
        dict: Kết quả detection
    """
    # Chạy inference
    results = yolo_inference.detect(frame)
    
    if results is not None:
        # Lấy thông tin detection
        frame_shape = frame.shape
        detection_info = yolo_inference.get_detection_info(results, frame_shape)
        
        # Lưu vào queue nếu được yêu cầu
        if save_to_queue:
            yolo_inference.save_to_queue(camera_id, detection_info["detections"], frame_shape, frame_id)
        
        return {
            "camera_id": camera_id,
            "frame_id": frame_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "frame_shape": {
                "height": int(frame_shape[0]),
                "width": int(frame_shape[1]),
                "channels": int(frame_shape[2])
            },
            "detections": detection_info["detections"],
            "detection_count": detection_info["detection_count"]
        }
    else:
        return {
            "camera_id": camera_id,
            "frame_id": frame_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "detections": [],
            "detection_count": 0
        }

# Ví dụ sử dụng
if __name__ == "__main__":
    # Tạo YOLO inference với lưu queue
    yolo = create_yolo_inference(
        model_path="weights/model_vl_0205.pt",
        db_path="../queues.db",
        save_to_queue=True
    )
    
    # Ví dụ xử lý video file
    cap = cv2.VideoCapture("video/test.mp4")
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Xử lý frame
        result = process_single_frame(yolo, frame, "cam-1", frame_count, save_to_queue=True)
        
        # In kết quả nếu có detection
        if result["detection_count"] > 0:
            print(f"Frame {frame_count}: {result['detection_count']} detections")
        
        frame_count += 1
        
        # Thoát khi nhấn 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()