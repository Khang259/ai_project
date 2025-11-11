"""
Dual Logic - Logic 4 điểm
Điều kiện: (s1=shelf AND e1=empty) OR (s2=shelf AND e2=empty), ổn định trong X giây

Config example:
{
    "s1": "333",  # qr_code của start point 1
    "e1": "444",  # qr_code của end point 1
    "s2": "555",  # qr_code của start point 2
    "e2": "666"   # qr_code của end point 2
}

Params example:
{
    "stability_time_sec": 5,
    "output_queue": "Queue_B"
}
"""

from typing import Dict, Any, Optional
from .base_logic import LogicRule


class DualLogic(LogicRule):
    """
    Logic 4 điểm (Dual Logic)
    
    Kịch bản:
    - Pair 1: s1 có hàng (shelf) AND e1 trống (empty)
    - Pair 2: s2 có hàng (shelf) AND e2 trống (empty)
    - Nếu bất kỳ pair nào ổn định trong stability_time_sec → Trigger output
    
    Note: 2 pairs hoạt động độc lập, có thể trigger riêng biệt
    """
    
    def _init_internal_state(self):
        """Khởi tạo trạng thái nội bộ của Dual Logic"""
        self.internal_state = {
            # Pair 1 state
            "pair1_met": False,
            "pair1_start_time": 0.0,
            "pair1_last_trigger": 0.0,
            
            # Pair 2 state
            "pair2_met": False,
            "pair2_start_time": 0.0,
            "pair2_last_trigger": 0.0,
            
            # Statistics
            "pair1_trigger_count": 0,
            "pair2_trigger_count": 0
        }
    
    def process_event(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Xử lý event cho Dual Logic
        
        Logic flow:
        1. Lấy qr_code từ event
        2. Cập nhật State Tracker
        3. Kiểm tra xem event có liên quan đến rule này không
        4. Kiểm tra Pair 1: s1=shelf AND e1=empty
        5. Kiểm tra Pair 2: s2=shelf AND e2=empty
        6. Trigger nếu bất kỳ pair nào ổn định đủ lâu
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
        
        # Lấy config
        s1_qr = self.config.get("s1")
        e1_qr = self.config.get("e1")
        s2_qr = self.config.get("s2")
        e2_qr = self.config.get("e2")
        
        # Kiểm tra event có liên quan không
        if qr_code not in [s1_qr, e1_qr, s2_qr, e2_qr]:
            return None
        
        # Lấy trạng thái của 4 điểm
        s1_state = self.hash_tables.get_state(s1_qr)
        e1_state = self.hash_tables.get_state(e1_qr)
        s2_state = self.hash_tables.get_state(s2_qr)
        e2_state = self.hash_tables.get_state(e2_qr)
        
        if not all([s1_state, e1_state, s2_state, e2_state]):
            return None
        
        stability_time = self.params.get("stability_time_sec", 5)
        
        # Kiểm tra Pair 1: s1=shelf AND e1=empty
        output = self._check_pair(
            pair_name="pair1",
            s_qr=s1_qr,
            e_qr=e1_qr,
            s_state=s1_state,
            e_state=e1_state,
            timestamp=timestamp,
            stability_time=stability_time
        )
        
        if output:
            return output
        
        # Kiểm tra Pair 2: s2=shelf AND e2=empty
        output = self._check_pair(
            pair_name="pair2",
            s_qr=s2_qr,
            e_qr=e2_qr,
            s_state=s2_state,
            e_state=e2_state,
            timestamp=timestamp,
            stability_time=stability_time
        )
        
        return output
    
    def _check_pair(
        self,
        pair_name: str,
        s_qr: str,
        e_qr: str,
        s_state: Dict[str, Any],
        e_state: Dict[str, Any],
        timestamp: float,
        stability_time: float
    ) -> Optional[Dict[str, Any]]:
        """
        Kiểm tra một pair (s, e) sử dụng Hash Table để xác định stability
        
        Args:
            pair_name: "pair1" hoặc "pair2"
            s_qr: QR code của start point
            e_qr: QR code của end point
            s_state: State của start point
            e_state: State của end point
            timestamp: Timestamp hiện tại
            stability_time: Thời gian ổn định yêu cầu
            
        Returns:
            Output dict nếu trigger, None nếu không
        """
        # Sử dụng Hash Table helper để kiểm tra stability
        qr_codes = [s_qr, e_qr]
        expected_states = ["shelf", "empty"]
        
        # Check điều kiện và stability từ Hash Table
        pair_condition, stable_duration = self._check_stability(
            qr_codes=qr_codes,
            expected_states=expected_states,
            timestamp=timestamp
        )
        
        met_key = f"{pair_name}_met"
        start_time_key = f"{pair_name}_start_time"
        last_trigger_key = f"{pair_name}_last_trigger"
        trigger_count_key = f"{pair_name}_trigger_count"
        
        if pair_condition:
            # Điều kiện đang thỏa mãn (dựa trên Hash Table state)
            if not self.internal_state[met_key]:
                # Vừa mới thỏa mãn
                self.internal_state[met_key] = True
                self.internal_state[start_time_key] = timestamp
            
            # Kiểm tra đã ổn định đủ lâu chưa (stable_duration từ Hash Table)
            if stable_duration >= stability_time:
                # TRIGGER!
                output = self._create_output(
                    pair_name=pair_name,
                    s_qr=s_qr,
                    e_qr=e_qr,
                    s_state=s_state,
                    e_state=e_state,
                    timestamp=timestamp,
                    stable_duration=stable_duration
                )
                
                # Update statistics
                self.stats["triggers_fired"] += 1
                self.stats["last_trigger_time"] = timestamp
                self.internal_state[trigger_count_key] += 1
                
                # Reset
                self.internal_state[met_key] = False
                self.internal_state[start_time_key] = 0.0
                self.internal_state[last_trigger_key] = timestamp
                
                return output
        else:
            # Điều kiện không thỏa mãn
            self.internal_state[met_key] = False
            self.internal_state[start_time_key] = 0.0
        
        return None
    
    def _create_output(
        self,
        pair_name: str,
        s_qr: str,
        e_qr: str,
        s_state: Dict[str, Any],
        e_state: Dict[str, Any],
        timestamp: float,
        stable_duration: float
    ) -> Dict[str, Any]:
        """
        Tạo output khi pair trigger
        
        Returns:
            Dict chứa thông tin output
        """
        output = {
            "rule_name": self.rule_name,
            "rule_type": "Dual",
            "pair": pair_name,  # "pair1" hoặc "pair2"
            "timestamp": timestamp,
            "s": {
                "qr_code": s_qr,
                "state": s_state.get("object_type"),
                "confidence": s_state.get("confidence", 0.0)
            },
            "e": {
                "qr_code": e_qr,
                "state": e_state.get("object_type"),
                "confidence": e_state.get("confidence", 0.0)
            },
            "stable_duration": stable_duration,
            "output_queue": self.params.get("output_queue", "default_queue"),
            "trigger_count": self.stats["triggers_fired"],
            "pair_trigger_count": self.internal_state.get(f"{pair_name}_trigger_count", 0)
        }
        
        return output
    
    def get_rule_description(self) -> str:
        """Mô tả chi tiết rule này"""
        s1_qr = self.config.get("s1")
        e1_qr = self.config.get("e1")
        s2_qr = self.config.get("s2")
        e2_qr = self.config.get("e2")
        stability_time = self.params.get("stability_time_sec", 5)
        
        return (
            f"DualLogic '{self.rule_name}': "
            f"[s1({s1_qr})=shelf AND e1({e1_qr})=empty] OR "
            f"[s2({s2_qr})=shelf AND e2({e2_qr})=empty] "
            f"stable for {stability_time}s"
        )

