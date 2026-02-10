"""
Point Status API - API quản lý trạng thái block/unblock của điểm
Tận dụng HashTables đã có sẵn trong logic/hash_tables.py
"""

import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("PointStatusAPI")


class PointStatusAPI:
    """
    API để block/unblock điểm
    
    Usage:
        api = PointStatusAPI(hash_tables)
        api.block_point("911", blocked_by="manual")
        api.unblock_point("911")
    """
    
    def __init__(self, hash_tables, visualizer_queue=None):
        """
        Args:
            hash_tables: HashTables object từ logic/hash_tables.py
            visualizer_queue: Queue để gửi thông báo đến visualizer (optional)
        """
        self.hash_tables = hash_tables
        self.visualizer_queue = visualizer_queue
    
    def block_point(self, qr_code: str, blocked_by: str = "manual") -> Dict[str, Any]:
        """
        Block một điểm - TẮT điểm này, logic sẽ KHÔNG kiểm tra điểm này nữa
        
        Khác với block tự động của logic:
        - Block manual: set manually_disabled=True → logic BỎ QUA hoàn toàn
        - Block auto (logic): chỉ ngăn trigger lại, vẫn kiểm tra điều kiện
        
        Args:
            qr_code: Mã QR code của điểm cần block
            blocked_by: Nguồn block (mặc định "manual")
            
        Returns:
            Dict với kết quả: {"success": bool, "message": str, "data": dict}
        """
        # Kiểm tra điểm có tồn tại không
        state = self.hash_tables.get_state(qr_code)
        if not state:
            return {
                "success": False,
                "message": f"Không tìm thấy điểm với qr_code: {qr_code}",
                "data": None
            }
        
        # Kiểm tra đã bị manually disabled chưa
        if state.get("manually_disabled"):
            return {
                "success": False,
                "message": f"Điểm {qr_code} đã bị tắt (manually disabled)",
                "data": {
                    "qr_code": qr_code,
                    "manually_disabled": True,
                    "blocked_by": state.get("blocked_by")
                }
            }
        
        # TẮT điểm - logic sẽ BỎ QUA điểm này
        timestamp = int(time.time())
        self.hash_tables.update_state(qr_code, {
            "manually_disabled": True,  # QUAN TRỌNG: logic sẽ bỏ qua điểm này
            "status": "block",
            "blocked_by": blocked_by,
            "blocked_at": timestamp
        })
        
        # Gửi thông báo đến visualizer
        self.hash_tables.send_block_notification(qr_code, self.visualizer_queue)
        
        logger.info(f"✅ Đã TẮT điểm {qr_code} (manually_disabled=True)")
        
        return {
            "success": True,
            "message": f"Đã TẮT điểm {qr_code} - Logic sẽ không kiểm tra điểm này",
            "data": {
                "qr_code": qr_code,
                "manually_disabled": True,
                "status": "block",
                "blocked_by": blocked_by,
                "blocked_at": timestamp
            }
        }
    
    def unblock_point(self, qr_code: str) -> Dict[str, Any]:
        """
        Unblock một điểm - BẬT lại điểm này, logic sẽ kiểm tra điểm này trở lại
        
        Có 2 trường hợp:
        1. Unblock manual (manually_disabled=True) → BẬT lại logic kiểm tra
        2. Unblock sau khi robot hoàn thành (blocked_by=rule_name) → cho phép trigger lại
        
        QUAN TRỌNG: Reset stable_since để logic đếm lại thời gian ổn định từ đầu
        
        Args:
            qr_code: Mã QR code của điểm cần unblock
            
        Returns:
            Dict với kết quả: {"success": bool, "message": str, "data": dict}
        """
        # Kiểm tra điểm có tồn tại không
        state = self.hash_tables.get_state(qr_code)
        if not state:
            return {
                "success": False,
                "message": f"Không tìm thấy điểm với qr_code: {qr_code}",
                "data": None
            }
        
        # Kiểm tra có đang bị block hoặc manually disabled không
        is_manually_disabled = state.get("manually_disabled", False)
        is_blocked = self.hash_tables.is_point_blocked(qr_code)
        
        if not is_manually_disabled and not is_blocked:
            return {
                "success": False,
                "message": f"Điểm {qr_code} không bị block hoặc tắt (status: {state.get('status')})",
                "data": {
                    "qr_code": qr_code,
                    "status": state.get("status"),
                    "manually_disabled": False
                }
            }
        
        # Unblock/BẬT lại điểm và RESET stable_since để đếm lại thời gian ổn định
        old_blocked_by = state.get("blocked_by")
        was_manually_disabled = is_manually_disabled
        current_time = int(time.time())
        
        self.hash_tables.update_state(qr_code, {
            "manually_disabled": False,  # QUAN TRỌNG: BẬT lại logic kiểm tra
            "status": "free",
            "blocked_by": None,
            "blocked_at": 0,
            "stable_since": current_time,  # QUAN TRỌNG: Reset để logic đếm lại từ đầu
            "last_update": current_time
        })
        
        # Gửi thông báo đến visualizer
        self._send_unblock_notification(qr_code)
        
        if was_manually_disabled:
            logger.info(f"✅ Đã BẬT lại điểm {qr_code} (manually_disabled=False)")
            message = f"Đã BẬT lại điểm {qr_code} - Logic sẽ kiểm tra điểm này trở lại"
        else:
            logger.info(f"✅ Đã unblock điểm {qr_code} (trước đó bị block bởi: {old_blocked_by})")
            message = f"Đã unblock điểm {qr_code}"
        
        return {
            "success": True,
            "message": message,
            "data": {
                "qr_code": qr_code,
                "manually_disabled": False,
                "status": "free",
                "previous_blocked_by": old_blocked_by,
                "was_manually_disabled": was_manually_disabled
            }
        }
    
    def get_point_status(self, qr_code: str) -> Dict[str, Any]:
        """
        Lấy trạng thái hiện tại của điểm
        
        Args:
            qr_code: Mã QR code của điểm
            
        Returns:
            Dict với trạng thái điểm
        """
        state = self.hash_tables.get_state(qr_code)
        if not state:
            return {
                "success": False,
                "message": f"Không tìm thấy điểm với qr_code: {qr_code}",
                "data": None
            }
        
        return {
            "success": True,
            "message": "OK",
            "data": {
                "qr_code": qr_code,
                "status": state.get("status"),
                "object_type": state.get("object_type"),
                "blocked_by": state.get("blocked_by"),
                "blocked_at": state.get("blocked_at"),
                "manually_disabled": state.get("manually_disabled", False)
            }
        }
    
    def get_all_blocked_points(self) -> Dict[str, Any]:
        """
        Lấy danh sách tất cả điểm đang bị block hoặc manually disabled
        
        Returns:
            Dict với danh sách điểm bị block/tắt
        """
        blocked_points = []
        manually_disabled_points = []
        
        for qr_code, state in self.hash_tables.state_tracker.items():
            if state.get("manually_disabled", False):
                manually_disabled_points.append({
                    "qr_code": qr_code,
                    "manually_disabled": True,
                    "blocked_by": state.get("blocked_by"),
                    "blocked_at": state.get("blocked_at"),
                    "object_type": state.get("object_type")
                })
            elif state.get("status") == "block":
                blocked_points.append({
                    "qr_code": qr_code,
                    "manually_disabled": False,
                    "blocked_by": state.get("blocked_by"),
                    "blocked_at": state.get("blocked_at"),
                    "object_type": state.get("object_type")
                })
        
        total = len(blocked_points) + len(manually_disabled_points)
        
        return {
            "success": True,
            "message": f"Có {total} điểm bị block/tắt ({len(manually_disabled_points)} tắt thủ công, {len(blocked_points)} block tự động)",
            "data": {
                "manually_disabled": manually_disabled_points,
                "auto_blocked": blocked_points,
                "total": total
            }
        }
    
    def unblock_from_output(self, logic_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Unblock điểm dựa trên output từ logic rule
        Hàm này dành cho robot/external system gọi sau khi hoàn thành task
        
        Args:
            logic_output: Output từ logic rule (phải có field "blocked_point")
            
        Returns:
            Dict với kết quả unblock
            
        Example:
            output = {
                "rule_type": "2point",
                "blocked_point": "911",
                "s": {...},
                "e": {...}
            }
            result = api.unblock_from_output(output)
        """
        blocked_point = logic_output.get("blocked_point")
        
        if not blocked_point:
            return {
                "success": False,
                "message": "Output không chứa field 'blocked_point'",
                "data": None
            }
        
        # Gọi unblock_point bình thường
        return self.unblock_point(blocked_point)
    
    def _send_unblock_notification(self, qr_code: str):
        """Gửi thông báo unblock đến visualizer"""
        if not self.visualizer_queue:
            return
        
        point_info = self.hash_tables.qr_to_key_map.get(qr_code)
        if not point_info:
            return
        
        camera_id, slot_id = point_info
        state = self.hash_tables.state_tracker.get(qr_code)
        if not state:
            return
        
        message = {
            "camera_id": camera_id,
            "slot_id": slot_id,
            "object_type": state.get("object_type", "empty"),
            "confidence": state.get("confidence", 0.0),
            "status": "free",
            "bbox": []
        }
        
        try:
            self.visualizer_queue.put(message, block=False)
        except Exception:
            pass

