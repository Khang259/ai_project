import argparse
import time
import math
import threading
import json
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional, Set
import numpy as np
import cv2
from queue_store import SQLiteQueue
from roi_visualizer import ROIVisualizer, VideoDisplayManager


class ROIProcessor:
    def __init__(self, db_path: str = "queues.db", show_video: bool = True):
        """
        Khởi tạo ROI Processor
        
        Args:
            db_path: Đường dẫn đến database SQLite
            show_video: Hiển thị video real-time
        """
        self.queue = SQLiteQueue(db_path)
        # Cache ROI theo camera_id: {camera_id: [slots]}
        self.roi_cache: Dict[str, List[Dict[str, Any]]] = {}
        # Lock để thread-safe (RLock để tránh deadlock khi tái nhập trong cùng thread)
        self.cache_lock = threading.RLock()
        # Running flag
        self.running = False
        # Video display
        self.show_video = show_video
        # Video capture cho mỗi camera
        self.video_captures: Dict[str, cv2.VideoCapture] = {}
        # Frame cache cho mỗi camera
        self.frame_cache: Dict[str, np.ndarray] = {}
        # ROI Visualizer
        self.roi_visualizer = ROIVisualizer()
        # Video Display Manager
        self.video_display_manager = VideoDisplayManager(show_video)
        # Latest detection data cho mỗi camera
        self.latest_detections: Dict[str, Dict[str, Any]] = {}
        # Latest ROI detection data cho mỗi camera (bao gồm empty)
        self.latest_roi_detections: Dict[str, Dict[str, Any]] = {}
        # Blocked ROI slots theo camera: {camera_id: {slot_number: expire_epoch}}
        self.blocked_slots: Dict[str, Dict[int, float]] = {}
        # Thời gian block mặc định (giây) - vô thời hạn, chỉ unlock khi end đạt điều kiện
        self.block_seconds: float = math.inf
        # Mapping qr_code -> (camera_id, slot_number)
        self.qr_to_slot: Dict[int, Tuple[str, int]] = {}
        # Đường dẫn file pairing config
        self.pairing_config_path: str = os.path.join("logic", "slot_pairing_config.json")
        # Tải mapping ban đầu (nếu có)
        self._load_qr_mapping()
        
        # End slot monitoring system
        # Mapping end_slot -> start_slot để theo dõi unlock
        self.end_to_start_mapping: Dict[Tuple[str, int], Tuple[str, int]] = {}
        # Trạng thái shelf của end slots: {(camera_id, slot_number): {'state': 'empty'|'shelf', 'first_shelf_time': timestamp}}
        self.end_slot_states: Dict[Tuple[str, int], Dict[str, Any]] = {}
        # Thời gian cần giữ shelf để unlock (giây)
        self.shelf_stable_time: float = 20.0

    def _load_qr_mapping(self) -> None:
        try:
            if not os.path.exists(self.pairing_config_path):
                return
            with open(self.pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            mapping: Dict[int, Tuple[str, int]] = {}
            for item in cfg.get("starts", []):
                try:
                    mapping[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
                except Exception:
                    continue
            for item in cfg.get("ends", []):
                try:
                    mapping[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
                except Exception:
                    continue
            self.qr_to_slot = mapping
            print(f"Đã load qr_to_slot: {len(self.qr_to_slot)} entries")
        except Exception as e:
            print(f"Lỗi khi load pairing config: {e}")
    
    def _setup_end_to_start_mapping(self) -> None:
        """Thiết lập mapping từ end slot đến start slot dựa trên pairs config"""
        try:
            if not os.path.exists(self.pairing_config_path):
                return
            with open(self.pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            
            # Tạo mapping từ QR code đến (camera_id, slot_number)
            qr_to_slot = {}
            for item in cfg.get("starts", []):
                try:
                    qr_to_slot[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
                except Exception:
                    continue
            for item in cfg.get("ends", []):
                try:
                    qr_to_slot[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
                except Exception:
                    continue
            
            # Tạo mapping end_slot -> start_slot từ pairs
            end_to_start = {}
            for pair in cfg.get("pairs", []):
                try:
                    start_qr = int(pair["start_qr"])
                    end_qr = int(pair["end_qrs"])
                    
                    if start_qr in qr_to_slot and end_qr in qr_to_slot:
                        start_slot = qr_to_slot[start_qr]
                        end_slot = qr_to_slot[end_qr]
                        end_to_start[end_slot] = start_slot
                except Exception:
                    continue
            
            self.end_to_start_mapping = end_to_start
            print(f"Đã thiết lập end_to_start mapping: {len(end_to_start)} pairs")
            for end_slot, start_slot in end_to_start.items():
                print(f"  End {end_slot} -> Start {start_slot}")
        except Exception as e:
            print(f"Lỗi khi thiết lập end_to_start mapping: {e}")
    
    def _add_end_slot_monitoring(self, end_qr: int) -> None:
        """Thêm end slot vào danh sách theo dõi"""
        end_slot = self.qr_to_slot.get(end_qr)
        if not end_slot:
            print(f"Không tìm thấy end slot cho QR {end_qr}")
            return
        
        camera_id, slot_number = end_slot
        
        # Khởi tạo trạng thái theo dõi cho end slot này
        with self.cache_lock:
            self.end_slot_states[end_slot] = {
                'state': 'empty',
                'first_shelf_time': None,
                'last_update_time': time.time()
            }
        
        print(f"[END_MONITOR] Bắt đầu theo dõi end slot {slot_number} trên {camera_id} (QR: {end_qr})")
    
    def _update_end_slot_state(self, camera_id: str, slot_number: int, current_state: str) -> None:
        """Cập nhật trạng thái của end slot và kiểm tra điều kiện unlock"""
        end_slot = (camera_id, slot_number)
        current_time = time.time()
        
        with self.cache_lock:
            if end_slot not in self.end_slot_states:
                return
            
            slot_state = self.end_slot_states[end_slot]
            previous_state = slot_state['state']
            
            # Cập nhật trạng thái
            slot_state['state'] = current_state
            slot_state['last_update_time'] = current_time
            
            # Xử lý chuyển đổi trạng thái
            if previous_state == 'empty' and current_state == 'shelf':
                # Chuyển từ empty -> shelf: bắt đầu đếm thời gian
                slot_state['first_shelf_time'] = current_time
                print(f"[END_MONITOR] End slot {slot_number} trên {camera_id}: empty -> shelf (bắt đầu đếm)")
            
            elif previous_state == 'shelf' and current_state == 'empty':
                # Chuyển từ shelf -> empty: reset thời gian
                slot_state['first_shelf_time'] = None
                print(f"[END_MONITOR] End slot {slot_number} trên {camera_id}: shelf -> empty (reset)")
            
            elif current_state == 'shelf' and slot_state['first_shelf_time'] is not None:
                # Đang ở trạng thái shelf: kiểm tra thời gian stable
                shelf_duration = current_time - slot_state['first_shelf_time']
                if shelf_duration >= self.shelf_stable_time:
                    # Đã giữ shelf đủ 20s: unlock start slot
                    self._unlock_start_slot(end_slot)
                    # Reset để tránh unlock nhiều lần
                    slot_state['first_shelf_time'] = None
    
    def _unlock_start_slot(self, end_slot: Tuple[str, int]) -> None:
        """Unlock start slot tương ứng với end slot"""
        start_slot = self.end_to_start_mapping.get(end_slot)
        if not start_slot:
            print(f"[UNLOCK] Không tìm thấy start slot cho end slot {end_slot}")
            return
        
        start_camera_id, start_slot_number = start_slot
        end_camera_id, end_slot_number = end_slot
        
        # Unlock start slot
        with self.cache_lock:
            if start_camera_id in self.blocked_slots:
                if start_slot_number in self.blocked_slots[start_camera_id]:
                    del self.blocked_slots[start_camera_id][start_slot_number]
                    print(f"[UNLOCK] Đã unlock start slot {start_slot_number} trên {start_camera_id} "
                          f"(do end slot {end_slot_number} trên {end_camera_id} có shelf stable {self.shelf_stable_time}s)")
                else:
                    print(f"[UNLOCK] Start slot {start_slot_number} trên {start_camera_id} không bị block")
            else:
                print(f"[UNLOCK] Camera {start_camera_id} không có slot nào bị block")
        
    def calculate_iou(self, bbox1: Dict[str, float], bbox2: Dict[str, float]) -> float:
        """
        Tính IoU giữa 2 bounding box
        
        Args:
            bbox1: Bounding box 1 {x1, y1, x2, y2}
            bbox2: Bounding box 2 {x1, y1, x2, y2}
            
        Returns:
            IoU value (0.0 - 1.0)
        """
        # Tính intersection
        x1 = max(bbox1["x1"], bbox2["x1"])
        y1 = max(bbox1["y1"], bbox2["y1"])
        x2 = min(bbox1["x2"], bbox2["x2"])
        y2 = min(bbox1["y2"], bbox2["y2"])
        
        if x2 <= x1 or y2 <= y1:
            return 0.0
        
        intersection = (x2 - x1) * (y2 - y1)
        
        # Tính area của mỗi bbox
        area1 = (bbox1["x2"] - bbox1["x1"]) * (bbox1["y2"] - bbox1["y1"])
        area2 = (bbox2["x2"] - bbox2["x1"]) * (bbox2["y2"] - bbox2["y1"])
        
        # Tính union
        union = area1 + area2 - intersection
        
        if union <= 0:
            return 0.0
        
        return intersection / union
    
    
    def is_detection_in_roi(self, detection: Dict[str, Any], roi_slots: List[Dict[str, Any]]) -> bool:
        """
        Kiểm tra detection có nằm trong ROI không (delegate to roi_visualizer)
        
        Args:
            detection: Thông tin detection
            roi_slots: Danh sách ROI slots
            
        Returns:
            True nếu detection nằm trong ít nhất 1 ROI
        """
        detection_center = detection["center"]
        
        for slot in roi_slots:
            points = slot["points"]
            if self.roi_visualizer._is_point_in_polygon((detection_center["x"], detection_center["y"]), points):
                return True
        
        return False
    
    def filter_detections_by_roi(self, detections: List[Dict[str, Any]], camera_id: str) -> List[Dict[str, Any]]:
        """
        Lọc detections theo ROI và thêm "empty" cho ROI không có shelf hoặc confidence < 0.5
        
        Args:
            detections: Danh sách detections
            camera_id: ID của camera
            
        Returns:
            Danh sách detections đã được lọc
        """
        with self.cache_lock:
            roi_slots = self.roi_cache.get(camera_id, [])
        
        if not roi_slots:
            return []
        
        # Không còn cơ chế tự hết hạn block; giữ block đến khi end đủ điều kiện để unlock

        filtered_detections = []
        roi_has_shelf = [False] * len(roi_slots)  # Track xem ROI nào có shelf (không tính ROI bị block)
        
        # Lọc detections có trong ROI và là shelf với confidence >= 0.5
        for detection in detections:
            if detection.get("class_name") == "shelf" and detection.get("confidence", 0) >= 0.5:
                for i, slot in enumerate(roi_slots):
                    if self.is_detection_in_roi(detection, [slot]):
                        # Nếu slot này đang bị block thì bỏ qua shelf này (để cuối cùng sẽ thêm empty)
                        if self.blocked_slots.get(camera_id, {}).get(i + 1):
                            # Bị block: không đánh dấu roi_has_shelf -> sẽ tạo empty
                            continue
                        # Gắn slot_number cho detection thuộc ROI i
                        detection_with_slot = dict(detection)
                        detection_with_slot["slot_number"] = i + 1
                        filtered_detections.append(detection_with_slot)
                        roi_has_shelf[i] = True
                        break
        
        # Thêm "empty" cho các ROI không có shelf hoặc confidence < 0.5
        for i, slot in enumerate(roi_slots):
            slot_number = i + 1
            # Nếu bị block hoặc không có shelf -> tạo empty
            if (slot_number) in self.blocked_slots.get(camera_id, {}) or not roi_has_shelf[i]:
                # Tạo detection "empty" cho ROI này và gắn slot_number
                empty_detection = {
                    "class_name": "empty",
                    "confidence": 1.0,
                    "class_id": -1,
                    "bbox": {
                        "x1": min(point[0] for point in slot["points"]),
                        "y1": min(point[1] for point in slot["points"]),
                        "x2": max(point[0] for point in slot["points"]),
                        "y2": max(point[1] for point in slot["points"])
                    },
                    "center": {
                        "x": sum(point[0] for point in slot["points"]) / len(slot["points"]),
                        "y": sum(point[1] for point in slot["points"]) / len(slot["points"])
                    },
                    "slot_number": slot_number,
                }
                filtered_detections.append(empty_detection)
                
                # Cập nhật trạng thái end slot nếu đang theo dõi
                self._update_end_slot_state(camera_id, slot_number, "empty")
            else:
                # Có shelf trong ROI này
                self._update_end_slot_state(camera_id, slot_number, "shelf")
        
        return filtered_detections

    def _subscribe_stable_pairs(self) -> None:
        """Subscribe topic stable_pairs để nhận start_qr và block ROI tương ứng, đồng thời theo dõi end_qr."""
        print("Bắt đầu subscribe stable_pairs để nhận lệnh block ROI và theo dõi end slot...")
        
        # Thiết lập end_to_start mapping
        self._setup_end_to_start_mapping()
        
        # track latest global id for the topic
        last_global_id: int = 0
        try:
            with self.queue._connect() as conn:
                cur = conn.execute(
                    "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                    ("stable_pairs",),
                )
                row = cur.fetchone()
                if row:
                    last_global_id = row[0]
        except Exception as e:
            print(f"Lỗi khi khởi tạo stable_pairs cursor: {e}")

        while self.running:
            try:
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        """
                        SELECT id, payload FROM messages
                        WHERE topic = ? AND id > ?
                        ORDER BY id ASC
                        LIMIT 200
                        """,
                        ("stable_pairs", last_global_id),
                    )
                    rows = cur.fetchall()
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_global_id = msg_id
                    
                    # stable_pairs payload: { pair_id, start_slot: str(start_qr), end_slot: str(end_qr), ... }
                    start_qr_str = payload.get("start_slot")
                    end_qr_str = payload.get("end_slot")
                    
                    # Xử lý start_qr (block ROI)
                    if start_qr_str:
                        try:
                            start_qr = int(start_qr_str)
                        except Exception:
                            continue
                        # Đảm bảo mapping mới nhất
                        self._load_qr_mapping()
                        cam_slot = self.qr_to_slot.get(start_qr)
                        if not cam_slot:
                            continue
                        cam_id, slot_number = cam_slot
                        expire_at = self.block_seconds  # vô thời hạn
                        with self.cache_lock:
                            if cam_id not in self.blocked_slots:
                                self.blocked_slots[cam_id] = {}
                            self.blocked_slots[cam_id][slot_number] = expire_at
                            print(f"[BLOCK] Đã block ROI slot {slot_number} trên {cam_id} (vô thời hạn) do start_qr={start_qr}")
                    
                    # Xử lý end_qr (bắt đầu theo dõi)
                    if end_qr_str:
                        try:
                            end_qr = int(end_qr_str)
                        except Exception:
                            continue
                        # Đảm bảo mapping mới nhất
                        self._load_qr_mapping()
                        # Thêm end slot vào danh sách theo dõi
                        self._add_end_slot_monitoring(end_qr)
                        
                time.sleep(0.2)
            except Exception as e:
                print(f"Lỗi khi subscribe stable_pairs: {e}")
                time.sleep(1.0)
    
    def update_roi_cache(self, camera_id: str, roi_data: Dict[str, Any]) -> None:
        """
        Cập nhật ROI cache
        
        Args:
            camera_id: ID của camera
            roi_data: Dữ liệu ROI từ queue
        """
        with self.cache_lock:
            self.roi_cache[camera_id] = roi_data.get("slots", [])
            print(f"Đã cập nhật ROI cache cho camera {camera_id}: {len(self.roi_cache[camera_id])} slots")
    
    def process_detection(self, detection_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Xử lý detection data và apply ROI filter
        
        Args:
            detection_data: Dữ liệu detection từ queue
            
        Returns:
            Dữ liệu đã được filter (luôn có kết quả cho mỗi ROI)
        """
        camera_id = detection_data["camera_id"]
        detections = detection_data["detections"]
        
        # Lọc detections theo ROI (sẽ luôn có kết quả cho mỗi ROI)
        filtered_detections = self.filter_detections_by_roi(detections, camera_id)
        
        # Tạo payload cho roi_detection_queue
        roi_detection_payload = {
            "camera_id": camera_id,
            "frame_id": detection_data["frame_id"],
            "timestamp": detection_data["timestamp"],
            "frame_shape": detection_data["frame_shape"],
            "roi_detections": filtered_detections,
            "roi_detection_count": len(filtered_detections),
            "original_detection_count": len(detections)
        }
        
        return roi_detection_payload
    
    def draw_roi_on_frame(self, frame: np.ndarray, camera_id: str) -> np.ndarray:
        """
        Vẽ ROI lên frame (delegate to roi_visualizer)
        
        Args:
            frame: Frame gốc
            camera_id: ID của camera
            
        Returns:
            Frame đã được vẽ ROI
        """
        with self.cache_lock:
            roi_slots = self.roi_cache.get(camera_id, [])
        
        return self.roi_visualizer.draw_roi_on_frame(frame, camera_id, roi_slots)
    
    def draw_detections_on_frame(self, frame: np.ndarray, detections: List[Dict[str, Any]], 
                                camera_id: str) -> np.ndarray:
        """
        Vẽ detections lên frame với highlight cho ROI detections (delegate to roi_visualizer)
        
        Args:
            frame: Frame gốc
            detections: Danh sách detections
            camera_id: ID của camera
            
        Returns:
            Frame đã được vẽ detections
        """
        with self.cache_lock:
            roi_slots = self.roi_cache.get(camera_id, [])
        
        return self.roi_visualizer.draw_detections_on_frame(frame, detections, camera_id, roi_slots)
    
    
    def get_video_capture(self, camera_id: str) -> Optional[cv2.VideoCapture]:
        """
        Lấy video capture cho camera
        
        Args:
            camera_id: ID của camera
            
        Returns:
            VideoCapture object hoặc None
        """
        if camera_id not in self.video_captures:
            # Mapping camera_id với video source tương ứng
            video_mapping = {
                "cam-1": "video/hanam.mp4",
                "cam-2": "video/vinhPhuc.mp4"
            }
            
            # Lấy video source cho camera này
            video_source = video_mapping.get(camera_id, "video/hanam.mp4")
            
            cap = cv2.VideoCapture(video_source)
            if cap.isOpened():
                self.video_captures[camera_id] = cap
                print(f"Đã kết nối video source cho camera {camera_id}: {video_source}")
            else:
                cap.release()
                print(f"Không thể kết nối video source cho camera {camera_id}: {video_source}")
                return None
        
        return self.video_captures[camera_id]
    
    def update_frame_cache(self, camera_id: str) -> bool:
        """
        Cập nhật frame cache cho camera
        
        Args:
            camera_id: ID của camera
            
        Returns:
            True nếu cập nhật thành công
        """
        cap = self.get_video_capture(camera_id)
        if cap is None:
            return False
        
        ret, frame = cap.read()
        if ret:
            self.frame_cache[camera_id] = frame
            return True
        
        return False
    
    def display_video(self) -> None:
        """
        Hiển thị video real-time với ROI và detections (delegate to video_display_manager)
        """
        self.video_display_manager.display_video(
            roi_cache=self.roi_cache,
            latest_roi_detections=self.latest_roi_detections,
            end_slot_states=self.end_slot_states,
            video_captures=self.video_captures,
            frame_cache=self.frame_cache,
            update_frame_cache_func=self.update_frame_cache
        )
    
    def subscribe_roi_config(self) -> None:
        """
        Subscribe ROI config queue và cập nhật cache
        """
        print("Bắt đầu subscribe ROI config queue...")
        
        # Lấy tất cả camera IDs đã có ROI config
        with self.queue._connect() as conn:
            cur = conn.execute(
                "SELECT DISTINCT key FROM messages WHERE topic = 'roi_config' ORDER BY key"
            )
            camera_ids = [row[0] for row in cur.fetchall()]
        
        # Load ROI config cho mỗi camera
        for camera_id in camera_ids:
            roi_data = self.queue.get_latest("roi_config", camera_id)
            if roi_data:
                self.update_roi_cache(camera_id, roi_data)
        
        print(f"Đã load ROI config cho {len(camera_ids)} cameras: {camera_ids}")
        
        # Monitor cho ROI config updates
        last_roi_ids = {}
        for camera_id in camera_ids:
            roi_data = self.queue.get_latest_row("roi_config", camera_id)
            if roi_data:
                last_roi_ids[camera_id] = roi_data["id"]
        
        while self.running:
            try:
                for camera_id in camera_ids:
                    # Kiểm tra ROI config mới
                    roi_data = self.queue.get_latest_row("roi_config", camera_id)
                    if roi_data and roi_data["id"] > last_roi_ids.get(camera_id, 0):
                        self.update_roi_cache(camera_id, roi_data["payload"])
                        last_roi_ids[camera_id] = roi_data["id"]
                
                time.sleep(1)  # Check mỗi giây
                
            except Exception as e:
                print(f"Lỗi khi subscribe ROI config: {e}")
                time.sleep(5)
    
    def subscribe_raw_detection(self) -> None:
        """
        Subscribe raw detection queue và xử lý
        """
        print("Bắt đầu subscribe raw detection queue...")
        
        # Lấy tất cả camera IDs
        with self.queue._connect() as conn:
            cur = conn.execute(
                "SELECT DISTINCT key FROM messages WHERE topic = 'raw_detection' ORDER BY key"
            )
            camera_ids = [row[0] for row in cur.fetchall()]
        
        if not camera_ids:
            print("Không tìm thấy camera nào trong raw_detection queue")
            return
        
        # Track last processed ID cho mỗi camera
        last_detection_ids = {}
        for camera_id in camera_ids:
            detection_data = self.queue.get_latest_row("raw_detection", camera_id)
            if detection_data:
                last_detection_ids[camera_id] = detection_data["id"]
        
        print(f"Đang monitor {len(camera_ids)} cameras: {camera_ids}")
        
        while self.running:
            try:
                for camera_id in camera_ids:
                    # Chỉ xử lý camera có ROI config
                    with self.cache_lock:
                        if camera_id not in self.roi_cache:
                            continue
                    
                    # Lấy detections mới
                    new_detections = self.queue.get_after_id(
                        "raw_detection", 
                        camera_id, 
                        last_detection_ids.get(camera_id, 0),
                        limit=10
                    )
                    
                    for detection_row in new_detections:
                        detection_data = detection_row["payload"]
                        last_detection_ids[camera_id] = detection_row["id"]
                        
                        # Lưu detection data để hiển thị video
                        with self.cache_lock:
                            self.latest_detections[camera_id] = detection_data
                        
                        # Xử lý detection (luôn có kết quả cho mỗi ROI)
                        roi_detection_payload = self.process_detection(detection_data)
                        
                        # Lưu ROI detection data để hiển thị video (bao gồm empty)
                        with self.cache_lock:
                            self.latest_roi_detections[camera_id] = roi_detection_payload
                        
                        # Push vào roi_detection_queue
                        self.queue.publish("roi_detection", camera_id, roi_detection_payload)
                        
                        # Đếm số shelf và empty
                        shelf_count = sum(1 for d in roi_detection_payload['roi_detections'] if d['class_name'] == 'shelf')
                        empty_count = sum(1 for d in roi_detection_payload['roi_detections'] if d['class_name'] == 'empty')
                        
                        # Hiển thị thông tin với video source
                        video_mapping = {
                            "cam-1": "hanam.mp4",
                            "cam-2": "vinhPhuc.mp4"
                        }
                        video_name = video_mapping.get(camera_id, "unknown")
                        
                        # print(f"Camera {camera_id} ({video_name}) - Frame {detection_data['frame_id']}: "
                            #   f"Shelf: {shelf_count}, Empty: {empty_count}, Total ROI: {roi_detection_payload['roi_detection_count']}")
                
                time.sleep(0.1)  # Check mỗi 100ms
                
            except Exception as e:
                print(f"Lỗi khi subscribe raw detection: {e}")
                time.sleep(1)
    
    def run(self) -> None:
        """
        Chạy ROI processor
        """
        self.running = True
        
        # Tạo threads cho ROI config, raw detection, stable_pairs và video display
        roi_thread = threading.Thread(target=self.subscribe_roi_config, daemon=True)
        detection_thread = threading.Thread(target=self.subscribe_raw_detection, daemon=True)
        stable_pairs_thread = threading.Thread(target=self._subscribe_stable_pairs, daemon=True)
        
        roi_thread.start()
        detection_thread.start()
        stable_pairs_thread.start()
        
        # Thread cho video display
        if self.show_video:
            video_thread = threading.Thread(target=self.display_video, daemon=True)
            video_thread.start()
        
        print("ROI Processor đã bắt đầu chạy...")
        if self.show_video:
            print("Video display đã được bật - Nhấn 'q' trong cửa sổ video để thoát")
        print("Nhấn Ctrl+C để dừng")
        
        # Hiển thị thông tin end slot monitoring
        if self.end_to_start_mapping:
            print(f"\nEnd Slot Monitoring System:")
            print(f"- Đang theo dõi {len(self.end_to_start_mapping)} end slots")
            print(f"- Thời gian shelf stable để unlock: {self.shelf_stable_time}s")
            print(f"- Mapping:")
            for end_slot, start_slot in self.end_to_start_mapping.items():
                print(f"  End {end_slot} -> Start {start_slot}")
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nĐang dừng ROI Processor...")
            self.running = False
        
        # Đóng video captures
        for cap in self.video_captures.values():
            cap.release()
        
        # Dừng video display manager
        self.video_display_manager.stop()
        
        print("ROI Processor đã dừng")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="ROI Processor - Filter detections by ROI")
    parser.add_argument("--db-path", type=str, default="queues.db", 
                       help="Đường dẫn đến database SQLite")
    parser.add_argument("--no-video", action="store_true", 
                       help="Tắt hiển thị video")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        processor = ROIProcessor(args.db_path, show_video=not args.no_video)
        processor.run()
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
