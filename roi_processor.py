import argparse
import time
import math
import threading
import json
import os
import logging
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional, Set
from logging.handlers import RotatingFileHandler
from queue_store import SQLiteQueue


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
    def __init__(self, db_path: str = "queues.db"):
        """
        Khởi tạo ROI Processor
        
        Args:
            db_path: Đường dẫn đến database SQLite
        """
        print(f"Khởi tạo ROI Processor - DB: {db_path}")
        
        # Thiết lập logger cho block/unblock operations  
        self.block_logger = setup_block_unblock_logger()
        
        self.queue = SQLiteQueue(db_path)
        # Cache ROI theo camera_id: {camera_id: [slots]}
        self.roi_cache: Dict[str, List[Dict[str, Any]]] = {}
        # Lock để thread-safe (RLock để tránh deadlock khi tái nhập trong cùng thread)
        self.cache_lock = threading.RLock()
        # Running flag
        self.running = False
        # Blocked ROI slots theo camera với ownership tracking
        # {camera_id: {slot_number: {'expire_time': float, 'owner_qr': int, 'block_reason': str, 'block_time': float}}}
        self.blocked_slots: Dict[str, Dict[int, Dict[str, Any]]] = {}
        # Thời gian block mặc định (giây) - vô thời hạn, chỉ unlock khi end đạt điều kiện
        self.block_seconds: float = math.inf
        # Mapping qr_code -> (camera_id, slot_number)
        self.qr_to_slot: Dict[int, Tuple[str, int]] = {}
        # Đường dẫn file pairing config
        self.pairing_config_path: str = os.path.join("logic", "slot_pairing_config.json")
        self._roi_config_mtime: Optional[float] = None
        # Tải mapping ban đầu (nếu có)
        self._load_qr_mapping()
        # Tải ROI config ban đầu (nếu có)
        self._load_roi_config_from_file()
        try:
            self._roi_config_mtime = os.path.getmtime(self.pairing_config_path)
        except OSError:
            self._roi_config_mtime = None
        
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
        
        # Force refresh detection cache: {camera_id: timestamp}
        self.force_refresh_cameras: Dict[str, float] = {}

    def _load_qr_mapping(self) -> None:
        try:
            if not os.path.exists(self.pairing_config_path):
                print(f"File pairing config không tồn tại: {self.pairing_config_path}")
                return
                
            print(f"Bắt đầu load QR mapping từ {self.pairing_config_path}")
            with open(self.pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                
            mapping: Dict[int, Tuple[str, int]] = {}
            # starts_count = 0
            # ends_count = 0
            
            for item in cfg.get("starts", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    mapping[qr_code] = (camera_id, slot_number)
                    # starts_count += 1
                except Exception as e:
                    print(f"Lỗi parse start item {item}: {e}")
                    continue
                    
            # for item in cfg.get("ends", []):
            #     try:
            #         qr_code = int(item["qr_code"])
            #         camera_id = str(item["camera_id"])
            #         slot_number = int(item["slot_number"])
            #         mapping[qr_code] = (camera_id, slot_number)
            #         ends_count += 1
            #     except Exception as e:
            #         print(f"Lỗi parse end item {item}: {e}")
            #         continue
                    
            self.qr_to_slot = mapping
            # print(f"Đã load qr_to_slot: {len(self.qr_to_slot)} entries (starts: {starts_count}, ends: {ends_count})")
            
        except Exception as e:
            print(f"Lỗi khi load pairing config: {e}")
            # print(f"Lỗi khi load pairing config: {e}")
    
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
            # for item in cfg.get("ends", []):
            #     try:
            #         qr_to_slot[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
            #     except Exception:
            #         continue
            
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
    
    def _unlock_start_by_qr(self, start_qr: int, reason: str = "manual") -> None:
        """
        Unlock start slot theo QR code (dùng cho unlock sau khi POST thất bại)
        Tương tự _unblock_slot_by_qr nhưng dành riêng cho stable_pair flow
        
        Args:
            start_qr: QR code của ô start
            reason: Lý do unlock (để log)
        """
        # Sử dụng lại logic đã cải thiện của _unblock_slot_by_qr
        self._unblock_slot_by_qr(start_qr, reason=reason)
        
    # def calculate_iou(self, bbox1: Dict[str, float], bbox2: Dict[str, float]) -> float:
    #     """
    #     Tính IoU giữa 2 bounding box
        
    #     Args:
    #         bbox1: Bounding box 1 {x1, y1, x2, y2}
    #         bbox2: Bounding box 2 {x1, y1, x2, y2}
            
    #     Returns:
    #         IoU value (0.0 - 1.0)
    #     """
    #     # Tính intersection
    #     x1 = max(bbox1["x1"], bbox2["x1"])
    #     y1 = max(bbox1["y1"], bbox2["y1"])
    #     x2 = min(bbox1["x2"], bbox2["x2"])
    #     y2 = min(bbox1["y2"], bbox2["y2"])
        
    #     if x2 <= x1 or y2 <= y1:
    #         return 0.0
        
    #     intersection = (x2 - x1) * (y2 - y1)
        
    #     # Tính area của mỗi bbox
    #     area1 = (bbox1["x2"] - bbox1["x1"]) * (bbox1["y2"] - bbox1["y1"])
    #     area2 = (bbox2["x2"] - bbox2["x1"]) * (bbox2["y2"] - bbox2["y1"])
        
    #     # Tính union
    #     union = area1 + area2 - intersection
        
    #     if union <= 0:
    #         return 0.0
        
    #     return intersection / union
    
    
    def is_detection_in_roi(self, detection: Dict[str, Any], roi_slots: List[Dict[str, Any]]) -> bool:
        """
        Kiểm tra detection có nằm trong ROI không
        
        Args:
            detection: Thông tin detection
            roi_slots: Danh sách ROI slots
            
        Returns:
            True nếu detection nằm trong ít nhất 1 ROI
        """
        detection_center = detection["center"]
        
        for slot in roi_slots:
            points = slot["points"]
            if self._is_point_in_polygon((detection_center["x"], detection_center["y"]), points):
                return True
        
        return False
    
    def _is_point_in_polygon(self, point: Tuple[float, float], polygon: List[List[int]]) -> bool:
        """Kiểm tra điểm có nằm trong polygon không"""
        x, y = point
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
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
            
            # Kiểm tra xem camera này có cần force refresh không
            force_refresh = False
            if camera_id in self.force_refresh_cameras:
                # Chỉ force refresh trong 2 giây sau khi unblock
                if time.time() - self.force_refresh_cameras[camera_id] < 2.0:
                    force_refresh = True
                else:
                    # Xóa flag sau 2 giây
                    del self.force_refresh_cameras[camera_id]
        
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
                            slot_number = i + 1
                            is_blocked = self.blocked_slots.get(camera_id, {}).get(slot_number)
                            
                            # FORCE REFRESH: Nếu camera được đánh dấu force refresh, bỏ qua check block
                            if is_blocked and not force_refresh:
                                # Bị block và KHÔNG force refresh: không đánh dấu roi_has_shelf -> sẽ tạo empty
                                continue
                            
                            # Gắn slot_number cho detection thuộc ROI i
                            detection_with_slot = dict(detection)
                            detection_with_slot["slot_number"] = slot_number
                            filtered_detections.append(detection_with_slot)
                            roi_has_shelf[i] = True
                            
                            # Log nếu force refresh đang active
                            if force_refresh and is_blocked:
                                print(f"[FORCE_REFRESH] Slot {slot_number} trên {camera_id} đang bị block nhưng vẫn xử lý shelf do force refresh")
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
                        # self._add_end_slot_monitoring(end_qr)
                        
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
    
    def _subscribe_block_unblock_slot(self) -> None:
        """Subscribe block_slot và unblock_slot topics để nhận lệnh block/unblock thủ công cho một QR code."""
        print("Bắt đầu subscribe block_slot và unblock_slot topics...")
        
        # Track last processed IDs
        last_block_id = 0
        last_unblock_id = 0
        
        # Get latest IDs
        try:
            with self.queue._connect() as conn:
                # block_slot
                cur = conn.execute(
                    "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                    ("block_slot",),
                )
                row = cur.fetchone()
                if row:
                    last_block_id = row[0]
                
                # unblock_slot
                cur = conn.execute(
                    "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                    ("unblock_slot",),
                )
                row = cur.fetchone()
                if row:
                    last_unblock_id = row[0]
        except Exception as e:
            print(f"Lỗi khi khởi tạo block/unblock slot cursors: {e}")
        
        while self.running:
            try:
                # Process block_slot messages
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        """
                        SELECT id, payload FROM messages
                        WHERE topic = ? AND id > ?
                        ORDER BY id ASC
                        LIMIT 50
                        """,
                        ("block_slot", last_block_id),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_block_id = msg_id
                    
                    # Process block slot
                    qr_code = payload.get("qr_code")
                    if qr_code:
                        try:
                            qr_code_int = int(qr_code)
                            self._block_slot_by_qr(qr_code_int, reason=payload.get("reason", "manual_api"))
                        except Exception as e:
                            print(f"[BLOCK_SLOT_FAILED] Invalid qr_code: {qr_code}, error: {e}")
                
                # Process unblock_slot messages
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        """
                        SELECT id, payload FROM messages
                        WHERE topic = ? AND id > ?
                        ORDER BY id ASC
                        LIMIT 50
                        """,
                        ("unblock_slot", last_unblock_id),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_unblock_id = msg_id
                    
                    # Process unblock slot
                    qr_code = payload.get("qr_code")
                    if qr_code:
                        try:
                            qr_code_int = int(qr_code)
                            self._unblock_slot_by_qr(qr_code_int, reason=payload.get("reason", "manual_api"))
                        except Exception as e:
                            print(f"[UNBLOCK_SLOT_FAILED] Invalid qr_code: {qr_code}, error: {e}")
                
                time.sleep(0.2)
            except Exception as e:
                print(f"Lỗi khi subscribe block/unblock slot: {e}")
                time.sleep(1.0)
    
    def _block_slot_by_qr(self, qr_code: int, reason: str = "manual") -> None:
        """
        Block slot theo QR code và lưu ownership
        Chỉ block thủ công, không tạo dual monitoring
        """
        try:
            # Load lại mapping để đảm bảo mới nhất
            self._load_qr_mapping()
            
            # Tìm camera và slot từ QR code
            cam_slot = self.qr_to_slot.get(qr_code)
            if not cam_slot:
                print(f"[BLOCK_FAILED] Không tìm thấy slot cho QR code={qr_code}")
                self.block_logger.warning(f"BLOCK_SLOT_FAILED: qr_code={qr_code}, reason=qr_not_found")
                return
            
            camera_id, slot_number = cam_slot
            
            # Block ROI slot với ownership tracking
            with self.cache_lock:
                if camera_id not in self.blocked_slots:
                    self.blocked_slots[camera_id] = {}
                
                was_blocked = slot_number in self.blocked_slots[camera_id]
                old_owner = self.blocked_slots[camera_id].get(slot_number, {}).get('owner_qr') if was_blocked else None
                
                # Lưu thông tin block với QR owner
                self.blocked_slots[camera_id][slot_number] = {
                    'expire_time': math.inf,  # Vô thời hạn
                    'owner_qr': qr_code,      # QR chủ sở hữu
                    'block_reason': reason,
                    'block_time': time.time()
                }
                
                if was_blocked:
                    log_msg = f"[BLOCK_SLOT] Slot {slot_number} trên {camera_id} đã bị block bởi QR {old_owner}, cập nhật owner mới: QR {qr_code} (reason: {reason})"
                else:
                    log_msg = f"[BLOCK_SLOT] Đã block slot {slot_number} trên {camera_id} bởi QR {qr_code} (reason: {reason})"
                
                self.block_logger.info(f"BLOCK_SLOT_SUCCESS: camera={camera_id}, slot={slot_number}, qr_code={qr_code}, reason={reason}, was_blocked={was_blocked}, old_owner={old_owner}")
                print(log_msg)
            
        except Exception as e:
            error_msg = f"Lỗi khi block slot theo QR code: {e}"
            print(error_msg)
            self.block_logger.error(f"BLOCK_SLOT_ERROR: qr_code={qr_code}, error={str(e)}")
    
    def _unblock_slot_by_qr(self, qr_code: int, reason: str = "manual") -> None:
        """
        Unblock slot theo QR code - Quét toàn bộ RAM tìm slot có owner == QR
        KHÔNG phụ thuộc vào file config
        Hoạt động với cả slot bị lock tự động (dual) và lock thủ công
        """
        try:
            slot_found = False
            slots_unblocked = []
            dual_ids_to_cleanup = []
            
            # BƯỚC 1: Quét toàn bộ RAM để tìm tất cả slots thuộc về QR này
            with self.cache_lock:
                for camera_id, camera_slots in list(self.blocked_slots.items()):
                    for slot_number, slot_info in list(camera_slots.items()):
                        # Kiểm tra owner_qr
                        if isinstance(slot_info, dict) and slot_info.get('owner_qr') == qr_code:
                            # Tìm thấy slot thuộc về QR này
                            slot_found = True
                            slots_unblocked.append((camera_id, slot_number))
                            
                            # Xóa slot khỏi blocked_slots
                            del self.blocked_slots[camera_id][slot_number]
                            
                            log_msg = f"[UNBLOCK_SLOT] Đã unblock slot {slot_number} trên {camera_id} (owner QR: {qr_code}, reason: {reason})"
                            self.block_logger.info(f"UNBLOCK_SLOT_SUCCESS: camera={camera_id}, slot={slot_number}, qr_code={qr_code}, reason={reason}")
                            print(log_msg)
                            
                            # FORCE REFRESH: Đánh dấu camera cần refresh
                            self.force_refresh_cameras[camera_id] = time.time()
                            print(f"[FORCE_REFRESH] Đã đánh dấu camera {camera_id} cần refresh detection sau unblock")
                
                # BƯỚC 2: Tìm dual_id liên quan đến QR này
                for dual_id, pair_info in list(self.dual_blocked_pairs.items()):
                    if pair_info.get("start_qr") == qr_code:
                        dual_ids_to_cleanup.append(dual_id)
            
            # BƯỚC 3: Cleanup dual monitoring (nếu có)
            for dual_id in dual_ids_to_cleanup:
                with self.cache_lock:
                    # Xóa khỏi dual_blocked_pairs
                    if dual_id in self.dual_blocked_pairs:
                        del self.dual_blocked_pairs[dual_id]
                        print(f"[UNBLOCK_SLOT] Đã xóa dual pair {dual_id} khỏi dual_blocked_pairs")
                    
                    # Xóa khỏi dual_end_monitoring
                    for (cam, slot), monitored_dual_id in list(self.dual_end_monitoring.items()):
                        if monitored_dual_id == dual_id:
                            del self.dual_end_monitoring[(cam, slot)]
                            print(f"[UNBLOCK_SLOT] Đã xóa end monitoring cho dual {dual_id} tại slot {slot} camera {cam}")
                    
                    # Xóa khỏi end_slot_states
                    for end_slot, state in list(self.end_slot_states.items()):
                        if state.get('dual_id') == dual_id:
                            del self.end_slot_states[end_slot]
                            print(f"[UNBLOCK_SLOT] Đã xóa end_slot_states cho {end_slot}")
                    
                    self.block_logger.info(f"UNBLOCK_DUAL_CLEANUP: dual_id={dual_id}, qr_code={qr_code}, reason={reason}")
            
            # BƯỚC 4: Báo cáo kết quả
            if not slot_found:
                print(f"[UNBLOCK_SLOT] Không tìm thấy slot nào thuộc về QR {qr_code} trong RAM")
                self.block_logger.warning(f"UNBLOCK_SLOT_NOT_FOUND: qr_code={qr_code}, reason={reason}")
            else:
                print(f"[UNBLOCK_SLOT] Đã unblock {len(slots_unblocked)} slot(s) thuộc về QR {qr_code}")
                self.block_logger.info(f"UNBLOCK_SLOT_SUMMARY: qr_code={qr_code}, slots_count={len(slots_unblocked)}, slots={slots_unblocked}, reason={reason}")
            
        except Exception as e:
            error_msg = f"Lỗi khi unblock slot theo QR code: {e}"
            print(error_msg)
            self.block_logger.error(f"UNBLOCK_SLOT_ERROR: qr_code={qr_code}, error={str(e)}")
    
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
                
                self.blocked_slots[start_camera_id][start_slot_number] = {
                    'expire_time': math.inf,
                    'owner_qr': start_qr,
                    'block_reason': 'dual_block',
                    'block_time': time.time()
                }
            
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
                # "timestamp": datetime.utcnow().isoformat() + "Z",
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
    
    def _load_roi_config_from_file(self) -> None:
        """Load ROI coordinates từ slot_pairing_config.json vào roi_cache."""
        if not os.path.exists(self.pairing_config_path):
            print(f"[ROI_CONFIG] File không tồn tại: {self.pairing_config_path}")
            return

        try:
            with open(self.pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)

            roi_entries = cfg.get("roi_coordinates", [])
            if not isinstance(roi_entries, list):
                print(f"[ROI_CONFIG] roi_coordinates không hợp lệ trong {self.pairing_config_path}")
                return

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
                # Loại bỏ slot_number sau khi sắp xếp để giữ cấu trúc cũ (chỉ cần points)
                normalized_slots = [
                    {"points": slot["points"], "slot_number": slot.get("slot_number")}
                    for slot in sorted_slots
                ]
                new_cache[camera_id] = normalized_slots

            with self.cache_lock:
                self.roi_cache = new_cache

            print(f"[ROI_CONFIG] Đã load ROI cho {len(self.roi_cache)} camera từ {self.pairing_config_path}")

        except Exception as e:
            print(f"[ROI_CONFIG] Lỗi khi load ROI config: {e}")
    
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
            # "frame_id": detection_data["frame_id"],
            # "timestamp": detection_data["timestamp"],
            # "frame_shape": detection_data["frame_shape"],
            "roi_detections": filtered_detections,
            # "roi_detection_count": len(filtered_detections),
            # "original_detection_count": len(detections)
        }
        
        return roi_detection_payload
    
    def subscribe_roi_config(self) -> None:
        """
        Monitor file slot_pairing_config.json để cập nhật ROI coordinates.
        """
        print(f"Bắt đầu monitor ROI config từ file {self.pairing_config_path}...")
        # Đã load một lần trong __init__, nhưng gọi lại để đảm bảo dữ liệu mới nhất
        self._load_roi_config_from_file()

        while self.running:
            try:
                current_mtime = os.path.getmtime(self.pairing_config_path)
            except OSError:
                current_mtime = None

            if current_mtime is not None and current_mtime != self._roi_config_mtime:
                print(f"[ROI_CONFIG] Phát hiện thay đổi file, reload...")
                self._roi_config_mtime = current_mtime
                self._load_roi_config_from_file()

            time.sleep(1.0)
    
    # def subscribe_raw_detection(self) -> None:
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
                
                time.sleep(0.1)  # Check mỗi 100ms
                
            except Exception as e:
                print(f"Lỗi khi subscribe raw detection: {e}")
                time.sleep(1)
    
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
                        
                        # Lưu detection data gốc để hiển thị video (vẽ bounding box YOLO gốc)
                        with self.cache_lock:
                            self.latest_detections[camera_id] = detection_data
                        
                        # Xử lý detection - Hàm này trả về dữ liệu CÓ chứa bbox/center
                        roi_detection_payload = self.process_detection(detection_data)
                        
                        # 1. CẬP NHẬT CACHE HIỂN THỊ (Giữ nguyên bbox/center để vẽ video)
                        with self.cache_lock:
                            self.latest_roi_detections[camera_id] = roi_detection_payload
                        
                        # 2. TẠO PAYLOAD SẠCH ĐỂ PUBLISH (Loại bỏ bbox/center)
                        clean_detections = []
                        if roi_detection_payload and "roi_detections" in roi_detection_payload:
                            for d in roi_detection_payload["roi_detections"]:
                                clean_detections.append({
                                    "class_name": d.get("class_name"),
                                    "class_id": d.get("class_id"),
                                    # "confidence": d.get("confidence"),
                                    "slot_number": d.get("slot_number")
                                    # Đã loại bỏ "bbox" và "center" ở đây để giảm tải cho DB/Queue
                                })

                        clean_payload = {
                            "camera_id": roi_detection_payload.get("camera_id"),
                            "roi_detections": clean_detections
                        }
                        
                        # 3. Publish payload sạch vào roi_detection_queue
                        self.queue.publish("roi_detection", camera_id, clean_payload)
                
                time.sleep(0.1)  # Check mỗi 100ms
                
            except Exception as e:
                print(f"Lỗi khi subscribe raw detection: {e}")
                time.sleep(1)
    def run(self) -> None:
        """
        Chạy ROI processor
        """
        self.running = True
        
        # Tạo threads cho ROI config, raw detection, stable_pairs, unlock_start_slot, block/unblock slot, dual_blocking
        roi_thread = threading.Thread(target=self.subscribe_roi_config, daemon=True)
        detection_thread = threading.Thread(target=self.subscribe_raw_detection, daemon=True)
        stable_pairs_thread = threading.Thread(target=self._subscribe_stable_pairs, daemon=True)
        unlock_thread = threading.Thread(target=self._subscribe_unlock_start_slot, daemon=True)
        block_unblock_thread = threading.Thread(target=self._subscribe_block_unblock_slot, daemon=True)
        dual_blocking_thread = threading.Thread(target=self._subscribe_dual_blocking, daemon=True)
        
        roi_thread.start()
        detection_thread.start()
        stable_pairs_thread.start()
        unlock_thread.start()
        block_unblock_thread.start()
        dual_blocking_thread.start()
        
        print("ROI Processor đã bắt đầu chạy...")
        print("Nhấn Ctrl+C để dừng")
        
        # Hiển thị thông tin end slot monitoring
        if self.end_to_start_mapping:
            print(f"\nEnd Slot Monitoring System:")
            print(f"- Đang theo dõi {len(self.end_to_start_mapping)} end slots")
            print(f"- Thời gian shelf stable để unlock: {self.shelf_stable_time}s")
            print(f"- Mapping:")
            for end_slot, start_slot in self.end_to_start_mapping.items():
                print(f"  End {end_slot} -> Start {start_slot}")
        
        print("\nSử dụng 'python view-cam.py' để xem camera")
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nNhận KeyboardInterrupt - Đang dừng ROI Processor...")
            self.running = False
        
        print("ROI Processor đã dừng")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="ROI Processor - Filter detections by ROI")
    parser.add_argument("--db-path", type=str, default="queues.db", 
                       help="Đường dẫn đến database SQLite")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        processor = ROIProcessor(args.db_path)
        processor.run()
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())