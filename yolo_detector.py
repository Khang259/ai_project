import argparse
import cv2
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
import torch
import threading
import time
from ultralytics import YOLO
from queue_store import SQLiteQueue


class YOLODetector:
    def __init__(self, model_path: str, camera_id: str, confidence_threshold: float = 0.5):
        """
        Khởi tạo YOLO detector
        
        Args:
            model_path: Đường dẫn đến file model .pt
            camera_id: ID của camera
            confidence_threshold: Ngưỡng tin cậy cho detection
        """
        self.camera_id = camera_id
        self.confidence_threshold = confidence_threshold
        self.queue = SQLiteQueue("queues.db")
        self.running = False
        
        # Load YOLO model
        print(f"Đang tải model YOLO từ {model_path}...")
        self.model = YOLO(model_path)
        print("Model đã được tải thành công!")
        
        # Màu sắc cho các class (BGR format)
        self.colors = self._generate_colors(len(self.model.names))
        
    def _generate_colors(self, num_classes: int) -> List[tuple]:
        """Tạo màu sắc ngẫu nhiên cho các class"""
        np.random.seed(42)
        colors = []
        for _ in range(num_classes):
            color = tuple(np.random.randint(0, 255, 3).tolist())
            colors.append(color)
        return colors
    
    def draw_detections(self, frame: np.ndarray, results) -> np.ndarray:
        """
        Vẽ bounding box và label lên frame
        
        Args:
            frame: Frame gốc
            results: Kết quả detection từ YOLO
            
        Returns:
            Frame đã được vẽ detection
        """
        annotated_frame = frame.copy()
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Lấy thông tin detection
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = self.model.names[class_id]
                    
                    # Chỉ vẽ nếu confidence >= threshold
                    if confidence >= self.confidence_threshold:
                        # Chọn màu cho class
                        color = self.colors[class_id % len(self.colors)]
                        
                        # Vẽ bounding box
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                        
                        # Tạo label
                        label = f"{class_name}: {confidence:.2f}"
                        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)[0]
                        
                        # Vẽ background cho label
                        cv2.rectangle(annotated_frame, (x1, y1 - label_size[1] - 10), 
                                    (x1 + label_size[0], y1), color, -1)
                        
                        # Vẽ text
                        cv2.putText(annotated_frame, label, (x1, y1 - 5), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)
        
        return annotated_frame
    
    def process_detection_results(self, results) -> List[Dict[str, Any]]:
        """
        Xử lý kết quả detection thành format chuẩn
        
        Args:
            results: Kết quả detection từ YOLO
            
        Returns:
            Danh sách các detection đã được xử lý
        """
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    confidence = box.conf[0].cpu().numpy()
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = self.model.names[class_id]
                    
                    if confidence >= self.confidence_threshold:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(float)
                        
                        detection = {
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
                                "x": float((x1 + x2) / 2),
                                "y": float((y1 + y2) / 2)
                            }
                        }
                        detections.append(detection)
        
        return detections
    
    def save_to_queue(self, detections: List[Dict[str, Any]], frame_shape: tuple, frame_id: int) -> None:
        """
        Lưu kết quả detection vào raw_queue
        
        Args:
            detections: Danh sách các detection
            frame_shape: Kích thước frame (height, width, channels)
            frame_id: ID của frame hiện tại
        """
        payload = {
            "camera_id": self.camera_id,
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
        
        # Lưu vào raw_queue với key là camera_id
        self.queue.publish("raw_detection", self.camera_id, payload)
    
    def run_video_detection(self, video_source: str = 0) -> None:
        """
        Chạy detection trên video stream
        
        Args:
            video_source: Nguồn video (0 cho webcam, đường dẫn file, hoặc RTSP URL)
        """
        # Mở video source
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            raise RuntimeError(f"Không thể mở video source: {video_source}")
        
        print(f"Bắt đầu detection cho camera {self.camera_id}")
        print("Nhấn 'q' để thoát, 's' để lưu ảnh hiện tại")
        
        frame_count = 0
        self.running = True
        
        try:
            while self.running:
                ret, frame = cap.read()
                if not ret:
                    print(f"Không thể đọc frame từ video source cho camera {self.camera_id}")
                    break
                
                # Chạy detection
                results = self.model(frame, verbose=False)
                
                # Vẽ kết quả lên frame
                annotated_frame = self.draw_detections(frame, results)
                
                # Xử lý kết quả detection
                detections = self.process_detection_results(results)
                
                # Lưu vào queue (mỗi 5 frame một lần để tránh quá tải)
                if frame_count % 5 == 0:
                    self.save_to_queue(detections, frame.shape, frame_count)
                
                # Hiển thị thông tin trên frame
                info_text = f"Camera: {self.camera_id} | Detections: {len(detections)} | Frame: {frame_count}"
                cv2.putText(annotated_frame, info_text, (10, 30), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1) # Tên font chữ , kích thước chữ/ màu chữ/ độ dày chữ
                
                # Hiển thị frame
                cv2.imshow(f"YOLO Detection - {self.camera_id}", annotated_frame)
                
                # Xử lý phím bấm
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    self.running = False
                    break
                elif key == ord('s'):
                    # Lưu ảnh hiện tại
                    filename = f"detection_{self.camera_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                    cv2.imwrite(filename, annotated_frame)
                    print(f"Đã lưu ảnh: {filename}")
                
                frame_count += 1
                
        except KeyboardInterrupt:
            print(f"\nĐang dừng detection cho camera {self.camera_id}...")
        finally:
            self.running = False
            cap.release()
            cv2.destroyWindow(f"YOLO Detection - {self.camera_id}")
            print(f"Đã dừng detection cho camera {self.camera_id}")
    
    def stop(self) -> None:
        """Dừng detection"""
        self.running = False


class MultiCameraDetector:
    def __init__(self, model_path: str, confidence_threshold: float = 0.5):
        """
        Khởi tạo Multi Camera Detector
        
        Args:
            model_path: Đường dẫn đến file model .pt
            confidence_threshold: Ngưỡng tin cậy cho detection
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.detectors = {}
        self.threads = {}
        self.running = False
        
    def add_camera(self, camera_id: str, video_source: str) -> None:
        """
        Thêm camera vào hệ thống
        
        Args:
            camera_id: ID của camera
            video_source: Nguồn video cho camera
        """
        detector = YOLODetector(
            model_path=self.model_path,
            camera_id=camera_id,
            confidence_threshold=self.confidence_threshold
        )
        self.detectors[camera_id] = detector
        print(f"Đã thêm camera {camera_id} với video source: {video_source}")
    
    def start_detection(self, camera_id: str, video_source: str) -> None:
        """
        Bắt đầu detection cho một camera trong thread riêng
        
        Args:
            camera_id: ID của camera
            video_source: Nguồn video cho camera
        """
        if camera_id not in self.detectors:
            self.add_camera(camera_id, video_source)
        
        def detection_worker():
            try:
                self.detectors[camera_id].run_video_detection(video_source)
            except Exception as e:
                print(f"Lỗi trong detection thread cho camera {camera_id}: {e}")
        
        thread = threading.Thread(target=detection_worker, daemon=True)
        thread.start()
        self.threads[camera_id] = thread
        print(f"Đã bắt đầu detection thread cho camera {camera_id}")
    
    def start_all_detections(self, camera_configs: Dict[str, str]) -> None:
        """
        Bắt đầu detection cho tất cả camera
        
        Args:
            camera_configs: Dict với key là camera_id và value là video_source
        """
        self.running = True
        print("Bắt đầu detection cho tất cả camera...")
        
        for camera_id, video_source in camera_configs.items():
            self.start_detection(camera_id, video_source)
        
        print(f"Đã khởi động {len(camera_configs)} camera")
        print("Nhấn Ctrl+C để dừng tất cả camera")
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nĐang dừng tất cả camera...")
            self.stop_all()
    
    def stop_camera(self, camera_id: str) -> None:
        """Dừng detection cho một camera"""
        if camera_id in self.detectors:
            self.detectors[camera_id].stop()
            print(f"Đã dừng camera {camera_id}")
    
    def stop_all(self) -> None:
        """Dừng tất cả camera"""
        self.running = False
        for camera_id in self.detectors:
            self.stop_camera(camera_id)
        cv2.destroyAllWindows()
        print("Đã dừng tất cả camera")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="YOLO Object Detection với video stream")
    # parser.add_argument("--model", type=str, default="model/model-hanam_0506.pt", 
    parser.add_argument("--model", type=str, default="model/run3.pt", 
                       help="Đường dẫn đến file model YOLO")
    parser.add_argument("--camera-id", type=str, default="cam-1", 
                       help="ID của camera (chỉ dùng với --single-camera)")
    parser.add_argument("--video-source", type=str, default="video/hanam.mp4", 
                       help="Nguồn video (chỉ dùng với --single-camera)")
    parser.add_argument("--confidence", type=float, default=0.5, 
                       help="Ngưỡng tin cậy cho detection (0.0-1.0)")
    parser.add_argument("--single-camera", action="store_true",
                       help="Chạy detection cho một camera duy nhất")
    parser.add_argument("--multi-camera", action="store_true", default=True,
                       help="Chạy detection cho nhiều camera đồng thời (mặc định)")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        if args.single_camera:
            # Chế độ single camera
            video_source = int(args.video_source) if args.video_source.isdigit() else args.video_source
            
            detector = YOLODetector(
                model_path=args.model,
                camera_id=args.camera_id,
                confidence_threshold=args.confidence
            )
            
            detector.run_video_detection(video_source)
            
        else:
            # Chế độ multi camera (mặc định)
            multi_detector = MultiCameraDetector(
                model_path=args.model,
                confidence_threshold=args.confidence
            )
            
            # Cấu hình camera
            camera_configs = {
                # "cam-1": "rtsp://localhost:8554/cam33",
                # "cam-2": "rtsp://localhost:8554/cam34",
                "cam-3": "rtsp://localhost:8554/cam101"
                # "cam-2": "rtsp://localhost:8554/cam2"
            }
            
            print("=== Multi Camera Detection ===")
            print("Camera 1: video/hanam.mp4")
            print("Camera 2: video/vinhPhuc.mp4")
            print("Kết quả sẽ được lưu vào queue với key tương ứng")
            
            multi_detector.start_all_detections(camera_configs)
        
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
