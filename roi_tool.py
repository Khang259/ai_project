import argparse
from datetime import datetime
from typing import List, Tuple

import cv2

from queue_store import SQLiteQueue


Point = Tuple[int, int]


class RoiDrawer:
    def __init__(self, image, window_name: str = "ROI Tool") -> None:
        self.image = image
        self.clone = image.copy()
        self.window_name = window_name
        # danh sách ROI dạng hình chữ nhật, lưu dưới dạng polygon 4 điểm (clockwise)
        self.rect_polygons: List[List[Point]] = []
        # điểm bắt đầu khi kéo
        self.drag_start: Point | None = None
        # điểm hiện tại khi đang kéo (preview)
        self.drag_current: Point | None = None
        self._install_callbacks()

    def _install_callbacks(self) -> None:
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, 1280, 720)
        cv2.setMouseCallback(self.window_name, self._mouse_cb)

    def _mouse_cb(self, event, x, y, flags, param) -> None:
        if event == cv2.EVENT_LBUTTONDOWN:
            self.drag_start = (x, y)
            self.drag_current = (x, y)
            self._redraw()
        elif event == cv2.EVENT_MOUSEMOVE and self.drag_start is not None:
            self.drag_current = (x, y)
            self._redraw()
        elif event == cv2.EVENT_LBUTTONUP and self.drag_start is not None:
            x1, y1 = self.drag_start
            x2, y2 = x, y
            poly = self._rect_to_polygon(x1, y1, x2, y2)
            if poly is not None:
                self.rect_polygons.append(poly)
            self.drag_start = None
            self.drag_current = None
            self._redraw()

    def _rect_to_polygon(self, x1: int, y1: int, x2: int, y2: int) -> List[Point] | None:
        h, w = self.clone.shape[:2]
        x1 = max(0, min(w - 1, x1))
        y1 = max(0, min(h - 1, y1))
        x2 = max(0, min(w - 1, x2))
        y2 = max(0, min(h - 1, y2))
        if abs(x2 - x1) < 2 or abs(y2 - y1) < 2:
            return None
        left, right = (x1, x2) if x1 <= x2 else (x2, x1)
        top, bottom = (y1, y2) if y1 <= y2 else (y2, y1)
        # thứ tự: TL -> TR -> BR -> BL
        return [(left, top), (right, top), (right, bottom), (left, bottom)]

    def _redraw(self) -> None:
        self.image = self.clone.copy()
        # vẽ các rectangle đã hoàn thành
        for poly in self.rect_polygons:
            cv2.polylines(self.image, [self._to_np(poly)], True, (0, 255, 0), 2)
            self._draw_vertices(poly, (0, 255, 0))
        # vẽ rectangle đang kéo
        if self.drag_start is not None and self.drag_current is not None:
            preview = self._rect_to_polygon(
                self.drag_start[0], self.drag_start[1], self.drag_current[0], self.drag_current[1]
            )
            if preview is not None:
                cv2.polylines(self.image, [self._to_np(preview)], True, (0, 200, 255), 2)
                self._draw_vertices(preview, (0, 200, 255))
        self._put_help()
        cv2.imshow(self.window_name, self.image)

    @staticmethod
    def _to_np(poly: List[Point]):
        import numpy as np

        return np.array(poly, dtype=np.int32)

    def _draw_vertices(self, poly: List[Point], color) -> None:
        for p in poly:
            cv2.circle(self.image, p, 4, color, -1)

    def _put_help(self) -> None:
        lines = [
            "Kéo-thả chuột trái: vẽ hình chữ nhật",
            "z: undo ROI | r: reset | s: lưu | ESC: thoát",
        ]
        y = 25
        for line in lines:
            cv2.putText(
                self.image,
                line,
                (15, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 0),
                3,
                cv2.LINE_AA,
            )
            cv2.putText(
                self.image,
                line,
                (15, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
            y += 28

    def run(self) -> List[List[Point]]:
        self._redraw()
        while True:
            key = cv2.waitKey(20) & 0xFF
            if key == 27:  # ESC
                break
            elif key == ord("z"):  # undo ROI
                if len(self.rect_polygons) > 0:
                    self.rect_polygons.pop()
                self._redraw()
            elif key == ord("r"):  # reset
                self.rect_polygons.clear()
                self.drag_start = None
                self.drag_current = None
                self._redraw()
            elif key == ord("s"):  # save
                break
        cv2.destroyWindow(self.window_name)
        return self.rect_polygons


def capture_one_frame(rtsp_url: str):
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được RTSP: {rtsp_url}")
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError("Không đọc được frame từ RTSP")
    return frame


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tool vẽ ROI theo camera")
    parser.add_argument("--camera-id", type=str, default="cam-1", help="ID camera")
    parser.add_argument(
        "--rtsp",
        type=str,
        default="rtsp://192.168.1.162:8080/h264_ulaw.sdp",
        help="RTSP URL của camera",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    frame = capture_one_frame(args.rtsp)
    drawer = RoiDrawer(frame, window_name=f"ROI - {args.camera_id}")
    polygons = drawer.run()

    # Chuẩn hoá payload
    slots = []
    for idx, poly in enumerate(polygons):
        slots.append(
            {
                "slot_id": f"slot-{idx+1}",
                "points": [[int(x), int(y)] for (x, y) in poly],
            }
        )

    payload = {
        "camera_id": args.camera_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "slots": slots,
        "image_wh": [int(frame.shape[1]), int(frame.shape[0])],
    }

    queue = SQLiteQueue("queues.db")
    queue.publish("roi_config", args.camera_id, payload)

    print(f"Đã lưu roi_config của {args.camera_id} với {len(slots)} ROI vào queue.")


if __name__ == "__main__":
    main()


