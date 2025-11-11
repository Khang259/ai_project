"""
Logic Processor - "Trái tim" của hệ thống
Xử lý Queue 1 (input từ roi_checker) và điều phối các Logic Rules
Gửi kết quả vào Queue 2 (output)
"""

import time
import json
from pathlib import Path
from multiprocessing import Queue
from typing import Dict, List, Any, Optional

from .hash_tables import HashTables
from .base_logic import LogicRule
from .pairs_logic import PairsLogic
from .dual_logic import DualLogic


class LogicProcessor:
    """
    Core processor - Xử lý Queue và điều phối các Logic Rules
    
    Nhiệm vụ:
    1. Khởi tạo Hash Tables từ config
    2. Load và khởi tạo các Logic Rules
    3. Xử lý events từ Queue 1
    4. Điều phối events đến các rules liên quan
    5. Gửi outputs vào Queue 2
    """
    
    def __init__(self, config_path: str = "config.json"):
        """
        Khởi tạo Logic Processor
        
        Args:
            config_path: Đường dẫn đến file config.json
        """
        self.config_path = config_path
        
        # Khởi tạo Hash Tables (4 Hash Tables trong RAM)
        self.hash_tables = HashTables(config_path)
        
        # Danh sách các logic rules đã load
        self.logic_rules: List[LogicRule] = []
        
        # Statistics
        self.stats = {
            "total_events_processed": 0,
            "total_outputs_generated": 0,
            "start_time": time.time(),
            "last_event_time": 0
        }
        
        # Load rules từ config
        self._load_logic_rules()
    
    def _load_logic_rules(self):
        """
        Load và khởi tạo các logic rules từ config.json
        
        Đọc section "rules" trong config, tạo instance của từng rule
        và đăng ký vào trigger_map
        """
        config_path = Path(self.config_path)
        
        if not config_path.exists():
            print(f"Config file không tồn tại: {self.config_path}")
            return
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            rules = config.get("rules", [])
            
            if not rules:
                return
            
            for rule_config in rules:
                rule_name = rule_config.get("rule_name")
                logic_type = rule_config.get("logic_type")
                rule_cfg = rule_config.get("config", {})
                params = rule_config.get("params", {})
                
                # Factory pattern: Tạo logic rule tùy theo type
                logic_rule = self._create_logic_rule(
                    logic_type=logic_type,
                    rule_name=rule_name,
                    rule_cfg=rule_cfg,
                    params=params
                )
                
                if logic_rule:
                    self.logic_rules.append(logic_rule)
                    
                    # Đăng ký vào trigger_map (Hash Table 3)
                    self._register_rule_triggers(logic_rule)
            
        except Exception as e:
            import logging
            logger = logging.getLogger('LogicProcessor')
            logger.error(f"Error loading logic rules: {e}")
    
    def _create_logic_rule(
        self,
        logic_type: str,
        rule_name: str,
        rule_cfg: Dict[str, Any],
        params: Dict[str, Any]
    ) -> Optional[LogicRule]:
        """
        Factory method để tạo logic rule instance
        
        Args:
            logic_type: Loại logic ("Pairs", "Dual", ...)
            rule_name: Tên rule
            rule_cfg: Config của rule
            params: Parameters của rule
            
        Returns:
            LogicRule instance hoặc None nếu không hợp lệ
        """
        if logic_type == "Pairs":
            return PairsLogic(rule_name, rule_cfg, params, self.hash_tables)
        elif logic_type == "Dual":
            return DualLogic(rule_name, rule_cfg, params, self.hash_tables)
        else:
            # Có thể thêm các logic types khác ở đây
            return None
    
    def _register_rule_triggers(self, logic_rule: LogicRule):
        """
        Đăng ký rule vào trigger_map
        
        Với mỗi qr_code mà rule quan tâm, đăng ký rule vào trigger_map
        để khi có event liên quan đến qr_code đó, rule sẽ được gọi
        
        Args:
            logic_rule: LogicRule instance
        """
        involved_qr_codes = logic_rule.get_involved_qr_codes()
        
        for qr_code in involved_qr_codes:
            self.hash_tables.register_rule_trigger(qr_code, logic_rule)
    
    def process_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Xử lý một event từ Queue 1
        
        Flow:
        1. Lấy qr_code từ (camera_id, slot_id)
        2. Tra cứu các rules liên quan đến qr_code này
        3. Cho từng rule xử lý event
        4. Thu thập outputs từ các rules
        
        Args:
            event: Event từ roi_checker
                   {
                       "camera_id": "cam-1",
                       "timestamp": 1678886400,
                       "slot_id": "1",
                       "object_type": "shelf",
                       "confidence": 0.95,
                       "iou": 0.85,
                       "bbox": [10, 15, 50, 60]
                   }
        
        Returns:
            List các outputs (để gửi vào Queue 2)
        """
        self.stats["total_events_processed"] += 1
        self.stats["last_event_time"] = event.get("timestamp", 0)
        
        outputs = []
        
        camera_id = event.get("camera_id")
        slot_id = event.get("slot_id")
        object_type = event.get("object_type")
        
        # DEBUG: Log mỗi event nhận được
        import logging
        logger = logging.getLogger('LogicProcessor')
        logger.debug(f"Event: {camera_id}/{slot_id} = {object_type}")
        
        # Tra cứu qr_code từ Hash Table 1
        qr_code = self.hash_tables.get_qr_code(camera_id, slot_id)
        
        if not qr_code:
            # Không có mapping cho camera_id/slot_id này
            # Bỏ qua event (không liên quan đến bất kỳ rule nào)
            logger.debug(f"No QR code mapping for {camera_id}/{slot_id}")
            return outputs
        
        logger.debug(f"QR code: {qr_code}")
        
        # Tra cứu các rules liên quan từ Hash Table 3 (trigger_map)
        related_rules = self.hash_tables.get_triggered_rules(qr_code)
        
        if not related_rules:
            # Không có rule nào quan tâm đến qr_code này
            return outputs
        
        # Cho từng rule xử lý event
        for rule in related_rules:
            try:
                result = rule.process_event(event)
                if result:
                    outputs.append(result)
                    self.stats["total_outputs_generated"] += 1
            except Exception as e:
                import logging
                logger = logging.getLogger('LogicProcessor')
                logger.error(f"Error in rule '{rule.rule_name}': {e}")
        
        return outputs
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Lấy thống kê về Logic Processor
        
        Returns:
            Dict chứa thống kê tổng quan
        """
        uptime = time.time() - self.stats["start_time"]
        
        # Thống kê từng rule
        rules_stats = []
        for rule in self.logic_rules:
            rules_stats.append(rule.get_statistics())
        
        # Thống kê Hash Tables
        hash_tables_stats = self.hash_tables.get_statistics()
        
        return {
            "processor": {
                "uptime_seconds": uptime,
                "total_events_processed": self.stats["total_events_processed"],
                "total_outputs_generated": self.stats["total_outputs_generated"],
                "events_per_second": self.stats["total_events_processed"] / uptime if uptime > 0 else 0,
                "last_event_time": self.stats["last_event_time"]
            },
            "hash_tables": hash_tables_stats,
            "rules": rules_stats
        }
    
    # def print_statistics(self):
    #     """In thống kê ra console"""
    #     stats = self.get_statistics()
        
    #     print("\n" + "="*60)
    #     print("LOGIC PROCESSOR STATISTICS")
    #     print("="*60)
        
    #     proc_stats = stats["processor"]
    #     print(f"\n⏱Uptime: {proc_stats['uptime_seconds']:.1f}s")
    #     print(f"Events processed: {proc_stats['total_events_processed']}")
    #     print(f"Outputs generated: {proc_stats['total_outputs_generated']}")
    #     print(f"Events/sec: {proc_stats['events_per_second']:.2f}")
        
    #     print(f"\nHash Tables:")
    #     ht_stats = stats["hash_tables"]
    #     print(f"   - Total points: {ht_stats['total_points']}")
    #     print(f"   - QR codes with triggers: {ht_stats['total_qr_codes_with_triggers']}")
        
    #     print(f"\nRules ({len(stats['rules'])} total):")
    #     for rule_stat in stats["rules"]:
    #         print(f"   - {rule_stat['rule_name']} ({rule_stat['rule_type']})")
    #         print(f"     Events: {rule_stat['events_processed']} | Triggers: {rule_stat['triggers_fired']}")
        
    #     print("="*60 + "\n")
    
    def reload_config(self):
        """
        Reload config (hot-reload)
        
        Lưu ý: Chỉ reload Hash Tables, không reload rules
        (reload rules cần restart process)
        """
        import logging
        logger = logging.getLogger('LogicProcessor')
        logger.info("Reloading config...")
        self.hash_tables.reload_config()
        logger.info("Reload completed")


