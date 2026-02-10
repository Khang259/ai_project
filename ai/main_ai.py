# File: main.py
import time
import threading
import uvicorn
from config import CAMERAS, ICS_URL, VALIDATE_PAIRS
from state_manager import StateManager
from pair_manager import pair_points, trigger_post, get_validate_pairs
from camera_processor import CameraProcessor
from gui_monitor import GUIMonitor
from setup_log import setup_logger
import api_server

logger = setup_logger("main", "logs/main/log")

def run_api_server(state_manager):
    """Run FastAPI server in separate thread."""
    api_server.set_state_manager(state_manager)
    uvicorn.run(
        api_server.app,
        host="192.168.1.30",
        port=5000,
        log_level="info"
    )

def main():
    state_manager = StateManager()
    validate_pairs = get_validate_pairs(VALIDATE_PAIRS)
    
    # Tạo thread cho API server
    api_thread = threading.Thread(
        target=run_api_server,
        args=(state_manager,),
        daemon=True
    )
    api_thread.start()
    logger.info("API server started on http://192.168.1.30:5000")
    
    # Tạo thread cho main processing loop
    processing_thread = threading.Thread(
        target=processing_loop, 
        args=(state_manager, validate_pairs),
        daemon=True
    )
    processing_thread.start()
    
    # Khởi tạo GUI trong main thread
    gui = GUIMonitor(state_manager, VALIDATE_PAIRS)
    gui.run()  # Blocking call - chạy ở main thread

def processing_loop(state_manager, validate_pairs):
    """Main processing logic chuyển vào đây"""
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
        
        ready_pair, payloads = pair_points(
            state_manager.ready_start_list, 
            state_manager.ready_end_list, 
            validate_pairs
        )
        
        for pair in ready_pair:
            for payload in payloads:
                success = trigger_post(ICS_URL, payload)
                time.sleep(0.1)
                logger.debug(f"Trigger POST for pair {pair} with payload {payload}")
                logger.debug(f"POST success: {success}")
                if success:
                    state_manager.points[pair[0]]["flag"] = True
                    state_manager.ready_start_list.remove(pair[0])
                    state_manager.waiting_start_list.append(pair[0])
                    #logger.debug(f"state_manager.points[pair[0]]: {state_manager.points[pair[0]]}")
                    logger.debug(f"state_manager.ready_start_list: {state_manager.ready_start_list}")
                    logger.debug(f"state_manager.waiting_start_list: {state_manager.waiting_start_list}")
                    state_manager.points[pair[1]]["flag"] = True
                    state_manager.ready_end_list.remove(pair[1])
                    state_manager.waiting_end_list.append(pair[1])
                    state_manager.pair_mapping[pair[1]] = pair[0]
                    
                    # Lưu orderId mapping để webhook có thể tìm lại
                    order_id = payload.get("orderId")
                    if order_id:
                        state_manager.order_mapping[order_id] = pair
                        logger.debug(f"Saved order_mapping[{order_id}] = {pair}")
                    
                    #logger.debug(f"state_manager.points[pair[1]]: {state_manager.points[pair[1]]}")
                    logger.debug(f"state_manager.ready_end_list: {state_manager.ready_end_list}")
                    logger.debug(f"state_manager.waiting_end_list: {state_manager.waiting_end_list}")
                else:
                    logger.error("Failed to post")

        time.sleep(1)  # Main loop delay

if __name__ == "__main__":
    main()