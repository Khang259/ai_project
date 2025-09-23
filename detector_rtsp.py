import argparse
import time
from datetime import datetime
from typing import Any, Dict, List

import cv2
import numpy as np
from ultralytics import YOLO

from queue_store import SQLiteQueue


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="RTSP -> YOLO -> queue raw_detection"
    )
    parser.add_argument(
        "--rtsp",
        type=str,
        default="rtsp://192.168.1.162:8080/h264_ulaw.sdp",
        help="RTSP URL của camera",
    )
    parser.add_argument("--camera-id", type=str, default="cam-1", help="ID camera")
    parser.add_argument(
        "--model-path", type=str, default="yolo11s_candy_model.pt", help="Đường dẫn model YOLO"
    )
    parser.add_argument("--conf", type=float, default=0.25, help="Ngưỡng confidence")
    parser.add_argument(
        "--device", type=str, default="cpu", help="Thiết bị: cpu, cuda, mps"
    )
    parser.add_argument(
        "--frame-skip",
        type=int,
        default=0,
        help="Bỏ qua N frame giữa các lần suy luận (0 = mỗi frame)",
    )
    return parser.parse_args()


def build_detection_message(
    camera_id: str,
    frame_id: int,
    model_names: Dict[int, str],
    boxes: np.ndarray,
    classes: np.ndarray,
    confs: np.ndarray,
) -> Dict[str, Any]:
    timestamp = datetime.utcnow().isoformat() + "Z"
    detections: List[Dict[str, Any]] = []
    for i in range(boxes.shape[0]):
        x1, y1, x2, y2 = [float(v) for v in boxes[i].tolist()]
        cls_id = int(classes[i])
        cls_name = model_names.get(cls_id, str(cls_id))
        conf = float(confs[i])
        detections.append(
            {
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "bbox_xyxy": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
            }
        )

    return {
        "camera_id": camera_id,
        "frame_id": frame_id,
        "timestamp": timestamp,
        "detections": detections,
    }


def main() -> None:
    args = parse_args()

    queue = SQLiteQueue("queues.db")
    model = YOLO(args.model_path)

    cap = cv2.VideoCapture(args.rtsp)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được RTSP: {args.rtsp}")

    frame_id = 0
    names_map = model.model.names if hasattr(model, "model") else model.names

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.2)
                continue

            if args.frame_skip > 0 and frame_id % (args.frame_skip + 1) != 0:
                frame_id += 1
                continue

            # YOLO inference
            results = model.predict(
                source=frame,
                conf=args.conf,
                device=args.device,
                verbose=False,
                imgsz=max(frame.shape[0], frame.shape[1]),
            )

            r = results[0]
            if r.boxes is None or r.boxes.xyxy is None or len(r.boxes) == 0:
                msg = {
                    "camera_id": args.camera_id,
                    "frame_id": frame_id,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "detections": [],
                }
            else:
                boxes = r.boxes.xyxy.cpu().numpy()
                cls = r.boxes.cls.cpu().numpy().astype(int)
                conf = r.boxes.conf.cpu().numpy()
                msg = build_detection_message(
                    args.camera_id, frame_id, names_map, boxes, cls, conf
                )

            queue.publish("raw_detection", args.camera_id, msg)

            frame_id += 1

    finally:
        cap.release()


if __name__ == "__main__":
    main()