# ============================================================================
# WORKER PROCESS - Chạy trong multiprocessing.Process
# ============================================================================

def logic_processor_worker(
    input_queue: Queue,
    output_queue: Queue,
    config_path: str = "config.json",
    log_file: Optional[str] = None
):
    """
    Worker process - "Trái tim" của hệ thống
    
    Đây là process chạy liên tục, đọc events từ Queue 1,
    xử lý qua Logic Processor, và gửi outputs vào Queue 2
    
    Args:
        input_queue: Queue 1 - Nhận events từ roi_checker
        output_queue: Queue 2 - Gửi kết quả ra ngoài
        config_path: Đường dẫn file config.json
    """
    import logging
    # Thiết lập logging trong process nếu có log_file được truyền vào
    if log_file:
        root_logger = logging.getLogger()
        if not root_logger.handlers:
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s | %(levelname)s | %(processName)s | %(message)s',
                handlers=[logging.FileHandler(log_file, encoding='utf-8')]
            )
    logger = logging.getLogger('LogicProcessor')
    
    logger.info("=" * 60)
    logger.info("LOGIC PROCESSOR WORKER STARTING")
    logger.info("=" * 60)
    
    # Khởi tạo Logic Processor
    processor = LogicProcessor(config_path)
    
    logger.info(f"Configuration:")
    logger.info(f"  - Config path: {config_path}")
    logger.info(f"  - Hash Tables: {len(processor.hash_tables.key_to_qr_map)} points")
    logger.info(f"  - Logic Rules: {len(processor.logic_rules)} rules")
    logger.info(f"Starting event processing loop...")
    logger.info("=" * 60)
    
    event_count = 0
    output_count = 0
    last_stats_time = time.time()
    stats_interval = 60  # In stats mỗi 60 giây
    
    try:
        while True:
            try:
                # Đọc event từ Queue 1 với timeout
                event = input_queue.get(timeout=1.0)
                event_count += 1
                
                # Xử lý event qua Logic Processor
                outputs = processor.process_event(event)
                
                # Gửi kết quả vào Queue 2 (Queue B)
                for output in outputs:
                    try:
                        # Extract QR codes từ output
                        qr_codes = []
                        rule_type = output.get('rule_type', 'unknown')
                        
                        if rule_type == 'Pairs':
                            # Pairs: s1, e1, e2
                            s1_qr = output.get('s1',{}).get('qr_code')
                            e1_qr = output.get('e1',{}).get('qr_code')
                            e2_qr = output.get('e2',{}).get('qr_code')
                            if s1_qr:
                                qr_codes.append(s1_qr)
                            if e1_qr:
                                qr_codes.append(e1_qr)
                            if e2_qr:
                                qr_codes.append(e2_qr)
                        elif rule_type == 'Dual':
                            # Dual: s, e
                            s_qr = output.get('s', {}).get('qr_code')
                            e_qr = output.get('e', {}).get('qr_code')
                            if s_qr:
                                qr_codes.append(s_qr)
                            if e_qr:
                                qr_codes.append(e_qr)
                        
                        # Tạo phần tử đơn giản chứa QR codes
                        queue_item = {
                            "qr_codes": qr_codes,
                            "rule_name": output.get('rule_name', 'unknown'),
                            "rule_type": rule_type,
                            "timestamp": output.get('timestamp', 0.0)
                        }
                        
                        # Put vào queue (chỉ QR codes)
                        output_queue.put(queue_item, block=False)
                        output_count += 1
                        
                        # Log ngắn gọn: Time - Put (QR1, QR2, ...)
                        qr_codes_str = ", ".join(qr_codes) if qr_codes else "N/A"
                        logger.info(f"Put ({qr_codes_str})")
                        
                    except Exception as e:
                        logger.error(f"ERROR putting into Queue B: {e}")
                
            except Exception:
                # Queue timeout hoặc lỗi khác
                time.sleep(0.01)
                
    except KeyboardInterrupt:
        logger.info("Received KeyboardInterrupt, shutting down...")
        logger.info(f"Final Summary - Events: {event_count}, Outputs: {output_count}")
        
    except Exception as e:
        logger.error(f"Fatal error in Logic Processor Worker: {e}")

