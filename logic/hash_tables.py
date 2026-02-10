"""
Hash Tables - Quản lý tất cả cấu trúc dữ liệu trong RAM
Bao gồm 4 Hash Tables chính:
    1. key_to_qr_map: (camera_id, slot_id) -> qr_code
    2. qr_to_key_map: qr_code -> (camera_id, slot_id)
    3. trigger_map: qr_code -> List[LogicRule]
    4. state_tracker: qr_code -> state (Single Source of Truth)
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple


class HashTables:
    """Quản lý tất cả Hash Tables cần thiết cho hệ thống"""
    
    def __init__(self, config_path: str = "config.json"):
        """
        Khởi tạo Hash Tables từ file config
        
        Args:
            config_path: Đường dẫn đến file config.json
        """
        self.config_path = config_path
        
        # Hash Table 1: (camera_id, slot_id) -> qr_code
        # Dùng để tra cứu nhanh qr_code từ thông tin camera/slot
        self.key_to_qr_map: Dict[Tuple[str, str], str] = {}
        
        # Hash Table 2: qr_code -> (camera_id, slot_id)
        # Dùng để tra cứu ngược lại thông tin camera/slot từ qr_code
        self.qr_to_key_map: Dict[str, Tuple[str, str]] = {}
        
        # Hash Table 3: qr_code -> List[LogicRule]
        # Dùng để biết qr_code nào trigger rule nào (tối ưu performance)
        self.trigger_map: Dict[str, List[Any]] = {}
        
        # Hash Table 4: StateTracker - Nguồn chân lý duy nhất
        # Lưu trạng thái hiện tại của từng qr_code
        self.state_tracker: Dict[str, Dict[str, Any]] = {}
        
        # Load config vào RAM
        self._load_config()
    
    def _load_config(self):
        """Nạp config.json vào các Hash Tables trong RAM"""
        config_path = Path(self.config_path)
        
        if not config_path.exists():
            print(f"⚠️  Config file không tồn tại: {self.config_path}")
            return
        
        try:
            import time
            init_timestamp = int(time.time())  # Lấy timestamp khởi tạo (integer để đồng bộ với event timestamp)
            
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Xây dựng Hash Table 1, 2 và 4 từ "points"
            points = config.get("points", {})
            
            for qr_code, point_info in points.items():
                camera_id = point_info.get("camera_id")
                slot_id = str(point_info.get("slot_id"))
                
                if not camera_id or not slot_id:
                    continue
                
                key = (camera_id, slot_id)
                
                # Hash Table 1: key -> qr_code
                self.key_to_qr_map[key] = qr_code
                
                # Hash Table 2: qr_code -> key
                self.qr_to_key_map[qr_code] = key
                
                # Hash Table 4: Khởi tạo state ban đầu
                self.state_tracker[qr_code] = {
                    "object_type": "empty",  # "shelf", "empty", hoặc "class_X"
                    "confidence": 0.0,
                    "last_update": init_timestamp,
                    "stable_since": init_timestamp,  # Set = thời điểm khởi tạo để tránh trigger ngay
                    "status": "free",  # "free" | "block"
                    "blocked_by": None,  # rule_name đã block (để debug)
                    "blocked_at": 0,  # timestamp block
                    "manually_disabled": False  # True = user tắt điểm này, logic KHÔNG kiểm tra
                }
            
            print(f"Hash Tables đã nạp {len(points)} points vào RAM")
            print(f"   - key_to_qr_map: {len(self.key_to_qr_map)} entries")
            print(f"   - qr_to_key_map: {len(self.qr_to_key_map)} entries")
            print(f"   - state_tracker: {len(self.state_tracker)} entries")
            
        except Exception as e:
            print(f"Lỗi khi load config vào Hash Tables: {e}")
            import traceback
            traceback.print_exc()
    
    def get_qr_code(self, camera_id: str, slot_id: str) -> Optional[str]:
        """
        Tra cứu qr_code từ (camera_id, slot_id) - Hash Table 1
        
        Args:
            camera_id: ID camera (ví dụ: "cam-1")
            slot_id: ID slot/ROI (ví dụ: "1", "ROI_1")
            
        Returns:
            qr_code nếu tìm thấy, None nếu không
        """
        return self.key_to_qr_map.get((camera_id, slot_id))
    
    def get_point_info(self, qr_code: str) -> Optional[Tuple[str, str]]:
        """
        Tra cứu (camera_id, slot_id) từ qr_code - Hash Table 2
        
        Args:
            qr_code: Mã QR code (ví dụ: "000", "111")
            
        Returns:
            Tuple (camera_id, slot_id) nếu tìm thấy, None nếu không
        """
        return self.qr_to_key_map.get(qr_code)
    
    def get_state(self, qr_code: str) -> Optional[Dict[str, Any]]:
        """
        Lấy trạng thái hiện tại của qr_code - Hash Table 4
        
        Args:
            qr_code: Mã QR code
            
        Returns:
            Dict chứa state {object_type, confidence, last_update, stable_since}
        """
        return self.state_tracker.get(qr_code)
    
    def update_state(self, qr_code: str, new_state: Dict[str, Any]):
        """
        Cập nhật trạng thái của qr_code - Hash Table 4 (Single Source of Truth)
        
        Args:
            qr_code: Mã QR code
            new_state: Dict chứa các field cần update
        """
        if qr_code in self.state_tracker:
            self.state_tracker[qr_code].update(new_state)
    
    def get_triggered_rules(self, qr_code: str) -> List[Any]:
        """
        Lấy danh sách các rules liên quan đến qr_code - Hash Table 3
        
        Args:
            qr_code: Mã QR code
            
        Returns:
            List các LogicRule objects
        """
        return self.trigger_map.get(qr_code, [])
    
    def register_rule_trigger(self, qr_code: str, logic_rule: Any):
        """
        Đăng ký một rule sẽ được trigger khi qr_code thay đổi - Hash Table 3
        
        Args:
            qr_code: Mã QR code
            logic_rule: LogicRule object
        """
        if qr_code not in self.trigger_map:
            self.trigger_map[qr_code] = []
        
        if logic_rule not in self.trigger_map[qr_code]:
            self.trigger_map[qr_code].append(logic_rule)
    
    def reload_config(self):
        """Reload lại config từ file (hot-reload)"""
        print(" Đang reload config...")
        self._load_config()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Lấy thống kê về Hash Tables"""
        return {
            "total_points": len(self.key_to_qr_map),
            "total_rules_registered": sum(len(rules) for rules in self.trigger_map.values()),
            "total_qr_codes_with_triggers": len(self.trigger_map),
            "state_tracker_size": len(self.state_tracker)
        }
    
    def print_statistics(self):
        """In thống kê Hash Tables ra console"""
        stats = self.get_statistics()
        print("\n Hash Tables Statistics:")
        print(f"   - Total points: {stats['total_points']}")
        print(f"   - QR codes with triggers: {stats['total_qr_codes_with_triggers']}")
        print(f"   - Total rule registrations: {stats['total_rules_registered']}")
        print(f"   - State tracker entries: {stats['state_tracker_size']}")
    
    def unblock_point(self, qr_code: str, visualizer_callback=None):
        """
        Unblock một điểm sau khi robot hoàn thành task
        
        Args:
            qr_code: Mã QR code cần unblock
            visualizer_callback: Callback function để notify visualizer (optional)
        """
        if qr_code in self.state_tracker:
            old_status = self.state_tracker[qr_code].get("status")
            self.state_tracker[qr_code].update({
                "status": "free",
                "blocked_by": None,
                "blocked_at": 0
            })
            import logging
            logger = logging.getLogger("HashTables")
            logger.info(f"✅ Đã unblock điểm {qr_code} (status: {old_status} -> free)")
            
            # Notify visualizer nếu có callback
            if visualizer_callback:
                point_info = self.qr_to_key_map.get(qr_code)
                if point_info:
                    camera_id, slot_id = point_info
                    state = self.state_tracker[qr_code]
                    visualizer_callback(camera_id, slot_id, state)
        else:
            import logging
            logger = logging.getLogger("HashTables")
            logger.warning(f"⚠️  Không tìm thấy qr_code {qr_code} để unblock")
    
    def is_point_blocked(self, qr_code: str) -> bool:
        """
        Kiểm tra xem một điểm có đang bị block không
        
        Args:
            qr_code: Mã QR code cần kiểm tra
            
        Returns:
            True nếu điểm đang bị block, False nếu available
        """
        state = self.state_tracker.get(qr_code)
        if not state:
            return False
        return state.get("status") == "block"
    
    def send_block_notification(self, qr_code: str, visualizer_queue=None):
        """
        Gửi thông báo block đến visualizer
        
        Args:
            qr_code: Mã QR code đã bị block
            visualizer_queue: Queue để gửi thông báo đến visualizer
        """
        if not visualizer_queue:
            return
        
        point_info = self.qr_to_key_map.get(qr_code)
        if not point_info:
            return
        
        camera_id, slot_id = point_info
        state = self.state_tracker.get(qr_code)
        if not state:
            return
        
        # Tạo message giống format của roi_checker để visualizer nhận được
        message = {
            "camera_id": camera_id,
            "slot_id": slot_id,
            "object_type": state.get("object_type", "shelf"),
            "confidence": state.get("confidence", 0.0),
            "status": "block",  # Trường đặc biệt để visualizer biết
            "bbox": []  # Không có bbox
        }
        
        try:
            visualizer_queue.put(message, block=False)
        except Exception:
            pass

