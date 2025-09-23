import argparse
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Tuple

import cv2
import numpy as np

from queue_store import SQLiteQueue


Point = Tuple[int, int]


@dataclass
class EmaState:
    value: float = 0.0
    initialized: bool = False


def polygon_iou_with_box(polygon: np.ndarray, box_xyxy: np.ndarray) -> float:
    """Ước lượng overlap giữa polygon và bbox bằng tỉ lệ diện tích giao nhau / bbox area.
    Sử dụng phép toán trên mask nhị phân để đơn giản.
    """
    x1, y1, x2, y2 = box_xyxy.astype(int)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    w = max(1, x2)
    h = max(1, y2)
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(mask, [polygon.astype(np.int32)], 1)
    box_mask = np.zeros_like(mask)
    cv2.rectangle(box_mask, (x1, y1), (x2, y2), 1, -1)
    inter = np.logical_and(mask, box_mask).sum()
    box_area = (x2 - x1) * (y2 - y1)
    if box_area <= 0:
        return 0.0
    return float(inter) / float(box_area)


def box_center(point_box: np.ndarray) -> Tuple[int, int]:
    x1, y1, x2, y2 = point_box
    cx = int((x1 + x2) / 2)
    cy = int((y1 + y2) / 2)
    return cx, cy


def run_mapper(camera_id: str, rtsp: str, alpha: float, iou_threshold: float):
    queue = SQLiteQueue("queues.db")
    last_det_id = 0
    last_roi_id = 0

    # EMA state cho từng ROI slot
    ema_scores: Dict[str, EmaState] = defaultdict(EmaState)

    # Video hiển thị overlay để theo dõi trực quan
    cap = cv2.VideoCapture(rtsp)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được RTSP: {rtsp}")

    while True:
        # Lấy các bản ghi mới
        new_rois = queue.get_after_id("roi_config", camera_id, last_roi_id, limit=1)
        if new_rois:
            last_roi_id = new_rois[-1]["id"]
            roi_payload = new_rois[-1]["payload"]
            img_w, img_h = roi_payload.get("image_wh", [1920, 1080])
            slots = roi_payload.get("slots", [])
            roi_polys = {
                slot["slot_id"]: np.array(slot["points"], dtype=np.int32)
                for slot in slots
            }
        else:
            # dùng ROI gần nhất nếu có
            latest = queue.get_latest_row("roi_config", camera_id)
            if latest is not None:
                last_roi_id = latest["id"]
                roi_payload = latest["payload"]
                img_w, img_h = roi_payload.get("image_wh", [1920, 1080])
                slots = roi_payload.get("slots", [])
                roi_polys = {
                    slot["slot_id"]: np.array(slot["points"], dtype=np.int32)
                    for slot in slots
                }
            else:
                roi_polys = {}
                img_w, img_h = 1920, 1080

        new_dets = queue.get_after_id("raw_detection", camera_id, last_det_id, limit=5)
        if not new_dets:
            # vẫn update khung hình để xem video chạy
            ok, frame = cap.read()
            if ok:
                _render_overlay(frame, [], roi_polys, {}, iou_threshold)
            cv2.waitKey(1)
            time.sleep(0.01)
            continue

        for row in new_dets:
            last_det_id = row["id"]
            payload = row["payload"]
            detections = payload.get("detections", [])

            # đọc frame tương ứng hiện tại (không đồng bộ tuyệt đối, nhưng chấp nhận để minh hoạ)
            ok, frame = cap.read()
            if not ok:
                continue

            # Map bbox vào ROI và tính occupancy score từng ROI (max IoU trong các bbox)
            roi_scores: Dict[str, float] = {slot_id: 0.0 for slot_id in roi_polys.keys()}

            for det in detections:
                x1, y1, x2, y2 = det["bbox_xyxy"]
                box = np.array([x1, y1, x2, y2], dtype=np.float32)
                # nhanh hơn: dùng tâm hộp để check trong polygon, sau đó tuỳ chọn tính iou mask
                cx, cy = box_center(box)
                for slot_id, poly in roi_polys.items():
                    inside = cv2.pointPolygonTest(poly, (float(cx), float(cy)), False) >= 0
                    if not inside:
                        continue
                    # tính IoU tương đối với bbox
                    iou = polygon_iou_with_box(poly, box)
                    roi_scores[slot_id] = max(roi_scores[slot_id], iou)

            # EMA debounce
            debounced: Dict[str, float] = {}
            for slot_id, score in roi_scores.items():
                state = ema_scores[slot_id]
                if not state.initialized:
                    state.value = score
                    state.initialized = True
                else:
                    state.value = alpha * score + (1 - alpha) * state.value
                debounced[slot_id] = state.value

            # Publish kết quả occupancy
            out = {
                "camera_id": camera_id,
                "frame_id": payload.get("frame_id"),
                "timestamp": payload.get("timestamp"),
                "occupancy": [
                    {"slot_id": sid, "score": round(float(v), 4)} for sid, v in debounced.items()
                ],
            }
            queue.publish("roi_occupancy", camera_id, out)

            _render_overlay(frame, detections, roi_polys, debounced, iou_threshold)
            if cv2.waitKey(1) & 0xFF == 27:  # ESC
                return


def _render_overlay(frame, detections, roi_polys, debounced, iou_thres):
    vis = frame.copy()
    # vẽ ROI
    for slot_id, poly in roi_polys.items():
        score = float(debounced.get(slot_id, 0.0))
        color = (0, 180, 0) if score >= iou_thres else (0, 140, 255)
        cv2.polylines(vis, [poly.astype(np.int32)], True, color, 2)
        # label
        x, y = int(poly[0][0]), int(poly[0][1])
        cv2.putText(
            vis,
            f"{slot_id}:{score:.2f}",
            (x, max(20, y - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 0, 0),
            3,
            cv2.LINE_AA,
        )
        cv2.putText(
            vis,
            f"{slot_id}:{score:.2f}",
            (x, max(20, y - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    # vẽ bbox
    for det in detections:
        x1, y1, x2, y2 = [int(v) for v in det["bbox_xyxy"]]
        cls = det.get("class_name", str(det.get("class_id", "?")))
        conf = float(det.get("confidence", 0))
        cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 255, 255), 2)
        cv2.putText(
            vis,
            f"{cls} {conf:.2f}",
            (x1, max(20, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 0, 0),
            3,
            cv2.LINE_AA,
        )
        cv2.putText(
            vis,
            f"{cls} {conf:.2f}",
            (x1, max(20, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 255),
            1,
            cv2.LINE_AA,
        )

    cv2.imshow("Mapper Overlay", vis)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Mapper worker: raw_detection + roi_config -> roi_occupancy + overlay")
    p.add_argument("--camera-id", type=str, default="cam-1")
    p.add_argument("--rtsp", type=str, default="rtsp://192.168.1.162:8080/h264_ulaw.sdp")
    p.add_argument("--alpha", type=float, default=0.3, help="EMA alpha (0..1)")
    p.add_argument("--iou-threshold", type=float, default=0.3, help="Ngưỡng coi là occupied")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    run_mapper(args.camera_id, args.rtsp, args.alpha, args.iou_threshold)


if __name__ == "__main__":
    main()


