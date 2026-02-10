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
        self.waiting_start_list = []
        self.waiting_end_list = []
        self.pair_mapping = {}
        self.order_mapping = {}  # {orderId: (start_point, end_point)}

    def get_state_nodes(self, node_id, state):
        current = self.points[node_id]
        old_state = current["state"]

        current["state"] = state

        if (old_state != state or current["time"] == 0):
            if (node_id.startswith("start_") and state) or \
                (node_id.startswith("end_") and not state):
                current["time"] = time.time()
                #logger.debug(f"Time set for {node_id} (change or initial): {old_state} -> {state}, time={current['time']}")
    
    def process_starts(self):
        current_time = time.time()
        """Process logic for start points."""
        for node_id, data in list(self.points.items()):
            if not node_id.startswith("start_"):
                continue

            if not data["flag"]:
                if data["state"]:
                    existed_time = current_time - data["time"]
                    logger.debug(f"existed_time time start for {node_id} is {existed_time} seconds")
                    if existed_time > 10:
                        if node_id not in self.ready_start_list and node_id not in self.waiting_start_list:
                            self.ready_start_list.append(node_id)
                            logger.info(f"Added {node_id} to ready_start_list at {current_time}")
            else:
                if not data["state"]:
                    if node_id in self.waiting_start_list:
                        self.waiting_start_list.remove(node_id)
                        data["time"] = 0
                        logger.info(f"Removed {node_id} from ready_start_list at {current_time} and reset time")
                        logger.debug(f"Ready start list: {self.ready_start_list}")

    def process_ends(self):
        """Process logic for end points."""
        current_time = time.time()
        for node_id, data in list(self.points.items()):
            if not node_id.startswith("end_"):
                continue
            if not data["flag"]:
                if not data["state"]:
                    #logger.debug(f"End point {node_id} is active at {current_time}")
                    existed_time = current_time - data["time"]
                    #logger.debug(f"Checking time node change {data['time']}")
                    #logger.debug(f"existed_time time end for {node_id} is {existed_time} seconds")
                    if existed_time > 10:
                        if node_id not in self.ready_end_list and node_id not in self.waiting_end_list:
                            self.ready_end_list.append(node_id)
                            logger.info(f"Added {node_id} to ready_end_list at {current_time}")
                            logger.debug(f"Ready end list: {self.ready_end_list}")
            else:
                if data["state"]:
                    if node_id in self.waiting_end_list:
                        self.waiting_end_list.remove(node_id)
                        data["flag"] = False
                        data["time"] = 0
                        if node_id in self.pair_mapping:
                            start_id = self.pair_mapping[node_id]
                            self.points[start_id]["flag"] = False
                            del self.pair_mapping[node_id]  # Xóa mapping sau khi dùng
                            logger.info(f"Reset flag for pair ({start_id}, {node_id})")
                        logger.info(f"Removed {node_id} from ready_end_list at {current_time} and reset time")