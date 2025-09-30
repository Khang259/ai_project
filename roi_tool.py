import argparse
import json
import os
from datetime import datetime
from typing import List, Tuple, Dict, Any

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


def capture_one_frame(video_source: str):
    """
    Capture một frame từ video source
    
    Args:
        video_source: Đường dẫn đến file video hoặc RTSP URL
        
    Returns:
        Frame đã capture
    """
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được video source: {video_source}")
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError("Không đọc được frame từ video source")
    return frame


def load_config(config_path: str) -> Dict[str, Any]:
    """
    Đọc file config slot pairing
    
    Args:
        config_path: Đường dẫn đến file config
        
    Returns:
        Dictionary chứa nội dung config
    """
    if not os.path.exists(config_path):
        # Tạo config mới nếu file không tồn tại
        return {
            "starts": [],
            "ends": [],
            "pairs": [],
            "roi_coordinates": []
        }
    
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_config(config: Dict[str, Any], config_path: str) -> None:
    """
    Lưu config vào file
    
    Args:
        config: Dictionary chứa nội dung config
        config_path: Đường dẫn đến file config
    """
    # Tạo thư mục nếu chưa tồn tại
    dir_path = os.path.dirname(config_path)
    if dir_path:  # Chỉ tạo thư mục nếu có đường dẫn thư mục
        os.makedirs(dir_path, exist_ok=True)
    
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def update_roi_coordinates(config: Dict[str, Any], camera_id: str, polygons: List[List[Point]]) -> None:
    """
    Cập nhật tọa độ ROI vào config theo dạng points (danh sách các điểm polygon)
    
    Args:
        config: Dictionary chứa nội dung config
        camera_id: ID của camera
        polygons: Danh sách các polygon ROI
    """
    # Khởi tạo roi_coordinates nếu chưa có
    if "roi_coordinates" not in config:
        config["roi_coordinates"] = []
    
    # Xóa các tọa độ cũ của camera này
    config["roi_coordinates"] = [
        coord for coord in config["roi_coordinates"] 
        if coord.get("camera_id") != camera_id
    ]
    
    # Thêm tọa độ mới theo dạng points
    for idx, poly in enumerate(polygons):
        if len(poly) >= 3:  # Cần ít nhất 3 điểm để tạo polygon hợp lệ
            roi_coord = {
                "slot_number": idx + 1,
                "camera_id": camera_id,
                "points": [[int(x), int(y)] for (x, y) in poly],
            }
            config["roi_coordinates"].append(roi_coord)
    
    print(f"Đã cập nhật {len(polygons)} ROI coordinates cho camera {camera_id}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tool vẽ ROI theo camera")
    parser.add_argument("--camera-id", type=str, default="cam-1", help="ID camera")
    parser.add_argument(
        "--video",
        type=str,
        default="video/hanam.mp4",
        help="Đường dẫn file video đầu vào",
    )
    parser.add_argument(
        "--vinhphuc",
        action="store_true",
        help="Sử dụng video/vinhPhuc.mp4 cho camera cam-2",
    )
    parser.add_argument(
        "--config-path",
        type=str,
        default="logic/slot_pairing_config.json",
        help="Đường dẫn đến file config slot pairing",
    )
    parser.add_argument(
        "--save-coords",
        action="store_true",
        help="Lưu tọa độ ROI vào file config slot pairing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Xác định video source và camera_id
    if args.vinhphuc:
        video_source = "video/vinhPhuc.mp4"
        camera_id = "cam-2"
        print("Sử dụng video/vinhPhuc.mp4 cho camera cam-2")
    else:
        video_source = args.video
        camera_id = args.camera_id
        print(f"Sử dụng {video_source} cho camera {camera_id}")

    frame = capture_one_frame(video_source)
    drawer = RoiDrawer(frame, window_name=f"ROI - {camera_id}")
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
        "camera_id": camera_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "slots": slots,
        "image_wh": [int(frame.shape[1]), int(frame.shape[0])],
    }

    queue = SQLiteQueue("queues.db")
    queue.publish("roi_config", camera_id, payload)

    print(f"Đã lưu roi_config của {camera_id} với {len(slots)} ROI vào queue.")
    print(f"Video source: {video_source}")
    print(f"Camera ID: {camera_id}")
    
    # Lưu tọa độ ROI vào file config nếu được yêu cầu
    if args.save_coords:
        print(f"\nĐang lưu tọa độ ROI vào {args.config_path}...")
        
        # Đọc config hiện tại
        config = load_config(args.config_path)
        
        # Cập nhật tọa độ ROI
        update_roi_coordinates(config, camera_id, polygons)
        
        # Lưu config
        save_config(config, args.config_path)
        
        print(f"Đã lưu tọa độ ROI vào file config thành công!")
        print(f"Tổng số ROI coordinates: {len(config['roi_coordinates'])}")
        
        # Hiển thị tọa độ đã lưu
        print("\nTọa độ ROI đã lưu:")
        for coord in config["roi_coordinates"]:
            if coord["camera_id"] == camera_id:
                print(f"  Slot {coord['slot_number']}: points={coord['points']}")
    else:
        print("\nĐể lưu tọa độ ROI vào file config, sử dụng flag --save-coords")


if __name__ == "__main__":
    main()