# File: state_manager.py
import time
from collections import defaultdict
from setup_log import setup_logger

logger = setup_logger("state_manager", "logs/state_manager/log")

class StateManager:
    def __init__(self):
        self.points = defaultdict(lambda: {"state": False, "time": 0, "flag": False})
        self.ready_start_list = []
        self.ready_end_list = []
    
    def update_state(self, node_id, new_state):
        """Update state and time for a node."""
        current = self.points[node_id]
        if current["state"] != new_state:
            current["state"] = new_state
            current["time"] = time.time()
            logger.info(f"Updated {node_id} state to {new_state} at {current['time']}")
    
    def process_starts(self):
        """Process logic for start points."""
        for node_id, data in list(self.points.items()):
            if not node_id.startswith("start_"):
                continue
            
            if not data["flag"]:
                if data["state"]:
                    elapsed = time.time() - data["time"]
                    if elapsed > 10:
                        if node_id not in self.ready_start_list:
                            self.ready_start_list.append(node_id)
                            logger.info(f"Added {node_id} to ready_start_list")
            else:
                if not data["state"]:
                    if node_id in self.ready_start_list:
                        self.ready_start_list.remove(node_id)
                        data["time"] = 0
                        logger.info(f"Removed {node_id} from ready_start_list and reset time")

    def process_ends(self):
        """Process logic for end points."""
        for node_id, data in list(self.points.items()):
            if not node_id.startswith("end_"):
                continue
            
            if not data["flag"]:
                if not data["state"]:
                    elapsed = time.time() - data["time"]
                    if elapsed > 10:
                        if node_id not in self.ready_end_list:
                            self.ready_end_list.append(node_id)
                            logger.info(f"Added {node_id} to ready_end_list")
            else:
                if data["state"]:
                    if node_id in self.ready_end_list:
                        self.ready_end_list.remove(node_id)
                        data["time"] = 0
                        logger.info(f"Removed {node_id} from ready_end_list and reset time")