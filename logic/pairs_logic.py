"""
Pairs Logic - Logic 3 điểm
Điều kiện: s1 phải là 'shelf' VÀ e1, e2 phải là 'empty', ổn định trong X giây

Config example:
{
    "s1": "000",  # qr_code của điểm start
    "e1": "111",  # qr_code của điểm end 1
    "e2": "222"   # qr_code của điểm end 2
}

Params example:
{
    "stability_time_sec": 10,
    "output_queue": "Queue_A"
}
"""

from typing import Dict, Any, Optional
from .base_logic import LogicRule


class PairsLogic(LogicRule):
    """
    Logic 3 điểm (Pairs Logic)
    
    Kịch bản: 
    - s1 (start point) có hàng (shelf)
    - e1, e2 (end points) trống (empty)
    - Trạng thái này ổn định trong stability_time_sec
    → Trigger output
    """
    
    def _init_internal_state(self):
        """Khởi tạo trạng thái nội bộ của Pairs Logic"""
        self.internal_state = {
            "condition_met": False,           # Điều kiện có đang thỏa mãn không?
            "condition_start_time": 0.0,      # Thời điểm bắt đầu thỏa mãn điều kiện
            "last_trigger_time": 0.0,         # Thời điểm trigger lần cuối
            "consecutive_violations": 0       # Số lần vi phạm liên tiếp (để debug)
        }
    
    def process_event(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Xử lý event cho Pairs Logic
        
        Logic flow:
        1. Lấy qr_code từ event
        2. Cập nhật State Tracker (Single Source of Truth)
        3. Kiểm tra xem event có liên quan đến rule này không
        4. Kiểm tra điều kiện: s1=shelf AND e1=empty AND e2=empty
        5. Tính toán stability duration
        6. Trigger nếu đủ điều kiện
        """
        # Tăng counter
        self.stats["events_processed"] += 1
        
        # Lấy thông tin từ event
        camera_id = event.get("camera_id")
        slot_id = event.get("slot_id")
        timestamp = event.get("timestamp", 0)
        
        # Tra cứu qr_code
        qr_code = self.hash_tables.get_qr_code(camera_id, slot_id)
        if not qr_code:
            return None
        
        # Cập nhật State Tracker
        self._update_state_tracker(event, qr_code)
        
        # Kiểm tra xem event có liên quan đến rule này không
        s1_qr = self.config.get("s1")
        e1_qr = self.config.get("e1")
        e2_qr = self.config.get("e2")
        
        if qr_code not in [s1_qr, e1_qr, e2_qr]:
            return None  # Event không liên quan đến rule này
        
        # Kiểm tra điều kiện và stability sử dụng Hash Table helper
        # Sử dụng _check_stability từ base class để đảm bảo tính nhất quán
        qr_codes = [s1_qr, e1_qr, e2_qr]
        expected_states = ["shelf", "empty", "empty"]
        
        # Check xem tất cả QR codes có states không
        states_exist = all(
            self.hash_tables.get_state(qr) is not None 
            for qr in qr_codes
        )
        
        if not states_exist:
            return None
        
        # Sử dụng Hash Table để kiểm tra stability
        condition_met, stable_duration = self._check_stability(
            qr_codes=qr_codes,
            expected_states=expected_states,
            timestamp=timestamp
        )
        
        stability_time = self.params.get("stability_time_sec", 10)
        
        # Cập nhật internal state để tracking
        if condition_met:
            if not self.internal_state["condition_met"]:
                # Điều kiện vừa mới thỏa mãn (transition từ False -> True)
                self.internal_state["condition_met"] = True
                self.internal_state["condition_start_time"] = timestamp
                self.internal_state["consecutive_violations"] = 0
            
            # Kiểm tra đã ổn định đủ lâu chưa (dựa trên stable_duration từ Hash Table)
            if stable_duration >= stability_time:
                # TRIGGER! Tạo output
                s1_state = self.hash_tables.get_state(s1_qr)
                e1_state = self.hash_tables.get_state(e1_qr)
                e2_state = self.hash_tables.get_state(e2_qr)
                
                output = self._create_output(
                    timestamp=timestamp,
                    s1_state=s1_state,
                    e1_state=e1_state,
                    e2_state=e2_state,
                    stable_duration=stable_duration
                )
                
                # Update statistics
                self.stats["triggers_fired"] += 1
                self.stats["last_trigger_time"] = timestamp
                
                # Reset để tránh trigger liên tục
                self.internal_state["condition_met"] = False
                self.internal_state["condition_start_time"] = 0.0
                self.internal_state["last_trigger_time"] = timestamp
                
                return output
        else:
            # Điều kiện không còn thỏa mãn
            if self.internal_state["condition_met"]:
                # Vừa mới vi phạm
                self.internal_state["consecutive_violations"] += 1
            
            self.internal_state["condition_met"] = False
            self.internal_state["condition_start_time"] = 0.0
        
        return None
    
    def _create_output(
        self,
        timestamp: float,
        s1_state: Dict[str, Any],
        e1_state: Dict[str, Any],
        e2_state: Dict[str, Any],
        stable_duration: float
    ) -> Dict[str, Any]:
        """
        Tạo output khi rule trigger
        
        Returns:
            Dict chứa thông tin output
        """
        s1_qr = self.config.get("s1")
        e1_qr = self.config.get("e1")
        e2_qr = self.config.get("e2")
        
        output = {
            "rule_name": self.rule_name,
            "rule_type": "Pairs",
            "timestamp": timestamp,
            "s1": {
                "qr_code": s1_qr,
                "state": s1_state.get("object_type"),
                "confidence": s1_state.get("confidence", 0.0)
            },
            "e1": {
                "qr_code": e1_qr,
                "state": e1_state.get("object_type"),
                "confidence": e1_state.get("confidence", 0.0)
            },
            "e2": {
                "qr_code": e2_qr,
                "state": e2_state.get("object_type"),
                "confidence": e2_state.get("confidence", 0.0)
            },
            "stable_duration": stable_duration,
            "output_queue": self.params.get("output_queue", "default_queue"),
            "trigger_count": self.stats["triggers_fired"]
        }
        
        return output
    
    def get_rule_description(self) -> str:
        """Mô tả chi tiết rule này"""
        s1_qr = self.config.get("s1")
        e1_qr = self.config.get("e1")
        e2_qr = self.config.get("e2")
        stability_time = self.params.get("stability_time_sec", 10)
        
        return (
            f"PairsLogic '{self.rule_name}': "
            f"s1({s1_qr})=shelf AND e1({e1_qr})=empty AND e2({e2_qr})=empty "
            f"stable for {stability_time}s"
        )

