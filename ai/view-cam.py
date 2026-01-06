"""
Standalone Camera Viewer - Hiển thị camera với ROI và AI detections
Có thể chọn camera cụ thể để xem hoặc xem tất cả
"""

import argparse
import cv2
import json
import os
import time
import threading
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from queue_store import SQLiteQueue
from optimized_roi_visualizer import ROIVisualizer, CameraDisplayThread


class CameraViewer:
    """Standalone camera viewer"""
    
    def __init__(self, db_path: str = "queues.db", 
                 camera_ids: Optional[List[str]] = None,
                 config_path: str = "visualizer_config.json"):
        """
        Args:
            db_path: Đường dẫn database
            camera_ids: Danh sách camera cần xem (None = tất cả)
            config_path: Đường dẫn config file
        """
        self.db_path = db_path
        self.camera_ids = camera_ids
        self.running = False
        
        # Load config
        self.config = self._load_config(config_path)
        
        # Queue
        self.queue = SQLiteQueue(db_path)
        
        # Visualizer
        self.visualizer = ROIVisualizer()
        
        # Camera URLs
        self.cam_urls: Dict[str, str] = {}
        self._load_cam_config(os.path.join("logic", "cam_config.json"))
        
        # Display threads
        self.display_threads: Dict[str, CameraDisplayThread] = {}
        
        # Local dict để share data giữa threads
        self.local_dict: Dict[str, Any] = {}
        
        # QR mapping
        self.qr_to_slot: Dict[int, Tuple[str, int]] = {}
        self._load_qr_mapping()
        
        # Blocked ROIs tracking
        self.blocked_rois: Dict[str, Dict[int, Any]] = {}
        
        # ROI cache
        self.roi_cache: Dict[str, List[Dict[str, Any]]] = {}
        
        # Latest detections
        self.latest_roi_detections: Dict[str, Dict[str, Any]] = {}
        
        # Filter cameras nếu được chỉ định
        if self.camera_ids:
            filtered_urls = {}
            for cam_id in self.camera_ids:
                if cam_id in self.cam_urls:
                    filtered_urls[cam_id] = self.cam_urls[cam_id]
                else:
                    print(f"[WARNING] Camera {cam_id} không tồn tại trong config")
            self.cam_urls = filtered_urls
            print(f"[VIEWER] Hiển thị {len(self.cam_urls)} camera: {list(self.cam_urls.keys())}")
        else:
            print(f"[VIEWER] Hiển thị tất cả {len(self.cam_urls)} camera")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load config"""
        default_config = {
            'max_workers': 4,
            'buffer_size': 1,
            'target_fps': 5,
            'max_display_resolution': 1280,
            'roi_cache_ttl': 30.0,
            'reconnect_delay': 5.0,
            'max_retry_attempts': 5
        }
        
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    default_config.update(config)
                print(f"[CONFIG] Đã load từ {config_path}")
        except Exception as e:
            print(f"[CONFIG] Sử dụng mặc định: {e}")
        
        return default_config
    
    def _load_cam_config(self, cam_config_path: str):
        """Load camera RTSP URLs"""
        try:
            if os.path.exists(cam_config_path):
                with open(cam_config_path, 'r') as f:
                    cfg = json.load(f)
                for item in cfg.get("cam_urls", []):
                    if isinstance(item, list) and len(item) >= 2:
                        self.cam_urls[str(item[0])] = str(item[1])
                print(f"[RTSP] Loaded {len(self.cam_urls)} camera URLs")
        except Exception as e:
            print(f"[RTSP] Error: {e}")
    
    def _load_qr_mapping(self):
        """Load QR to slot mapping"""
        try:
            pairing_config_path = os.path.join("logic", "slot_pairing_config.json")
            if not os.path.exists(pairing_config_path):
                return
            
            with open(pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            
            # Load tất cả starts, starts_2, ends
            for item in cfg.get("starts", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    self.qr_to_slot[qr_code] = (camera_id, slot_number)
                except Exception:
                    continue
            
            for item in cfg.get("starts_2", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    self.qr_to_slot[qr_code] = (camera_id, slot_number)
                except Exception:
                    continue
            
            for item in cfg.get("ends", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    self.qr_to_slot[qr_code] = (camera_id, slot_number)
                except Exception:
                    continue
            
            print(f"[QR] Đã load {len(self.qr_to_slot)} QR mappings")
            
        except Exception as e:
            print(f"[QR] Lỗi khi load QR mapping: {e}")
    
    def _load_roi_config_from_file(self):
        """Load ROI coordinates từ pairing config"""
        pairing_config_path = os.path.join("logic", "slot_pairing_config.json")
        if not os.path.exists(pairing_config_path):
            return
        
        try:
            with open(pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            
            roi_entries = cfg.get("roi_coordinates", [])
            if not isinstance(roi_entries, list):
                return
            
            from collections import defaultdict
            camera_slots: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
            
            for entry in roi_entries:
                camera_id = entry.get("camera_id")
                points = entry.get("points")
                slot_number = entry.get("slot_number")
                
                if not camera_id or points is None:
                    continue
                
                slot_data: Dict[str, Any] = {"points": points}
                try:
                    slot_num_int = int(slot_number)
                    slot_data["slot_number"] = slot_num_int
                except (TypeError, ValueError):
                    slot_data["slot_number"] = None
                
                camera_slots[str(camera_id)].append(slot_data)
            
            new_cache: Dict[str, List[Dict[str, Any]]] = {}
            for camera_id, slots in camera_slots.items():
                sorted_slots = sorted(
                    slots,
                    key=lambda s: s.get("slot_number") if s.get("slot_number") is not None else float("inf")
                )
                normalized_slots = [
                    {"points": slot["points"], "slot_number": slot.get("slot_number")}
                    for slot in sorted_slots
                ]
                new_cache[camera_id] = normalized_slots
            
            self.roi_cache = new_cache
            print(f"[ROI] Đã load ROI cho {len(self.roi_cache)} camera")
            
        except Exception as e:
            print(f"[ROI] Lỗi khi load ROI config: {e}")
    
    def _subscribe_roi_detections(self):
        """Subscribe roi_detection queue để lấy detections"""
        print("[DETECTIONS] Bắt đầu subscribe roi_detection...")
        
        # Lấy tất cả camera IDs từ roi_detection queue
        try:
            with self.queue._connect() as conn:
                cur = conn.execute(
                    "SELECT DISTINCT key FROM messages WHERE topic = 'roi_detection' ORDER BY key"
                )
                camera_ids = [row[0] for row in cur.fetchall()]
        except Exception as e:
            print(f"[DETECTIONS] Lỗi khi lấy camera IDs: {e}")
            return
        
        # Filter theo camera_ids nếu được chỉ định
        if self.camera_ids:
            camera_ids = [cid for cid in camera_ids if cid in self.camera_ids]
        
        # Track last processed ID cho mỗi camera
        last_detection_ids = {}
        for camera_id in camera_ids:
            detection_data = self.queue.get_latest_row("roi_detection", camera_id)
            if detection_data:
                last_detection_ids[camera_id] = detection_data["id"]
            else:
                last_detection_ids[camera_id] = 0
        
        print(f"[DETECTIONS] Đang monitor {len(camera_ids)} cameras: {camera_ids}")
        
        while self.running:
            try:
                for camera_id in camera_ids:
                    # Lấy detections mới
                    new_detections = self.queue.get_after_id(
                        "roi_detection",
                        camera_id,
                        last_detection_ids.get(camera_id, 0),
                        limit=10
                    )
                    
                    for detection_row in new_detections:
                        payload = detection_row["payload"]
                        last_detection_ids[camera_id] = detection_row["id"]
                        
                        # Lưu vào cache (CHÚ Ý: payload từ queue không có bbox/center)
                        # Cần thêm fake bbox/center để visualizer vẽ được
                        self._add_bbox_to_detections(payload, camera_id)
                        self.latest_roi_detections[camera_id] = payload
                
                time.sleep(0.1)
                
            except Exception as e:
                print(f"[DETECTIONS] Lỗi: {e}")
                time.sleep(1.0)
    
    def _add_bbox_to_detections(self, payload: Dict[str, Any], camera_id: str):
        """Thêm bbox/center cho detections dựa trên ROI (vì queue không có bbox/center)"""
        roi_slots = self.roi_cache.get(camera_id, [])
        if not roi_slots:
            return
        
        detections = payload.get("roi_detections", [])
        for detection in detections:
            slot_number = detection.get("slot_number", 0)
            if slot_number > 0 and slot_number <= len(roi_slots):
                slot = roi_slots[slot_number - 1]
                points = slot["points"]
                
                # Tạo bbox từ ROI points
                detection["bbox"] = {
                    "x1": min(point[0] for point in points),
                    "y1": min(point[1] for point in points),
                    "x2": max(point[0] for point in points),
                    "y2": max(point[1] for point in points)
                }
                
                # Tạo center từ ROI points
                detection["center"] = {
                    "x": sum(point[0] for point in points) / len(points),
                    "y": sum(point[1] for point in points) / len(points)
                }
    
    def _subscribe_all_blocking(self):
        """Subscribe tất cả block/unblock topics"""
        print("[BLOCKING] Bắt đầu subscribe blocking topics...")
        
        # Track last processed IDs
        last_ids = {
            "dual_block": 0,
            "dual_unblock": 0,
            "block_slot": 0,
            "unblock_slot": 0,
            "unlock_start_slot": 0
        }
        
        # Get latest IDs
        try:
            with self.queue._connect() as conn:
                for topic in last_ids.keys():
                    cur = conn.execute(
                        "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                        (topic,),
                    )
                    row = cur.fetchone()
                    if row:
                        last_ids[topic] = row[0]
        except Exception as e:
            print(f"[BLOCKING] Lỗi khi khởi tạo: {e}")
        
        while self.running:
            try:
                # Process dual_block
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("dual_block", last_ids["dual_block"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["dual_block"] = msg_id
                    self._handle_block(payload, "dual")
                
                # Process dual_unblock
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("dual_unblock", last_ids["dual_unblock"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["dual_unblock"] = msg_id
                    self._handle_unblock(payload, "dual")
                
                # Process block_slot
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("block_slot", last_ids["block_slot"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["block_slot"] = msg_id
                    self._handle_block(payload, "manual")
                
                # Process unblock_slot
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("unblock_slot", last_ids["unblock_slot"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["unblock_slot"] = msg_id
                    self._handle_unblock(payload, "manual")
                
                # Process unlock_start_slot
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("unlock_start_slot", last_ids["unlock_start_slot"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["unlock_start_slot"] = msg_id
                    self._handle_unblock(payload, "unlock_start")
                
                time.sleep(0.2)
                
            except Exception as e:
                print(f"[BLOCKING] Lỗi: {e}")
                time.sleep(1.0)
    
    def _handle_block(self, payload: Dict[str, Any], block_type: str):
        """Xử lý block message"""
        try:
            if block_type == "dual":
                qr_code = int(payload.get("start_qr", 0))
            else:
                qr_code = int(payload.get("qr_code", 0))
            
            cam_slot = self.qr_to_slot.get(qr_code)
            if not cam_slot:
                return
            
            camera_id, slot_number = cam_slot
            
            if camera_id not in self.blocked_rois:
                self.blocked_rois[camera_id] = {}
            
            self.blocked_rois[camera_id][slot_number] = {
                "type": block_type,
                "blocked_at": time.time()
            }
            
            print(f"[BLOCKING] Blocked {camera_id}:slot_{slot_number} ({block_type})")
            
        except Exception as e:
            print(f"[BLOCKING] Lỗi block: {e}")
    
    def _handle_unblock(self, payload: Dict[str, Any], unblock_type: str):
        """Xử lý unblock message"""
        try:
            if unblock_type == "dual":
                qr_code = int(payload.get("start_qr", 0))
            elif unblock_type == "unlock_start":
                qr_code = int(payload.get("start_slot", 0))
            else:
                qr_code = int(payload.get("qr_code", 0))
            
            cam_slot = self.qr_to_slot.get(qr_code)
            if not cam_slot:
                return
            
            camera_id, slot_number = cam_slot
            
            if camera_id in self.blocked_rois:
                if slot_number in self.blocked_rois[camera_id]:
                    del self.blocked_rois[camera_id][slot_number]
                    print(f"[BLOCKING] Unblocked {camera_id}:slot_{slot_number} ({unblock_type})")
            
        except Exception as e:
            print(f"[BLOCKING] Lỗi unblock: {e}")
    
    def _update_local_dict(self):
        """Update local_dict để share với display threads"""
        try:
            # Update ROI cache
            for camera_id, roi_slots in self.roi_cache.items():
                self.local_dict[f'{camera_id}_roi'] = roi_slots
            
            # Update detections
            for camera_id, roi_det_data in self.latest_roi_detections.items():
                self.local_dict[f'{camera_id}_detections'] = roi_det_data
            
            # Update blocked ROIs
            for camera_id, blocked_slots in self.blocked_rois.items():
                self.local_dict[f'{camera_id}_blocked'] = blocked_slots
        
        except Exception as e:
            print(f"[UPDATE] Lỗi: {e}")
    
    def run(self):
        """Chạy viewer"""
        self.running = True
        
        # Load ROI config
        self._load_roi_config_from_file()
        
        # Khởi động display threads
        target_fps = self.config.get('target_fps', 10)
        max_retry = self.config.get('max_retry_attempts', 5)
        
        for camera_id, rtsp_url in self.cam_urls.items():
            thread = CameraDisplayThread(
                camera_id=camera_id,
                rtsp_url=rtsp_url,
                local_dict=self.local_dict,
                config=self.config,
                visualizer=self.visualizer,
                max_retry_attempts=max_retry,
                target_fps=target_fps
            )
            self.display_threads[camera_id] = thread
            thread.start()
            print(f"[DISPLAY] Khởi động thread {camera_id}")
        
        # Khởi động subscription threads
        detection_thread = threading.Thread(target=self._subscribe_roi_detections, daemon=True)
        blocking_thread = threading.Thread(target=self._subscribe_all_blocking, daemon=True)
        
        detection_thread.start()
        blocking_thread.start()
        
        print("\n" + "="*60)
        print(f"Camera Viewer đang chạy - Hiển thị {len(self.cam_urls)} camera")
        print("Nhấn 'q' trong cửa sổ video để thoát")
        print("Hoặc nhấn Ctrl+C")
        print("="*60 + "\n")
        
        # Main loop - update local_dict
        try:
            while self.running:
                self._update_local_dict()
                
                # Check thread health
                for cam_id, thread in list(self.display_threads.items()):
                    if not thread.is_alive() and self.running:
                        if cam_id in self.cam_urls:
                            new_thread = CameraDisplayThread(
                                camera_id=cam_id,
                                rtsp_url=self.cam_urls[cam_id],
                                local_dict=self.local_dict,
                                config=self.config,
                                visualizer=self.visualizer,
                                max_retry_attempts=max_retry,
                                target_fps=target_fps
                            )
                            self.display_threads[cam_id] = new_thread
                            new_thread.start()
                            print(f"[DISPLAY] Restart thread {cam_id}")
                
                time.sleep(0.1)
        
        except KeyboardInterrupt:
            print("\nĐang dừng viewer...")
        finally:
            self.stop()
    
    def stop(self):
        """Dừng viewer"""
        self.running = False
        
        # Dừng tất cả display threads
        for camera_id, thread in self.display_threads.items():
            thread.stop()
        
        # Đợi threads kết thúc
        for camera_id, thread in self.display_threads.items():
            thread.join(timeout=1.0)
        
        cv2.destroyAllWindows()
        print("Viewer đã dừng")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Camera Viewer - Hiển thị camera với ROI và AI detections",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ sử dụng:
  # Xem tất cả camera
  python view-cam.py
  
  # Xem camera cụ thể
  python view-cam.py --cameras cam-1
  
  # Xem nhiều camera
  python view-cam.py --cameras cam-1 cam-2
  
  # Chỉ định database khác
  python view-cam.py --db-path /path/to/queues.db --cameras cam-1
        """
    )
    
    parser.add_argument(
        "--db-path",
        type=str,
        default="queues.db",
        help="Đường dẫn đến database SQLite (mặc định: queues.db)"
    )
    
    parser.add_argument(
        "--cameras",
        type=str,
        nargs="+",
        help="Danh sách camera cần xem (mặc định: tất cả). VD: --cameras cam-1 cam-2"
    )
    
    parser.add_argument(
        "--config",
        type=str,
        default="visualizer_config.json",
        help="Đường dẫn config file (mặc định: visualizer_config.json)"
    )
    
    return parser.parse_args()


def main():
    """Main function"""
    args = parse_args()
    
    try:
        viewer = CameraViewer(
            db_path=args.db_path,
            camera_ids=args.cameras,
            config_path=args.config
        )
        viewer.run()
    except Exception as e:
        print(f"Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

