import argparse
import cv2
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
import torch
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
                        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                        
                        # Vẽ background cho label
                        cv2.rectangle(annotated_frame, (x1, y1 - label_size[1] - 10), 
                                    (x1 + label_size[0], y1), color, -1)
                        
                        # Vẽ text
                        cv2.putText(annotated_frame, label, (x1, y1 - 5), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
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
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Không thể đọc frame từ video source")
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
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                # Hiển thị frame
                cv2.imshow(f"YOLO Detection - {self.camera_id}", annotated_frame)
                
                # Xử lý phím bấm
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s'):
                    # Lưu ảnh hiện tại
                    filename = f"detection_{self.camera_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                    cv2.imwrite(filename, annotated_frame)
                    print(f"Đã lưu ảnh: {filename}")
                
                frame_count += 1
                
        except KeyboardInterrupt:
            print("\nĐang dừng detection...")
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print(f"Đã dừng detection cho camera {self.camera_id}")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="YOLO Object Detection với video stream")
    parser.add_argument("--model", type=str, default="yolo11s_candy_model.pt", 
                       help="Đường dẫn đến file model YOLO")
    parser.add_argument("--camera-id", type=str, default="cam-1", 
                       help="ID của camera")
    parser.add_argument("--video-source", type=str, default="0", 
                       help="Nguồn video (0=webcam, đường dẫn file, hoặc RTSP URL)")
    parser.add_argument("--confidence", type=float, default=0.5, 
                       help="Ngưỡng tin cậy cho detection (0.0-1.0)")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    # Chuyển đổi video_source thành số nếu là "0"
    video_source = int(args.video_source) if args.video_source.isdigit() else args.video_source
    
    try:
        # Tạo detector
        detector = YOLODetector(
            model_path=args.model,
            camera_id=args.camera_id,
            confidence_threshold=args.confidence
        )
        
        # Chạy detection
        detector.run_video_detection(video_source)
        
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
