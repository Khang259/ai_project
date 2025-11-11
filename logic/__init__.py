"""
Logic Package - Hệ thống xử lý nghiệp vụ dựa trên ROI detection

Package này cung cấp:
- Hash Tables: Quản lý ánh xạ camera/slot -> qr_code và state tracking
- Logic Rules: Các quy tắc nghiệp vụ (Pairs, Dual, ...)
- Logic Processor: Core processor xử lý Queue và điều phối rules

Usage:
    from logic import logic_processor_worker
    
    # Trong main process
    logic_process = Process(
        target=logic_processor_worker,
        args=(input_queue, output_queue, "logic/config.json")
    )
    logic_process.start()
"""

# Core components
from .hash_tables import HashTables
from .base_logic import LogicRule
from .logic_processor import LogicProcessor, logic_processor_worker

# Logic implementations
from .pairs_logic import PairsLogic
from .dual_logic import DualLogic

# Version info
__version__ = "1.0.0"
__author__ = "ROI Logic Team"

# Public API
__all__ = [
    # Core
    "HashTables",
    "LogicRule",
    "LogicProcessor",
    "logic_processor_worker",
    
    # Logic types
    "PairsLogic",
    "DualLogic",
]

