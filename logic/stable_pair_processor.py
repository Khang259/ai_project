import json
import time
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional, Set
from logging.handlers import RotatingFileHandler

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from queue_store import SQLiteQueue


def utc_now_iso() -> str:
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def setup_pair_publish_logger(log_dir: str = "../logs") -> logging.Logger:
    """Thiết lập logger cho Pair Publishing operations"""
    # Tạo thư mục logs nếu chưa có
    os.makedirs(log_dir, exist_ok=True)
    
    # Tạo logger
    logger = logging.getLogger('pair_publish')
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
        os.path.join(log_dir, 'pair_publish.log'),
        maxBytes=5*1024*1024,  # 5MB
        backupCount=3
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    # Thêm handlers vào logger
    logger.addHandler(file_handler)
    
    return logger


def setup_block_unblock_logger(log_dir: str = "../logs") -> logging.Logger:
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


def is_point_in_polygon(point: Tuple[float, float], polygon: List[List[int]]) -> bool:
    """Ray casting algorithm to test if a point is inside a polygon."""
    x, y = point
    n = len(polygon)
    if n < 3:
        return False
    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    else:
                        xinters = p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


class StablePairProcessor:
    def __init__(self, db_path: str = "../queues.db", config_path: str = "slot_pairing_config.json",
                 stable_seconds: float = 5.0, cooldown_seconds: float = 10.0) -> None:
        print(f"Khởi tạo StablePairProcessor - DB: {db_path}, Config: {config_path}, Stable: {stable_seconds}s, Cooldown: {cooldown_seconds}s")
        
        # Thiết lập loggers
        self.pair_logger = setup_pair_publish_logger()
        self.block_logger = setup_block_unblock_logger()
        
        self.queue = SQLiteQueue(db_path)
        self.config_path = config_path
        self.stable_seconds = stable_seconds
        self.cooldown_seconds = cooldown_seconds

        # Slot state store per slot_key "cam-x:slot_number"
        # value: {status: "shelf"|"empty", since: float(epoch_seconds)}
        self.slot_state: Dict[str, Dict[str, Any]] = {}

        # Pair blocklist to avoid spamming: pair_id -> last_published_epoch
        self.published_at: Dict[str, float] = {}
        
        # Track published pairs by minute to avoid duplicates
        # Format: {pair_id: {minute_key: True}} where minute_key = "YYYY-MM-DD HH:MM"
        self.published_by_minute: Dict[str, Dict[str, bool]] = {}

        # Pairing config
        self.qr_to_slot: Dict[int, Tuple[str, int]] = {}  # qr_code -> (camera_id, slot_number)
        self.pairs: List[Tuple[int, List[int]]] = []      # (start_qr, [end_qrs])
        
        # Dual pairing config
        self.dual_pairs: List[Dict[str, int]] = []        # [{start_qr, end_qrs, start_qr_2, end_qrs_2}]
        self.dual_published_at: Dict[str, float] = {}     # dual_id -> last_published_epoch
        self.dual_published_by_minute: Dict[str, Dict[str, bool]] = {}  # dual_id -> {minute_key: True}
        
        # Dual blocking system
        self.dual_blocked_pairs: Dict[str, Dict[str, int]] = {}  # dual_id -> {start_qr, end_qrs}
        self.dual_end_states: Dict[Tuple[str, int], Dict[str, Any]] = {}  # (camera_id, slot) -> {state, since}

        self._load_pairing_config()

    def _load_pairing_config(self) -> None:
        print(f"Bắt đầu load pairing config từ {self.config_path}")
        
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception as e:
            print(f"Lỗi khi đọc config file: {e}")
            raise

        # Build qr->(camera, slot) from starts, starts_2 and ends
        self.qr_to_slot.clear()
        starts_count = ends_count = starts_2_count = 0
        for item in cfg.get("starts", []):
            self.qr_to_slot[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
            starts_count += 1
        for item in cfg.get("starts_2", []):
            self.qr_to_slot[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
            starts_2_count += 1
        for item in cfg.get("ends", []):
            self.qr_to_slot[int(item["qr_code"])] = (str(item["camera_id"]), int(item["slot_number"]))
            ends_count += 1

        # Normalize pairs: ensure list for end_qrs
        self.pairs.clear()
        for pair in cfg.get("pairs", []):
            start_qr = int(pair["start_qr"])
            end_qrs_raw = pair.get("end_qrs", [])
            if isinstance(end_qrs_raw, list):
                end_qrs = [int(x) for x in end_qrs_raw]
            else:
                end_qrs = [int(end_qrs_raw)]
            self.pairs.append((start_qr, end_qrs))
        
        # Load dual pairs configuration
        self.dual_pairs.clear()
        for dual in cfg.get("dual", []):
            dual_config = {
                "start_qr": int(dual["start_qr"]),
                "end_qrs": int(dual["end_qrs"]),
                "start_qr_2": int(dual["start_qr_2"]),
                "end_qrs_2": int(dual["end_qrs_2"])
            }
            self.dual_pairs.append(dual_config)
        
        # Log thông tin config đã load
        print(f"Loaded config - QR mappings: {len(self.qr_to_slot)} (starts: {starts_count}, starts_2: {starts_2_count}, ends: {ends_count})")
        print(f"Loaded config - Pairs: {len(self.pairs)}, Dual pairs: {len(self.dual_pairs)}")
        
        if self.dual_pairs:
            for dual in self.dual_pairs:
                print(f"Dual pair: {dual['start_qr']} -> {dual['end_qrs']} + {dual['start_qr_2']} -> {dual['end_qrs_2']}")

    # No ROI polygons dependency anymore

    def _iter_roi_detections(self) -> List[str]:
        """Return list of camera_ids that have roi_detection data."""
        with self.queue._connect() as conn:
            cur = conn.execute("SELECT DISTINCT key FROM messages WHERE topic = 'roi_detection' ORDER BY key")
            return [row[0] for row in cur.fetchall()]

    def _compute_slot_statuses(self, camera_id: str, roi_detections: List[Dict[str, Any]]) -> Dict[int, str]:
        """
        Tính trạng thái slot dựa trên trường slot_number gắn tại roi_processor.
        Quy ước: mỗi frame có đủ các slot empty nếu không thấy shelf.
        Ở đây, chúng ta tạo status_by_slot từ các detection hiện có: nếu có shelf ở slot X thì slot X=shelf, các slot khác giữ nguyên theo state cũ hoặc không cập nhật.
        """
        status_by_slot: Dict[int, str] = {}
        # mark shelf by present detections
        for det in roi_detections:
            cls = det.get("class_name")
            slot_num = det.get("slot_number")
            if slot_num is None:
                continue
            if cls == "shelf":
                status_by_slot[int(slot_num)] = "shelf"
            elif cls == "empty" and int(slot_num) not in status_by_slot:
                # only mark empty if shelf not seen for that slot in this batch
                status_by_slot[int(slot_num)] = "empty"
        return status_by_slot

    def _update_slot_state(self, camera_id: str, status_by_slot: Dict[int, str]) -> None:
        now = time.time()
        for slot_num, status in status_by_slot.items():
            key = f"{camera_id}:{slot_num}"
            prev = self.slot_state.get(key)
            if prev is None:
                self.slot_state[key] = {"status": status, "since": now}
            else:
                if prev["status"] != status:
                    self.slot_state[key] = {"status": status, "since": now}
                # else keep since

    def _is_slot_stable(self, camera_id: str, slot_number: int, expect_status: str) -> Tuple[bool, Optional[float]]:
        key = f"{camera_id}:{slot_number}"
        st = self.slot_state.get(key)
        if not st:
            return False, None
        if st["status"] != expect_status:
            return False, None
        now = time.time()
        stable = (now - st["since"]) >= self.stable_seconds
        return stable, st["since"] if stable else None

    def _get_minute_key(self, epoch_seconds: float) -> str:
        """Convert epoch seconds to minute key format: YYYY-MM-DD HH:MM"""
        dt = datetime.utcfromtimestamp(epoch_seconds)
        return dt.strftime("%Y-%m-%d %H:%M")
    
    def _is_already_published_this_minute(self, pair_id: str, stable_since_epoch: float) -> bool:
        """Check if this pair was already published in the same minute"""
        minute_key = self._get_minute_key(stable_since_epoch)
        
        if pair_id not in self.published_by_minute:
            self.published_by_minute[pair_id] = {}
        
        return minute_key in self.published_by_minute[pair_id]
    
    def _mark_published_this_minute(self, pair_id: str, stable_since_epoch: float) -> None:
        """Mark this pair as published for this minute"""
        minute_key = self._get_minute_key(stable_since_epoch)
        
        if pair_id not in self.published_by_minute:
            self.published_by_minute[pair_id] = {}
        
        self.published_by_minute[pair_id][minute_key] = True

    def _maybe_publish_dual(self, dual_config: Dict[str, int], stable_since_epoch: float, is_four_points: bool) -> None:
        """Publish dual pair based on configuration and stability"""
        start_qr = dual_config["start_qr"]
        end_qrs = dual_config["end_qrs"]
        start_qr_2 = dual_config["start_qr_2"]
        end_qrs_2 = dual_config["end_qrs_2"]
        
        if is_four_points:
            dual_id = f"{start_qr}-> {end_qrs}-> {start_qr_2}-> {end_qrs_2}"
        else:
            dual_id = f"{start_qr}-> {end_qrs}"
        
        # Check if already published in the same minute
        if self._is_dual_already_published_this_minute(dual_id, stable_since_epoch):
            return
        
        # Check cooldown period
        last_pub = self.dual_published_at.get(dual_id, 0.0)
        now = time.time()
        if now - last_pub < self.cooldown_seconds:
            return
        
        # Mark as published for this minute and update cooldown
        self._mark_dual_published_this_minute(dual_id, stable_since_epoch)
        self.dual_published_at[dual_id] = now

        if is_four_points:
            payload = {
                "dual_id": dual_id,
                "start_slot": str(start_qr),
                "end_slot": str(end_qrs),
                "start_slot_2": str(start_qr_2),
                "end_slot_2": str(end_qrs_2),
                "stable_since": datetime.utcfromtimestamp(stable_since_epoch).replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        else:
            payload = {
                "dual_id": dual_id,
                "start_slot": str(start_qr),
                "end_slot": str(end_qrs),
                "stable_since": datetime.utcfromtimestamp(stable_since_epoch).replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
            }
        
        # Use dual_id as key for convenience
        self.queue.publish("stable_dual", dual_id, payload)
        
        # Log successful publish
        if is_four_points:
            self.pair_logger.info(f"STABLE_DUAL_4P_PUBLISHED: dual_id={dual_id}, start_slot={start_qr}, end_slot={end_qrs}, start_slot_2={start_qr_2}, end_slot_2={end_qrs_2}, stable_since={datetime.utcfromtimestamp(stable_since_epoch).isoformat()}Z")
        else:
            self.pair_logger.info(f"STABLE_DUAL_2P_PUBLISHED: dual_id={dual_id}, start_slot={start_qr}, end_slot={end_qrs}, stable_since={datetime.utcfromtimestamp(stable_since_epoch).isoformat()}Z")
        
        # Block start_qr sau khi publish dual
        self._publish_dual_block(dual_config, dual_id)

    def _is_dual_already_published_this_minute(self, dual_id: str, stable_since_epoch: float) -> bool:
        """Check if this dual pair was already published in the same minute"""
        minute_key = self._get_minute_key(stable_since_epoch)
        
        if dual_id not in self.dual_published_by_minute:
            self.dual_published_by_minute[dual_id] = {}
        
        return minute_key in self.dual_published_by_minute[dual_id]
    
    def _mark_dual_published_this_minute(self, dual_id: str, stable_since_epoch: float) -> None:
        """Mark this dual pair as published for this minute"""
        minute_key = self._get_minute_key(stable_since_epoch)
        
        if dual_id not in self.dual_published_by_minute:
            self.dual_published_by_minute[dual_id] = {}
        
        self.dual_published_by_minute[dual_id][minute_key] = True
    
    def _publish_dual_block(self, dual_config: Dict[str, int], dual_id: str) -> None:
        """Publish message để block start_qr sau khi dual pair được phát hiện"""
        start_qr = dual_config["start_qr"]
        end_qrs = dual_config["end_qrs"]
        
        # Lưu thông tin dual đã block
        self.dual_blocked_pairs[dual_id] = {
            "start_qr": start_qr,
            "end_qrs": end_qrs
        }
        
        # Publish block message cho roi_processor
        block_payload = {
            "dual_id": dual_id,
            "start_qr": start_qr,
            "end_qrs": end_qrs,
            "action": "block",
            "timestamp": datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        }
        
        self.queue.publish("dual_block", dual_id, block_payload)
        
        # Log dual block
        self.block_logger.info(f"DUAL_BLOCK_PUBLISHED: dual_id={dual_id}, start_qr={start_qr}, end_qrs={end_qrs}, action=block")
        
        # Bắt đầu monitor end_qrs state
        end_cam_slot = self.qr_to_slot.get(end_qrs)
        if end_cam_slot:
            end_cam, end_slot = end_cam_slot
            self.dual_end_states[(end_cam, end_slot)] = {
                "state": "empty",  # Bắt đầu với empty
                "since": time.time(),
                "dual_id": dual_id,
                "stable_time": 20.0  # Cần stable 20s
            }
        
        log_msg = f"[DUAL_BLOCK] Đã block start_qr={start_qr} cho dual {dual_id}, monitoring end_qrs={end_qrs}"
        print(log_msg)
    
    def _monitor_dual_end_states(self) -> None:
        """Monitor trạng thái của các end_qrs trong dual pairs để unblock khi cần"""
        current_time = time.time()
        
        # Duyệt qua tất cả dual end states đang monitor
        for (end_cam, end_slot), state_info in list(self.dual_end_states.items()):
            dual_id = state_info["dual_id"]
            
            # Kiểm tra trạng thái hiện tại của slot này
            current_state_ok, current_since = self._is_slot_stable(end_cam, end_slot, expect_status="shelf")
            
            if current_state_ok and current_since is not None:
                # End slot đang stable shelf
                prev_state = state_info["state"]
                if prev_state == "empty":
                    # Chuyển từ empty -> shelf: bắt đầu đếm thời gian
                    state_info["state"] = "shelf"
                    state_info["since"] = current_since
                    log_msg = f"[DUAL_MONITOR] End slot {end_cam}:{end_slot} (dual {dual_id}): empty -> shelf"
                    print(log_msg)
                elif prev_state == "shelf":
                    # Đã ở trạng thái shelf: kiểm tra thời gian stable
                    stable_duration = current_time - state_info["since"]
                    if stable_duration >= state_info["stable_time"]:
                        # Đủ thời gian stable: unblock start_qr
                        self._unblock_dual_start(dual_id)
                        # Xóa khỏi monitoring
                        del self.dual_end_states[(end_cam, end_slot)]
            else:
                # End slot không phải shelf stable
                if state_info["state"] == "shelf":
                    # Chuyển từ shelf -> empty: reset
                    state_info["state"] = "empty"
                    state_info["since"] = current_time
                    print(f"[DUAL_MONITOR] End slot {end_cam}:{end_slot} (dual {dual_id}): shelf -> empty (reset)")
    
    def _unblock_dual_start(self, dual_id: str) -> None:
        """Unblock start_qr khi end_qrs đã stable shelf"""
        if dual_id not in self.dual_blocked_pairs:
            return
        
        blocked_info = self.dual_blocked_pairs[dual_id]
        start_qr = blocked_info["start_qr"]
        end_qrs = blocked_info["end_qrs"]
        
        # Publish unblock message
        unblock_payload = {
            "dual_id": dual_id,
            "start_qr": start_qr,
            "end_qrs": end_qrs,
            "action": "unblock",
            "reason": "end_qrs_stable_shelf",
            "timestamp": datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        }
        
        self.queue.publish("dual_unblock", dual_id, unblock_payload)
        
        # Log dual unblock
        self.block_logger.info(f"DUAL_UNBLOCK_PUBLISHED: dual_id={dual_id}, start_qr={start_qr}, end_qrs={end_qrs}, reason=end_qrs_stable_shelf")
        
        # Xóa khỏi danh sách blocked
        del self.dual_blocked_pairs[dual_id]
        
        log_msg = f"[DUAL_UNBLOCK] Đã unblock start_qr={start_qr} cho dual {dual_id} (end_qrs={end_qrs} stable shelf)"
        print(log_msg)
    
    def _subscribe_dual_unblock_trigger(self) -> None:
        """Subscribe dual_unblock_trigger topic từ roi_processor"""
        print("Bắt đầu subscribe dual_unblock_trigger...")
        
        last_trigger_id = 0
        try:
            with self.queue._connect() as conn:
                cur = conn.execute(
                    "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                    ("dual_unblock_trigger",),
                )
                row = cur.fetchone()
                if row:
                    last_trigger_id = row[0]
        except Exception as e:
            print(f"Lỗi khi khởi tạo dual_unblock_trigger cursor: {e}")

        while True:
            try:
                # Đọc dual_unblock_trigger messages
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        """
                        SELECT id, payload FROM messages
                        WHERE topic = ? AND id > ?
                        ORDER BY id ASC
                        LIMIT 50
                        """,
                        ("dual_unblock_trigger", last_trigger_id),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_trigger_id = msg_id
                    
                    # Xử lý trigger
                    dual_id = payload.get("dual_id", "")
                    if dual_id:
                        print(f"Nhận dual_unblock_trigger cho {dual_id}")
                        self._unblock_dual_start(dual_id)
                
                time.sleep(0.2)
                
            except Exception as e:
                print(f"Lỗi khi subscribe dual_unblock_trigger: {e}")
                time.sleep(1.0)

    def _maybe_publish_pair(self, start_qr: int, end_qr: int, stable_since_epoch: float, all_empty_end_qrs: Optional[List[int]] = None) -> None:
        """
        Publish một cặp pair vào queue.
        
        Args:
            start_qr: QR code của start slot
            end_qr: QR code của end slot chính (sẽ được publish)
            stable_since_epoch: Thời điểm stable
            all_empty_end_qrs: Danh sách TẤT CẢ các end_qrs đang empty (optional)
        """
        pair_id = f"{start_qr} -> {end_qr}"
        
        # Check if already published in the same minute
        if self._is_already_published_this_minute(pair_id, stable_since_epoch):
            return
        
        # Check cooldown period
        last_pub = self.published_at.get(pair_id, 0.0)
        now = time.time()
        if now - last_pub < self.cooldown_seconds:
            return
        
        # Mark as published for this minute and update cooldown
        self._mark_published_this_minute(pair_id, stable_since_epoch)
        self.published_at[pair_id] = now

        payload = {
            "pair_id": pair_id,
            "start_slot": str(start_qr),
            "end_slot": str(end_qr),
            "stable_since": datetime.utcfromtimestamp(stable_since_epoch).replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        
        # Nếu có thông tin về tất cả end_qrs đang empty, thêm vào payload
        if all_empty_end_qrs and len(all_empty_end_qrs) > 1:
            payload["all_empty_end_slots"] = [str(qr) for qr in all_empty_end_qrs]
            payload["is_all_empty"] = True
        
        # Use pair_id as key for convenience
        self.queue.publish("stable_pairs", pair_id, payload)
        
        # Log successful publish
        if all_empty_end_qrs and len(all_empty_end_qrs) > 1:
            self.pair_logger.info(f"STABLE_PAIR_PUBLISHED: pair_id={pair_id}, start_slot={start_qr}, end_slot={end_qr}, all_empty_end_slots={all_empty_end_qrs}, stable_since={datetime.utcfromtimestamp(stable_since_epoch).isoformat()}Z")
        else:
            self.pair_logger.info(f"STABLE_PAIR_PUBLISHED: pair_id={pair_id}, start_slot={start_qr}, end_slot={end_qr}, stable_since={datetime.utcfromtimestamp(stable_since_epoch).isoformat()}Z")
    
    def _evaluate_dual_pairs(self) -> None:
        """Evaluate dual pairs according to the specified logic"""
        for dual_config in self.dual_pairs:
            start_qr = dual_config["start_qr"]
            end_qrs = dual_config["end_qrs"]
            start_qr_2 = dual_config["start_qr_2"]
            end_qrs_2 = dual_config["end_qrs_2"]
            
            # Check if QR codes are mapped to slots
            start_cam_slot = self.qr_to_slot.get(start_qr)
            end_cam_slot = self.qr_to_slot.get(end_qrs)
            start_cam_slot_2 = self.qr_to_slot.get(start_qr_2)
            end_cam_slot_2 = self.qr_to_slot.get(end_qrs_2)
            
            if not start_cam_slot or not end_cam_slot:
                continue
                
            start_cam, start_slot = start_cam_slot
            end_cam, end_slot = end_cam_slot
            
            # Check first pair: start_qr == shelf (1) && end_qrs == empty (0)
            start_ok, start_since = self._is_slot_stable(start_cam, start_slot, expect_status="shelf")
            if not start_ok or start_since is None:
                continue
                
            end_ok, end_since = self._is_slot_stable(end_cam, end_slot, expect_status="empty")
            if not end_ok or end_since is None:
                continue
            
            # First pair is stable, now check second pair
            if not start_cam_slot_2 or not end_cam_slot_2:
                # If second pair not configured, publish 2-point dual
                stable_since_epoch = max(start_since, end_since)
                self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=False)
                continue
            
            start_cam_2, start_slot_2 = start_cam_slot_2
            end_cam_2, end_slot_2 = end_cam_slot_2
            
            # Check start_qr_2 status
            start_2_ok, start_2_since = self._is_slot_stable(start_cam_2, start_slot_2, expect_status="shelf")
            
            if start_2_ok and start_2_since is not None:
                # start_qr_2 == 1 (shelf), publish 4-point dual
                # Chỉ cần start_qr_2 == shelf là đủ, không cần kiểm tra end_qrs_2
                stable_since_epoch = max(start_since, end_since, start_2_since)
                self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=True)
            else:
                # start_qr_2 == 0 (empty), publish 2-point dual
                start_2_empty_ok, start_2_empty_since = self._is_slot_stable(start_cam_2, start_slot_2, expect_status="empty")
                if start_2_empty_ok and start_2_empty_since is not None:
                    stable_since_epoch = max(start_since, end_since, start_2_empty_since)
                    self._maybe_publish_dual(dual_config, stable_since_epoch, is_four_points=False)

    def run(self) -> None:
        # Start dual unblock trigger subscription thread
        import threading
        dual_trigger_thread = threading.Thread(target=self._subscribe_dual_unblock_trigger, daemon=True)
        dual_trigger_thread.start()
        print("Started dual unblock trigger subscription thread")
        
        # Prepare roi_detection trackers
        roi_det_cameras = self._iter_roi_detections()
        last_roi_det_id: Dict[str, int] = {}
        for cam in roi_det_cameras:
            row = self.queue.get_latest_row("roi_detection", cam)
            if row:
                last_roi_det_id[cam] = row["id"]

        start_msg = f"StablePairProcessor started. Watching cameras: {roi_det_cameras}"
        print(start_msg)

        while True:
            try:
                # ensure we cover any new roi_detection cameras
                for cam in self._iter_roi_detections():
                    if cam not in last_roi_det_id:
                        row = self.queue.get_latest_row("roi_detection", cam)
                        if row:
                            last_roi_det_id[cam] = row["id"]

                # read new roi_detection per camera
                for cam, last_id in list(last_roi_det_id.items()):
                    rows = self.queue.get_after_id("roi_detection", cam, last_id, limit=20)
                    for r in rows:
                        payload = r["payload"]
                        last_roi_det_id[cam] = r["id"]
                        roi_detections = payload.get("roi_detections", [])

                        # compute statuses per slot for this camera
                        status_by_slot = self._compute_slot_statuses(cam, roi_detections)
                        if status_by_slot:
                            self._update_slot_state(cam, status_by_slot)

                # evaluate pairs với logic mới
                for start_qr, end_qrs in self.pairs:
                    start_cam_slot = self.qr_to_slot.get(start_qr)
                    if not start_cam_slot:
                        continue
                    start_cam, start_slot = start_cam_slot
                    start_ok, start_since = self._is_slot_stable(start_cam, start_slot, expect_status="shelf")
                    if not start_ok or start_since is None:
                        continue

                    # Thu thập tất cả các end_qrs đang empty và stable
                    empty_end_qrs = []
                    for end_qr in end_qrs:
                        end_cam_slot = self.qr_to_slot.get(end_qr)
                        if not end_cam_slot:
                            continue
                        end_cam, end_slot = end_cam_slot
                        end_ok, end_since = self._is_slot_stable(end_cam, end_slot, expect_status="empty")
                        if end_ok and end_since is not None:
                            empty_end_qrs.append((end_qr, end_since))
                    
                    # Logic mới: chỉ publish 1 cặp duy nhất
                    if empty_end_qrs:
                        # Case 1: TẤT CẢ end_qrs đều empty (len(empty_end_qrs) == len(end_qrs))
                        # Case 2: CHỈ 1 hoặc MỘT SỐ end_qrs empty
                        # Trong cả 2 case: chọn end_qr đầu tiên trong danh sách empty
                        # (đây là end_qr có thứ tự ưu tiên cao nhất trong config)
                        end_qr, end_since = empty_end_qrs[0]
                        stable_since_epoch = max(start_since, end_since)
                        
                        # Tạo danh sách tất cả end_qrs đang empty (chỉ QR codes)
                        all_empty_qrs = [qr for qr, _ in empty_end_qrs]
                        
                        # Log để debug
                        if len(empty_end_qrs) == len(end_qrs):
                            print(f"[PAIR_LOGIC] TẤT CẢ {len(end_qrs)} end_qrs đều empty cho start_qr={start_qr}, chọn end_qr={end_qr}, all_empty={all_empty_qrs}")
                        else:
                            print(f"[PAIR_LOGIC] {len(empty_end_qrs)}/{len(end_qrs)} end_qrs empty cho start_qr={start_qr}, chọn end_qr={end_qr}")
                        
                        # Publish với thông tin về tất cả end_qrs empty
                        self._maybe_publish_pair(start_qr, end_qr, stable_since_epoch, all_empty_end_qrs=all_empty_qrs if len(all_empty_qrs) > 1 else None)

                # Evaluate dual pairs
                self._evaluate_dual_pairs()
                
                # Note: Dual end state monitoring is now handled by roi_processor
                # via dual_unblock_trigger subscription thread

                time.sleep(0.2)

            except KeyboardInterrupt:
                stop_msg = "Stopping StablePairProcessor..."
                print(stop_msg)
                break
            except Exception as e:
                error_msg = f"Error in StablePairProcessor loop: {e}"
                print(error_msg)
                time.sleep(1.0)


def main() -> int:
    proc = StablePairProcessor()
    proc.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


