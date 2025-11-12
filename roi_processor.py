import argparse
import time
import math
import threading
import json
import os
import logging
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional, Set
from logging.handlers import RotatingFileHandler
import numpy as np
import cv2
from queue_store import SQLiteQueue
# from roi_visualizer import ROIVisualizer, VideoDisplayManager
from optimized_roi_visualizer import ROIVisualizer, VideoDisplayManager


def setup_block_unblock_logger(log_dir: str = "logs") -> logging.Logger:
    """Thiết lập logger cho Block/Unblock operations"""
    # Tạo thư mục logs nếu chưa có
    os.makedirs(log_dir, exist_ok=True)
    
    # Tạo logger
    logger = logging.getLogger('block_unblock')
    logger.setLevel(logging.INFO)
    
    # Tránh duplicate handlers
    if logger.handlers:
        return logger
    
    # Tạo formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler với rotating
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'block_unblock.log'),
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    # Thêm handlers vào logger
    logger.addHandler(file_handler)
    
    return logger


class ROIProcessor:
    def __init__(self, db_path: str = "queues.db", show_video: bool = True):
        """
        Khởi tạo ROI Processor
        
        Args:
            db_path: Đường dẫn đến database SQLite
            show_video: Hiển thị video real-time
        """
        print(f"Khởi tạo ROI Processor - DB: {db_path}, Show video: {show_video}")
        
        # Thiết lập logger cho block/unblock operations  
        self.block_logger = setup_block_unblock_logger()
        
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
        self.shelf_stable_time: float = 10.0
        
        # Dual blocking system
        self.dual_blocked_pairs: Dict[str, Dict[str, int]] = {}  # dual_id -> {start_qr, end_qrs}
        self.dual_end_monitoring: Dict[Tuple[str, int], str] = {}  # (camera_id, slot) -> dual_id

    def _load_qr_mapping(self) -> None:
        try:
            if not os.path.exists(self.pairing_config_path):
                print(f"File pairing config không tồn tại: {self.pairing_config_path}")
                return
                
            print(f"Bắt đầu load QR mapping từ {self.pairing_config_path}")
            with open(self.pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                
            mapping: Dict[int, Tuple[str, int]] = {}
            starts_count = 0
            ends_count = 0
            
            for item in cfg.get("starts", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    mapping[qr_code] = (camera_id, slot_number)
                    starts_count += 1
                except Exception as e:
                    print(f"Lỗi parse start item {item}: {e}")
                    continue
                    
            for item in cfg.get("ends", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    mapping[qr_code] = (camera_id, slot_number)
                    ends_count += 1
                except Exception as e:
                    print(f"Lỗi parse end item {item}: {e}")
                    continue
                    
            self.qr_to_slot = mapping
            print(f"Đã load qr_to_slot: {len(self.qr_to_slot)} entries (starts: {starts_count}, ends: {ends_count})")
            
        except Exception as e:
            print(f"Lỗi khi load pairing config: {e}")
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
                    # Kiểm tra xem đây là dual monitoring hay regular monitoring
                    if 'dual_id' in slot_state:
                        # Đây là dual monitoring: gửi dual unblock message
                        self._trigger_dual_unblock(slot_state['dual_id'], end_slot)
                    else:
                        # Đây là regular monitoring: unlock start slot
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
                    unlock_msg = f"[UNLOCK] Đã unlock start slot {start_slot_number} trên {start_camera_id} (do end slot {end_slot_number} trên {end_camera_id} có shelf stable {self.shelf_stable_time}s)"
                    self.block_logger.info(f"UNLOCK_SUCCESS: camera={start_camera_id}, slot={start_slot_number}, reason=end_slot_stable, end_camera={end_camera_id}, end_slot={end_slot_number}")
                    print(unlock_msg)
                else:
                    warn_msg = f"[UNLOCK] Start slot {start_slot_number} trên {start_camera_id} không bị block"
                    self.block_logger.warning(f"UNLOCK_FAILED: camera={start_camera_id}, slot={start_slot_number}, reason=not_blocked")
                    print(warn_msg)
            else:
                warn_msg = f"[UNLOCK] Camera {start_camera_id} không có slot nào bị block"
                self.block_logger.warning(f"UNLOCK_FAILED: camera={start_camera_id}, reason=no_blocked_slots")
                print(warn_msg)
    
    def _unlock_start_by_qr(self, start_qr: int, reason: str = "manual") -> None:
        """
        Unlock start slot theo QR code
        
        Args:
            start_qr: QR code của ô start
            reason: Lý do unlock (để log)
        """
        # Load lại mapping để đảm bảo mới nhất
        self._load_qr_mapping()
        
        # Lấy thông tin camera_id và slot_number từ QR code
        cam_slot = self.qr_to_slot.get(start_qr)
        if not cam_slot:
            print(f"[UNLOCK_FAILED] Không tìm thấy slot cho start_qr={start_qr}")
            return
        
        camera_id, slot_number = cam_slot
        
        # Unlock start slot
        with self.cache_lock:
            if camera_id in self.blocked_slots:
                if slot_number in self.blocked_slots[camera_id]:
                    del self.blocked_slots[camera_id][slot_number]
                    self.block_logger.info(f"UNLOCK_BY_QR_SUCCESS: camera={camera_id}, slot={slot_number}, qr={start_qr}, reason={reason}")
                    print(f"[UNLOCK_BY_QR] Đã unlock start slot {slot_number} trên {camera_id} "
                          f"(QR: {start_qr}, reason: {reason})")
                    
                    # Xóa end slot khỏi monitoring để tránh unlock lại
                    # Tìm end slot tương ứng với start slot này
                    start_slot_tuple = (camera_id, slot_number)
                    end_slot_to_remove = None
                    for end_slot, start_slot in self.end_to_start_mapping.items():
                        if start_slot == start_slot_tuple:
                            end_slot_to_remove = end_slot
                            break
                    
                    if end_slot_to_remove and end_slot_to_remove in self.end_slot_states:
                        del self.end_slot_states[end_slot_to_remove]
                        print(f"[UNLOCK_BY_QR] Đã xóa end slot {end_slot_to_remove} khỏi monitoring")
                else:
                    self.block_logger.warning(f"UNLOCK_BY_QR_FAILED: camera={camera_id}, slot={slot_number}, qr={start_qr}, reason=not_blocked")
                    print(f"[UNLOCK_BY_QR] Start slot {slot_number} trên {camera_id} không bị block")
            else:
                self.block_logger.warning(f"UNLOCK_BY_QR_FAILED: camera={camera_id}, qr={start_qr}, reason=no_blocked_slots")
                print(f"[UNLOCK_BY_QR] Camera {camera_id} không có slot nào bị block")
        
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
        roi_detections = [[] for _ in roi_slots]  # Track tất cả detections trong mỗi ROI (để lấy confidence)
        
        # Bước 1: Lưu TẤT CẢ detections vào roi_detections để lấy confidence (không chỉ shelf)
        for detection in detections:
            for i, slot in enumerate(roi_slots):
                if self.is_detection_in_roi(detection, [slot]):
                    # Lưu tất cả detections trong ROI (kể cả không phải shelf) để lấy confidence
                    roi_detections[i].append(detection)
                    break  # Mỗi detection chỉ thuộc 1 ROI
        
        # Bước 2: Lọc detections có trong ROI và là shelf với confidence >= 0.5
        for detection in detections:
            if detection.get("class_name") == "hang":
                for i, slot in enumerate(roi_slots):
                    if self.is_detection_in_roi(detection, [slot]):
                        # Chỉ thêm vào filtered nếu confidence >= 0.5 và không bị block
                        if detection.get("confidence", 0) >= 0.5:
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
                # Lấy confidence từ YOLO detection có confidence < 0.5 trong ROI
                # (vì nếu >= 0.5 thì đã được coi là shelf rồi)
                max_confidence = 0.0
                if roi_detections[i]:
                    # Chỉ lấy confidence từ detections có confidence < 0.5
                    low_conf_detections = [d for d in roi_detections[i] if d.get("confidence", 0.0) < 0.5]
                    if low_conf_detections:
                        max_confidence = max(d.get("confidence", 0.0) for d in low_conf_detections)
                    # Nếu không có detection nào có confidence < 0.5, giữ max_confidence = 0.0
                
                # Tạo detection "empty" cho ROI này và gắn slot_number với confidence từ YOLO
                empty_detection = {
                    "class_name": "empty",
                    "confidence": max_confidence,  # Lấy confidence từ YOLO detection thực tế
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
        """Subscribe topic stable_pairs để track end slot. KHÔNG block cho normal pairs - chỉ block cho dual."""
        print("Bắt đầu subscribe stable_pairs (KHÔNG block - chỉ track end slot cho normal pairs)...")
        
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
                    
                    # KHÔNG BLOCK cho normal pairs - CHỈ track end_slot
                    # Block chỉ áp dụng cho dual 2P và dual 4P
                    
                    pair_id = payload.get("pair_id", "")
                    if start_qr_str and end_qr_str:
                        print(f"[NORMAL_PAIR] Nhận normal pair {pair_id}: start_qr={start_qr_str} → end_qr={end_qr_str} (KHÔNG block)")
                    
                    # Xử lý end_qr (bắt đầu theo dõi) - OPTIONAL cho normal pairs
                    if end_qr_str:
                        try:
                            end_qr = int(end_qr_str)
                        except Exception:
                            continue
                        # Đảm bảo mapping mới nhất
                        self._load_qr_mapping()
                        # Thêm end slot vào danh sách theo dõi (nếu cần unlock mechanism)
                        self._add_end_slot_monitoring(end_qr)
                        
                time.sleep(0.2)
            except Exception as e:
                error_msg = f"Lỗi khi subscribe stable_pairs: {e}"
                print(error_msg)
                time.sleep(1.0)
    
    def _subscribe_unlock_start_slot(self) -> None:
        """Subscribe topic unlock_start_slot để nhận lệnh unlock ROI sau khi POST thất bại."""
        print("Bắt đầu subscribe unlock_start_slot để nhận lệnh unlock ROI...")
        
        # track latest global id for the topic
        last_global_id: int = 0
        try:
            with self.queue._connect() as conn:
                cur = conn.execute(
                    "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                    ("unlock_start_slot",),
                )
                row = cur.fetchone()
                if row:
                    last_global_id = row[0]
        except Exception as e:
            print(f"Lỗi khi khởi tạo unlock_start_slot cursor: {e}")

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
                        ("unlock_start_slot", last_global_id),
                    )
                    rows = cur.fetchall()
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_global_id = msg_id
                    
                    # unlock_start_slot payload: { pair_id, start_slot: str(start_qr), reason, timestamp }
                    start_qr_str = payload.get("start_slot")
                    reason = payload.get("reason", "unknown")
                    
                    if start_qr_str:
                        try:
                            start_qr = int(start_qr_str)
                        except Exception:
                            print(f"[UNLOCK_FAILED] Invalid start_qr: {start_qr_str}")
                            continue
                        
                        # Unlock start slot theo QR code
                        self._unlock_start_by_qr(start_qr, reason=reason)
                        
                time.sleep(0.2)
            except Exception as e:
                print(f"Lỗi khi subscribe unlock_start_slot: {e}")
                time.sleep(1.0)
    
    def _subscribe_dual_blocking(self) -> None:
        """Subscribe dual_block và dual_unblock topics để nhận lệnh block/unblock cho dual pairs."""
        print("Bắt đầu subscribe dual blocking topics...")
        
        # Track last processed IDs for both topics
        last_block_id = 0
        last_unblock_id = 0
        
        # Get latest IDs
        try:
            with self.queue._connect() as conn:
                # dual_block
                cur = conn.execute(
                    "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                    ("dual_block",),
                )
                row = cur.fetchone()
                if row:
                    last_block_id = row[0]
                
                # dual_unblock
                cur = conn.execute(
                    "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                    ("dual_unblock",),
                )
                row = cur.fetchone()
                if row:
                    last_unblock_id = row[0]
        except Exception as e:
            error_msg = f"Lỗi khi khởi tạo dual blocking cursors: {e}"
            print(error_msg)

        while self.running:
            try:
                # Process dual_block messages
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        """
                        SELECT id, payload FROM messages
                        WHERE topic = ? AND id > ?
                        ORDER BY id ASC
                        LIMIT 50
                        """,
                        ("dual_block", last_block_id),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_block_id = msg_id
                    
                    # Process dual block
                    self._handle_dual_block(payload)
                
                # Process dual_unblock messages
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        """
                        SELECT id, payload FROM messages
                        WHERE topic = ? AND id > ?
                        ORDER BY id ASC
                        LIMIT 50
                        """,
                        ("dual_unblock", last_unblock_id),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_unblock_id = msg_id
                    
                    # Process dual unblock
                    self._handle_dual_unblock(payload)
                
                time.sleep(0.2)
            except Exception as e:
                error_msg = f"Lỗi khi subscribe dual blocking: {e}"
                print(error_msg)
                time.sleep(1.0)
    
    def _handle_dual_block(self, payload: Dict[str, Any]) -> None:
        """Xử lý dual block message"""
        try:
            dual_id = payload.get("dual_id", "")
            start_qr = int(payload.get("start_qr", 0))
            end_qrs = int(payload.get("end_qrs", 0))
            
            if not dual_id or not start_qr or not end_qrs:
                print(f"Invalid dual block payload: {payload}")
                return
            
            # Load lại mapping để đảm bảo mới nhất
            self._load_qr_mapping()
            
            # Tìm camera và slot tương ứng với start_qr
            start_cam_slot = self.qr_to_slot.get(start_qr)
            if not start_cam_slot:
                print(f"Không tìm thấy slot cho start_qr={start_qr}")
                return
            
            start_camera_id, start_slot_number = start_cam_slot
            
            # Block ROI slot
            with self.cache_lock:
                if start_camera_id not in self.blocked_slots:
                    self.blocked_slots[start_camera_id] = {}
                
                self.blocked_slots[start_camera_id][start_slot_number] = math.inf  # Vô thời hạn
            
            # Lưu thông tin dual đã block
            self.dual_blocked_pairs[dual_id] = {
                "start_qr": start_qr,
                "end_qrs": end_qrs
            }
            
            # Bắt đầu monitor end_qrs
            end_cam_slot = self.qr_to_slot.get(end_qrs)
            if end_cam_slot:
                end_camera_id, end_slot_number = end_cam_slot
                self.dual_end_monitoring[(end_camera_id, end_slot_number)] = dual_id
                
                # Thêm vào end slot monitoring system (tương tự như _add_end_slot_monitoring)
                self._add_dual_end_slot_monitoring(dual_id, end_qrs)
            
            log_msg = f"[DUAL_BLOCK] Đã block ROI slot {start_slot_number} trên {start_camera_id} cho dual {dual_id} (start_qr={start_qr})"
            self.block_logger.info(f"DUAL_BLOCK_SUCCESS: dual_id={dual_id}, camera={start_camera_id}, slot={start_slot_number}, start_qr={start_qr}, end_qrs={end_qrs}")
            print(log_msg)
            
        except Exception as e:
            error_msg = f"Lỗi khi xử lý dual block: {e}"
            print(error_msg)
    
    def _handle_dual_unblock(self, payload: Dict[str, Any]) -> None:
        """Xử lý dual unblock message"""
        try:
            dual_id = payload.get("dual_id", "")
            start_qr = int(payload.get("start_qr", 0))
            
            if not dual_id or not start_qr:
                print(f"Invalid dual unblock payload: {payload}")
                return
            
            # Tìm và unblock start slot
            if dual_id in self.dual_blocked_pairs:
                # Tìm camera và slot tương ứng với start_qr
                start_cam_slot = self.qr_to_slot.get(start_qr)
                if start_cam_slot:
                    start_camera_id, start_slot_number = start_cam_slot
                    
                    # Unblock ROI slot
                    with self.cache_lock:
                        if start_camera_id in self.blocked_slots:
                            if start_slot_number in self.blocked_slots[start_camera_id]:
                                del self.blocked_slots[start_camera_id][start_slot_number]
                
                # Xóa khỏi dual blocked pairs
                del self.dual_blocked_pairs[dual_id]
                
                # Xóa khỏi end monitoring
                for (cam, slot), monitored_dual_id in list(self.dual_end_monitoring.items()):
                    if monitored_dual_id == dual_id:
                        del self.dual_end_monitoring[(cam, slot)]
                        break
                
                log_msg = f"[DUAL_UNBLOCK] Đã unblock ROI slot {start_slot_number} trên {start_camera_id} cho dual {dual_id}"
                self.block_logger.info(f"DUAL_UNBLOCK_SUCCESS: dual_id={dual_id}, camera={start_camera_id}, slot={start_slot_number}, start_qr={start_qr}")
                print(log_msg)
            else:
                print(f"Dual {dual_id} không được tìm thấy trong danh sách blocked")
        
        except Exception as e:
            error_msg = f"Lỗi khi xử lý dual unblock: {e}"
            print(error_msg)
    
    def _add_dual_end_slot_monitoring(self, dual_id: str, end_qr: int) -> None:
        """Thêm end slot vào danh sách theo dõi cho dual pair"""
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
                'last_update_time': time.time(),
                'dual_id': dual_id  # Mark đây là dual monitoring
            }
        
        print(f"[DUAL_END_MONITOR] Bắt đầu theo dõi dual end slot {slot_number} trên {camera_id} (QR: {end_qr}) cho dual {dual_id}")
    
    def _trigger_dual_unblock(self, dual_id: str, end_slot: Tuple[str, int]) -> None:
        """Gửi dual unblock message khi end slot stable shelf"""
        try:
            if dual_id not in self.dual_blocked_pairs:
                print(f"Dual {dual_id} không có trong danh sách blocked pairs")
                return
            
            blocked_info = self.dual_blocked_pairs[dual_id]
            start_qr = blocked_info["start_qr"]
            end_qrs = blocked_info["end_qrs"]
            
            # Tạo unblock payload
            unblock_payload = {
                "dual_id": dual_id,
                "start_qr": start_qr,
                "end_qrs": end_qrs,
                "action": "unblock",
                "reason": "end_shelf_stable_roi_processor",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "end_slot": f"{end_slot[0]}:{end_slot[1]}"
            }
            
            # Gửi message vào queue cho stable_pair_processor
            self.queue.publish("dual_unblock_trigger", dual_id, unblock_payload)
            
            log_msg = f"[DUAL_UNBLOCK_TRIGGER] Đã gửi unblock trigger cho dual {dual_id} (end_slot stable shelf)"
            self.block_logger.info(f"DUAL_UNBLOCK_TRIGGER: dual_id={dual_id}, end_camera={end_slot[0]}, end_slot={end_slot[1]}, start_qr={start_qr}, end_qrs={end_qrs}")
            print(log_msg)
            
        except Exception as e:
            error_msg = f"Lỗi khi gửi dual unblock trigger: {e}"
            print(error_msg)
    
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
        
        # Tạo threads cho ROI config, raw detection, stable_pairs, unlock_start_slot, dual_blocking và video display
        roi_thread = threading.Thread(target=self.subscribe_roi_config, daemon=True)
        detection_thread = threading.Thread(target=self.subscribe_raw_detection, daemon=True)
        stable_pairs_thread = threading.Thread(target=self._subscribe_stable_pairs, daemon=True)
        unlock_thread = threading.Thread(target=self._subscribe_unlock_start_slot, daemon=True)
        dual_blocking_thread = threading.Thread(target=self._subscribe_dual_blocking, daemon=True)
        
        roi_thread.start()
        detection_thread.start()
        stable_pairs_thread.start()
        unlock_thread.start()
        dual_blocking_thread.start()
        
        # Thread cho video display
        if self.show_video:
            video_thread = threading.Thread(target=self.display_video, daemon=True)
            video_thread.start()
        
        print("ROI Processor đã bắt đầu chạy...")
        
        if self.show_video:
            print("Video display đã được bật")
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
            print("\nNhận KeyboardInterrupt - Đang dừng ROI Processor...")
            print("\nĐang dừng ROI Processor...")
            self.running = False
        
        # Đóng video captures
        print(f"Đang đóng {len(self.video_captures)} video captures")
        for cap in self.video_captures.values():
            cap.release()
        
        # Dừng video display manager
        print("Dừng video display manager")
        self.video_display_manager.stop()
        
        print("ROI Processor đã dừng hoàn toàn")
        print("ROI Processor đã dừng")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="ROI Processor - Filter detections by ROI")
    parser.add_argument("--db-path", type=str, default="queues.db", 
                       help="Đường dẫn đến database SQLite")
    parser.add_argument("--no-video", action="store_true", 
                       help="Tắt hiển thị video")
    parser.add_argument("--no-cleanup", action="store_true",
                       help="Tắt tự động cleanup hàng ngày")
    
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
