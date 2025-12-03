"""
Two Point Logic - Logic 2 điểm
Điều kiện: s phải là 'shelf' VÀ e phải là 'empty', ổn định trong X giây

Config example:
{
    "s": "911",   # qr_code của điểm start
    "e": "1011"   # qr_code của điểm end
}

Params example:
{
    "stability_time_sec": 10,
    "output_queue": "Queue_A"
}
"""

from typing import Dict, Any, Optional
from .base_logic import LogicRule


class TwoPointLogic(LogicRule):
    """
    Logic 2 điểm (Two Point Logic)

    Kịch bản:
    - s (start point) có hàng (shelf)
    - e (end point) trống (empty)
    - Trạng thái này ổn định trong stability_time_sec
    → Trigger output
    """

    def _init_internal_state(self):
        """Khởi tạo trạng thái nội bộ của Two Point Logic"""
        self.internal_state = {
            "condition_met": False,
            "condition_start_time": 0.0,
            "last_trigger_time": 0.0,
            "trigger_count": 0,
        }

    def process_event(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Xử lý event cho Two Point Logic

        Flow:
        1. Lấy qr_code từ event
        2. Cập nhật State Tracker
        3. Kiểm tra event có liên quan tới rule không
        4. Kiểm tra điều kiện: s=shelf AND e=empty
        5. Kiểm tra stability bằng HashTables
        6. Nếu đủ lâu thì trigger
        """
        # Tăng counter
        self.stats["events_processed"] += 1

        camera_id = event.get("camera_id")
        slot_id = event.get("slot_id")
        timestamp = event.get("timestamp", 0.0)

        # Tra cứu qr_code
        qr_code = self.hash_tables.get_qr_code(camera_id, slot_id)
        if not qr_code:
            return None

        # Cập nhật State Tracker
        self._update_state_tracker(event, qr_code)

        # Lấy config
        s_qr = self.config.get("s")
        e_qr = self.config.get("e")

        # Event không liên quan rule này
        if qr_code not in [s_qr, e_qr]:
            return None

        # Đảm bảo đã có state của cả 2 điểm
        s_state = self.hash_tables.get_state(s_qr)
        e_state = self.hash_tables.get_state(e_qr)
        if not (s_state and e_state):
            return None

        stability_time = self.params.get("stability_time_sec", 10)

        # Kiểm tra điều kiện & stability bằng helper của base class
        qr_codes = [s_qr,e_qr]
        expected_states = ["shelf", "empty"]

        condition_met, stable_duration = self._check_stability(
            qr_codes=qr_codes,
            expected_states=expected_states,
            timestamp=timestamp,
        )

        # DEBUG
        import logging

        logger = logging.getLogger("LogicProcessor")
        logger.debug(
            f"[{self.rule_name}] s({s_qr})={s_state.get('object_type') if s_state else 'None'}, "
            f"e({e_qr})={e_state.get('object_type') if e_state else 'None'} | "
            f"Match={condition_met}, Stable={stable_duration:.1f}s/{stability_time}s"
        )

        if condition_met and stable_duration >= stability_time:
            # TRIGGER
            output = self._create_output(
                timestamp=timestamp,
                s_state=s_state,
                e_state=e_state,
                stable_duration=stable_duration,
            )

            self.stats["triggers_fired"] += 1
            self.stats["last_trigger_time"] = timestamp
            self.internal_state["last_trigger_time"] = timestamp
            self.internal_state["trigger_count"] += 1
            self.internal_state["condition_met"] = False
            self.internal_state["condition_start_time"] = 0.0

            return output

        # Nếu điều kiện không còn thỏa
        if not condition_met:
            self.internal_state["condition_met"] = False
            self.internal_state["condition_start_time"] = 0.0

        return None

    def _create_output(
        self,
        timestamp: float,
        s_state: Dict[str, Any],
        e_state: Dict[str, Any],
        stable_duration: float,
    ) -> Dict[str, Any]:
        """Tạo output khi rule trigger"""
        s_qr = self.config.get("s")
        e_qr = self.config.get("e")

        output = {
            # "rule_name": self.rule_name,
            "rule_type": "2point",
            # "timestamp": timestamp,
            "s": {
                "qr_code": s_qr,
                "state": s_state.get("object_type"),
                # "confidence": s_state.get("confidence", 0.0),
            },
            "e": {
                "qr_code": e_qr,
                "state": e_state.get("object_type"),
                # "confidence": e_state.get("confidence", 0.0),
            },
            "stable_duration": stable_duration,
            "output_queue": self.params.get("output_queue", "default_queue"),
            "trigger_count": self.internal_state.get("trigger_count", 0),
        }

        return output

    def get_rule_description(self) -> str:
        """Mô tả chi tiết rule này"""
        s_qr = self.config.get("s")
        e_qr = self.config.get("e")
        stability_time = self.params.get("stability_time_sec", 10)

        return (
            f"TwoPointLogic '{self.rule_name}': "
            f"s({s_qr})=shelf AND e({e_qr})=empty "
            f"stable for {stability_time}s"
        )


