# File: main.py
import time
import threading
from config import CAMERAS, ICS_URL, VALIDATE_PAIRS
from state_manager import StateManager
from pair_manager import pair_points, trigger_post, get_validate_pairs
from camera_processor import CameraProcessor
from setup_log import setup_logger

logger = setup_logger("main", "logs/main/log")

def main():
    state_manager = StateManager()
    validate_pairs = get_validate_pairs(VALIDATE_PAIRS)
    
    # Separate start and end points (though managed in state_manager)
    start_point_list = [roi["node_id"] for cam in CAMERAS for roi in cam["rois"] if roi["node_id"].startswith("start_")]
    end_point_list = [roi["node_id"] for cam in CAMERAS for roi in cam["rois"] if roi["node_id"].startswith("end_")]
    logger.info(f"Start points: {start_point_list}")
    logger.info(f"End points: {end_point_list}")
    
    # Start camera threads
    threads = []
    for cam in CAMERAS:
        thread = CameraProcessor(cam["rtsp"], cam["rois"], state_manager)
        threads.append(thread)
        thread.start()
    
    while True:
        print("Starting ...")
        state_manager.process_starts()
        #logger.debug(f"Ready start list: {state_manager.ready_start_list}")
        state_manager.process_ends()
        #logger.debug(f"Ready end list: {state_manager.ready_end_list}")
        
        ready_pair, payloads = pair_points(state_manager.ready_start_list, state_manager.ready_end_list, validate_pairs)
        
        for pair in ready_pair:
            for payload in payloads:
                success = trigger_post(ICS_URL, payload)
                logger.debug(f"Trigger POST for pair {pair} with payload {payload}")
                logger.debug(f"POST success: {success}")
                if success:
                    state_manager.points[pair[0]]["flag"] = True
                    state_manager.ready_start_list.remove(pair[0])
                    state_manager.waiting_start_list.append(pair[0])
                    logger.debug(f"state_manager.points[pair[0]]: {state_manager.points[pair[0]]}")
                    state_manager.points[pair[1]]["flag"] = True
                    state_manager.ready_end_list.remove(pair[1])
                    state_manager.waiting_end_list.append(pair[1])
                    logger.debug(f"state_manager.points[pair[1]]: {state_manager.points[pair[1]]}")
                else:
                    logger.error("Failed to post")

        time.sleep(1)  # Main loop delay

if __name__ == "__main__":
    main()