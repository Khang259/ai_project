"""
Base Logic - Abstract Base Class cho tất cả Logic Rules
Định nghĩa interface chung mà mọi logic rule phải implement
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional


class LogicRule(ABC):
    """
    Base class cho tất cả các Logic Rules
    
    Mỗi Logic Rule:
    - Nhận event từ Queue
    - Tự quản lý internal state của riêng nó
    - Kiểm tra điều kiện và tính toán stability
    - Trả về output khi trigger
    """
    
    def __init__(
        self, 
        rule_name: str, 
        config: Dict[str, Any], 
        params: Dict[str, Any], 
        hash_tables: Any
    ):
        """
        Khởi tạo Logic Rule
        
        Args:
            rule_name: Tên rule (unique identifier)
            config: Config của rule (ví dụ: {"s1": "000", "e1": "111"})
            params: Parameters của rule (ví dụ: {"stability_time_sec": 10})
            hash_tables: Reference đến HashTables object
        """
        self.rule_name = rule_name
        self.config = config
        self.params = params
        self.hash_tables = hash_tables
        
        # Internal state của rule (mỗi rule tự quản lý)
        self.internal_state: Dict[str, Any] = {}
        
        # Khởi tạo internal state
        self._init_internal_state()
        
        # Statistics
        self.stats = {
            "events_processed": 0,
            "triggers_fired": 0,
            "last_trigger_time": 0
        }
    
    @abstractmethod
    def _init_internal_state(self):
        """
        Khởi tạo trạng thái nội bộ của rule
        
        Mỗi rule tự định nghĩa state của nó
        Ví dụ: condition_met, condition_start_time, etc.
        """
        pass
    
    @abstractmethod
    def process_event(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Xử lý event từ Queue
        
        Args:
            event: Event từ roi_checker
                   {
                       "camera_id": "cam-1",
                       "timestamp": 1678886400,
                       "slot_id": "1",
                       "object_type": "shelf",  # hoặc "empty"
                       "confidence": 0.95,
                       "iou": 0.85,
                       "bbox": [10, 15, 50, 60]
                   }
        
        Returns:
            Dict chứa output nếu rule trigger, None nếu chưa trigger
            {
                "rule_name": "logic_3diem",
                "rule_type": "Pairs",
                "timestamp": 1678886400,
                "s1": {...},
                "e1": {...},
                "e2": {...},
                "stable_duration": 10.5,
                "output_queue": "Queue_A"
            }
        """
        pass
    
    def get_involved_qr_codes(self) -> List[str]:
        """
        Lấy danh sách các qr_code mà rule này quan tâm
        
        Returns:
            List các qr_code trong config của rule
        """
        return list(self.config.values())
    
    def reset_internal_state(self):
        """Reset internal state về trạng thái ban đầu"""
        self._init_internal_state()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Lấy thống kê về rule này"""
        return {
            "rule_name": self.rule_name,
            "rule_type": self.__class__.__name__,
            "events_processed": self.stats["events_processed"],
            "triggers_fired": self.stats["triggers_fired"],
            "last_trigger_time": self.stats["last_trigger_time"],
            "internal_state": self.internal_state.copy()
        }
    
    def _update_state_tracker(self, event: Dict[str, Any], qr_code: str):
        """
        Helper method: Cập nhật State Tracker (Single Source of Truth)
        
        Args:
            event: Event từ Queue
            qr_code: QR code cần update
        """
        timestamp = event.get("timestamp", 0)
        object_type = event.get("object_type")
        confidence = event.get("confidence", 0.0)
        
        # Lấy state hiện tại
        current_state = self.hash_tables.get_state(qr_code)
        
        if current_state:
            old_object_type = current_state.get("object_type")
            
            # Nếu object_type thay đổi, reset stable_since
            if old_object_type != object_type:
                stable_since = timestamp
            else:
                stable_since = current_state.get("stable_since", timestamp)
            
            # Update state
            self.hash_tables.update_state(qr_code, {
                "object_type": object_type,
                "confidence": confidence,
                "last_update": timestamp,
                "stable_since": stable_since
            })
    
    def _check_stability(
        self, 
        qr_codes: List[str], 
        expected_states: List[str],
        timestamp: float
    ) -> tuple[bool, float]:
        """
        Helper method: Kiểm tra xem các qr_code đã ở trạng thái mong muốn
        và ổn định trong bao lâu
        
        Args:
            qr_codes: List các qr_code cần kiểm tra
            expected_states: List các trạng thái mong muốn tương ứng
            timestamp: Timestamp hiện tại
            
        Returns:
            Tuple (all_match, min_stable_duration)
            - all_match: True nếu tất cả đều match
            - min_stable_duration: Thời gian ổn định tối thiểu (giây)
        """
        all_match = True
        min_stable_since = timestamp
        
        for qr_code, expected_state in zip(qr_codes, expected_states):
            state = self.hash_tables.get_state(qr_code)
            
            if not state:
                all_match = False
                break
            
            if state.get("object_type") != expected_state:
                all_match = False
                break
            
            # Track thời điểm ổn định sớm nhất
            stable_since = state.get("stable_since", timestamp)
            if stable_since < min_stable_since:
                min_stable_since = stable_since
        
        if all_match:
            min_stable_duration = timestamp - min_stable_since
        else:
            min_stable_duration = 0.0
        
        return all_match, min_stable_duration
    
    def __repr__(self) -> str:
        """String representation của rule"""
        return f"<{self.__class__.__name__} '{self.rule_name}'>"

