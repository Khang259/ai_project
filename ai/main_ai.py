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
        state_manager.process_ends()
        
        ready_pairs = pair_points(state_manager.ready_start_list, state_manager.ready_end_list, validate_pairs)
        
        for pair in ready_pairs:
            success = trigger_post(pair, ICS_URL)
            if success:
                state_manager.points[pair[0]]["flag"] = True
                logger.info(f"Set flag True for {pair[0]}")
            else:
                logger.error("Failed to post")
        
        time.sleep(1)  # Main loop delay

if __name__ == "__main__":
    main()