import argparse
import json
import os
from datetime import datetime
from typing import List, Tuple, Dict, Any
import cv2
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
        cv2.resizeWindow(self.window_name, 640, 360)
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
            "z: undo | r: reset | s: save | ESC: exit",
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


def load_cam_config(cam_config_path: str) -> Dict[str, str]:
    """
    Đọc file config camera để lấy mapping camera_id -> RTSP URL
    
    Args:
        cam_config_path: Đường dẫn đến file camera_config.json
        
    Returns:
        Dictionary mapping camera_id -> RTSP URL
    """
    if not os.path.exists(cam_config_path):
        raise FileNotFoundError(f"Không tìm thấy file cam config: {cam_config_path}")
    
    with open(cam_config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    if "cameras" not in config:
        raise ValueError(f"Format không hợp lệ trong {cam_config_path}. Cần có key 'cameras'")
    
    cam_dict = {}
    cameras = config.get("cameras", [])
    
    for cam in cameras:
        if isinstance(cam, dict) and "name" in cam and "url" in cam:
            # Chỉ lấy camera enabled
            if cam.get("enabled", True):
                cam_dict[cam["name"]] = cam["url"]
    
    print(f"✓ Load {len(cam_dict)} camera từ {cam_config_path}")
    return cam_dict


def load_config(config_path: str) -> Dict[str, Any]:
    """
    Đọc file config slot pairing
    
    Args:
        config_path: Đường dẫn đến file config
        
    Returns:
        Dictionary chứa nội dung config
    """
    if not os.path.exists(config_path):
        # Deprecated: đã loại bỏ sử dụng slot_pairing_config.json
        return {}


def load_roi_config(roi_config_path: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Đọc file config ROI theo cấu trúc mới
    
    Args:
        roi_config_path: Đường dẫn đến file roi_config.json
        
    Returns:
        Dictionary chứa ROI config theo format:
        {
            "camera_id": [
                {"slot_id": "ROI_1", "rect": [x, y, w, h]},
                ...
            ]
        }
    """
    if not os.path.exists(roi_config_path):
        return {}
    
    with open(roi_config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_config(config: Dict[str, Any], config_path: str) -> None:
    """
    Deprecated: Đã loại bỏ ghi slot_pairing_config.json
    """
    return


def save_roi_config(roi_config: Dict[str, List[Dict[str, Any]]], roi_config_path: str) -> None:
    """
    Lưu ROI config vào file JSON
    
    Args:
        roi_config: Dictionary chứa ROI config theo format mới
        roi_config_path: Đường dẫn đến file roi_config.json
    """
    # Tạo thư mục nếu chưa tồn tại
    dir_path = os.path.dirname(roi_config_path)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)
    
    with open(roi_config_path, 'w', encoding='utf-8') as f:
        json.dump(roi_config, f, indent=2, ensure_ascii=False)


def polygon_to_rect(polygon: List[Point], 
                    original_size: Tuple[int, int] = None,
                    target_size: Tuple[int, int] = (640, 360)) -> List[int]:
    """
    Chuyển đổi polygon thành rect format [x, y, w, h] và scale về kích thước target
    
    Args:
        polygon: Danh sách các điểm của polygon
        original_size: Kích thước frame gốc (width, height). Nếu None, không scale
        target_size: Kích thước đích để scale tọa độ (width, height). Mặc định: (640, 360)
        
    Returns:
        Rect dạng [x, y, w, h] với x,y là góc trên trái, w,h là width và height (đã scale)
    """
    if len(polygon) < 2:
        return [0, 0, 0, 0]
    
    # Tìm bounding box của polygon
    x_coords = [point[0] for point in polygon]
    y_coords = [point[1] for point in polygon]
    
    min_x = min(x_coords)
    max_x = max(x_coords)
    min_y = min(y_coords)
    max_y = max(y_coords)
    
    width = max_x - min_x
    height = max_y - min_y
    
    # Scale tọa độ nếu cần
    if original_size is not None and target_size is not None:
        orig_w, orig_h = original_size
        target_w, target_h = target_size
        
        scale_x = target_w / orig_w
        scale_y = target_h / orig_h
        
        min_x = int(min_x * scale_x)
        min_y = int(min_y * scale_y)
        width = int(width * scale_x)
        height = int(height * scale_y)
    
    return [min_x, min_y, width, height]


def update_roi_coordinates(config: Dict[str, Any], camera_id: str, polygons: List[List[Point]]) -> None:
    """
    Deprecated: Đã loại bỏ cập nhật slot_pairing_config.json
    """
    return


def list_available_cameras(cam_config_path: str) -> None:
    """
    Hiển thị danh sách camera có sẵn trong config
    
    Args:
        cam_config_path: Đường dẫn đến file cam_config.json
    """
    try:
        cam_config = load_cam_config(cam_config_path)
        print("Danh sách camera có sẵn:")
        for cam_id, rtsp_url in cam_config.items():
            print(f"  {cam_id}: {rtsp_url}")
    except Exception as e:
        print(f"Không thể load camera config: {e}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Tool vẽ ROI theo camera")
    
    # Group cho camera selection (chỉ dùng RTSP qua camera_id hoặc liệt kê)
    camera_group = parser.add_mutually_exclusive_group(required=True)
    camera_group.add_argument(
        "--cam", 
        type=str, 
        help="ID camera dùng RTSP theo detectObject/camera_config.json (ví dụ: cam-1)"
    )
    camera_group.add_argument(
        "--list-cameras",
        action="store_true",
        help="Hiển thị danh sách camera có sẵn và thoát",
    )
    
    parser.add_argument(
        "--cam-config-path",
        type=str,
        default="detectObject/camera_config.json",
        help="Đường dẫn đến file config camera RTSP (mặc định: detectObject/camera_config.json)",
    )
    parser.add_argument(
        "--save",
        action="store_true",
        help="Lưu ROI vào logic/roi_config.json (mặc định)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Xử lý list cameras
    if args.list_cameras:
        list_available_cameras(args.cam_config_path)
        return

    # Xác định video source (RTSP) và camera_id
    video_source = None
    camera_id = None
    
    if args.cam:
        # Sử dụng camera từ RTSP config
        try:
            cam_config = load_cam_config(args.cam_config_path)
            camera_id = args.cam
            
            if camera_id not in cam_config:
                available_cams = list(cam_config.keys())
                raise ValueError(f"Camera {camera_id} không tồn tại trong config. "
                               f"Các camera có sẵn: {available_cams}")
            
            video_source = cam_config[camera_id]
            print(f"Sử dụng RTSP stream cho camera {camera_id}: {video_source}")
            
        except Exception as e:
            print(f"Lỗi khi load camera config: {e}")
            return
    
    if not video_source or not camera_id:
        print("Lỗi: Không xác định được video source hoặc camera_id")
        return

    try:
        frame = capture_one_frame(video_source)
        drawer = RoiDrawer(frame, window_name=f"ROI - {camera_id}")
        polygons = drawer.run()
    except Exception as e:
        print(f"Lỗi khi capture frame từ {video_source}: {e}")
        return

    # Lấy kích thước frame gốc
    frame_h, frame_w = frame.shape[:2]
    original_size = (frame_w, frame_h)
    target_size = (640, 360)  # Kích thước AI input
    
    print(f"\nKích thước frame gốc: {frame_w}x{frame_h}")
    print(f"Kích thước target (AI input): {target_size[0]}x{target_size[1]}")
    
    # Đọc ROI config hiện tại
    roi_config_path = "logic/roi_config.json"
    roi_config = load_roi_config(roi_config_path)
    
    # Chuẩn hoá ROI data theo format mới (scale về target size)
    roi_list = []
    for idx, poly in enumerate(polygons):
        # Lưu tọa độ gốc (trước khi scale)
        rect_original = polygon_to_rect(poly, original_size=None, target_size=None)
        
        # Scale về target size
        rect_scaled = polygon_to_rect(poly, original_size=original_size, target_size=target_size)
        
        roi_list.append({
            "slot_id": f"{idx+1}",
            "rect": rect_scaled  # Lưu tọa độ đã scale
        })
        
        print(f"\n{idx+1}:")
        print(f"  Tọa độ gốc ({frame_w}x{frame_h}): [x:{rect_original[0]}, y:{rect_original[1]}, w:{rect_original[2]}, h:{rect_original[3]}]")
        print(f"  Tọa độ scaled ({target_size[0]}x{target_size[1]}): [x:{rect_scaled[0]}, y:{rect_scaled[1]}, w:{rect_scaled[2]}, h:{rect_scaled[3]}]")
    
    # Cập nhật ROI config cho camera này
    roi_config[camera_id] = roi_list
    
    # Lưu ROI config nếu có cờ --save
    if args.save:
        save_roi_config(roi_config, roi_config_path)

    if args.save:
        print(f"\n{'='*60}")
        print(f"✓ Đã lưu roi_config của {camera_id} với {len(roi_list)} ROI")
        print(f"✓ File: {roi_config_path}")
        print(f"✓ Tọa độ đã được scale về {target_size[0]}x{target_size[1]} (AI input size)")
        print(f"{'='*60}")
    else:
        print("\n(Bạn chưa dùng --save, ROI sẽ không được ghi ra file. Dùng --save để lưu.)")
    
    # Hiển thị ROI đã lưu (scaled)
    print(f"\nROI đã lưu (scaled coordinates):")
    for roi in roi_list:
        rect = roi["rect"]
        print(f"  {roi['slot_id']}: rect=[x:{rect[0]}, y:{rect[1]}, w:{rect[2]}, h:{rect[3]}]")
    
    # Đã loại bỏ lưu toạ độ ROI vào slot_pairing_config.json


if __name__ == "__main__":
    main()


    