"""
Standalone Logic Processor - Kết nối với main.py qua shared Queue
Đọc roi_result_queue từ ROI Checker và xử lý logic

Cách chạy:
1. Chạy main.py trước (trong terminal 1):
   cd D:\WORK\ROI_LOGIC_version2\detectObject
   python main.py

2. Chạy file này (trong terminal 2):
   cd D:\WORK\ROI_LOGIC_version2\logic
   python standalone_with_main.py
"""

import sys
from pathlib import Path
from multiprocessing import Queue, Manager
import time

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "detectObject"))

from logic import logic_processor_worker


def output_consumer_worker(output_queue: Queue):
    """
    Consumer để xử lý outputs từ Logic Processor
    """
    print(" Output Consumer started\n")
    
    trigger_count = 0
    
    try:
        while True:
            try:
                output = output_queue.get(timeout=1.0)
                trigger_count += 1
                
                print(f"\n{'='*60}")
                print(f" LOGIC TRIGGER #{trigger_count}")
                print(f"{'='*60}")
                print(f"Rule: {output['rule_name']}")
                print(f"Type: {output['rule_type']}")
                print(f"Timestamp: {output['timestamp']}")
                print(f"Stable Duration: {output.get('stable_duration', 0):.2f}s")
                print(f"Output Queue: {output.get('output_queue')}")
                
                # Print chi tiết
                if output['rule_type'] == 'Pairs':
                    print(f"\n3-Point Status:")
                    print(f"  s1 ({output['s1']['qr_code']}): {output['s1']['state']} [conf: {output['s1']['confidence']:.2f}]")
                    print(f"  e1 ({output['e1']['qr_code']}): {output['e1']['state']} [conf: {output['e1']['confidence']:.2f}]")
                    print(f"  e2 ({output['e2']['qr_code']}): {output['e2']['state']} [conf: {output['e2']['confidence']:.2f}]")
                    
                elif output['rule_type'] == 'Dual':
                    print(f"\nPair Status: {output['pair']}")
                    print(f"  s ({output['s']['qr_code']}): {output['s']['state']} [conf: {output['s']['confidence']:.2f}]")
                    print(f"  e ({output['e']['qr_code']}): {output['e']['state']} [conf: {output['e']['confidence']:.2f}]")
                
                print(f"{'='*60}\n")
                
                # TODO: Xử lý nghiệp vụ
                # - Gửi API request
                # - Lưu database
                # - Send notifications
                
            except:
                time.sleep(0.01)
                
    except KeyboardInterrupt:
        print(f"\n Output Consumer stopped. Total triggers: {trigger_count}")


def main():
    """
    Main - Chạy Logic Processor độc lập, đọc từ roi_result_queue
    
    QUAN TRỌNG: 
    - File này dùng để TEST Logic Processor độc lập
    - Cần chạy main.py TRƯỚC để có roi_result_queue
    - Hoặc tạo simulation queue như dưới đây
    """
    
    print("\n" + "="*60)
    print("STANDALONE LOGIC PROCESSOR")
    print("="*60)
    print("\nKiến trúc:")
    print("  main.py (roi_checker) → roi_result_queue → Logic Processor → output_queue")
    print("="*60 + "\n")
    
    # Tạo Manager để share queues giữa processes
    manager = Manager()
    
    # TẠO QUEUE TƯƠNG TỰ NHƯ TRONG main.py
    # Trong thực tế, bạn cần kết nối đến queue thật từ main.py
    # Ở đây tôi sẽ simulate một queue giống như roi_checker output
    
    roi_result_queue = manager.Queue(maxsize=1000)  # Queue 1 (giống main.py)
    logic_output_queue = manager.Queue(maxsize=1000)  # Queue 2
    
    print(" CHẠY Ở CHẾ ĐỘ SIMULATION")
    print("    Nếu muốn kết nối với main.py thật, cần dùng named pipes/sockets\n")
    
    # Khởi động Logic Processor Worker
    from multiprocessing import Process
    
    config_path = "config.json"
    
    logic_process = Process(
        target=logic_processor_worker,
        args=(roi_result_queue, logic_output_queue, config_path)
    )
    logic_process.start()
    print(f" Logic Processor started (PID: {logic_process.pid})\n")
    
    # Khởi động Output Consumer
    consumer_process = Process(
        target=output_consumer_worker,
        args=(logic_output_queue,)
    )
    consumer_process.start()
    print(f" Output Consumer started (PID: {consumer_process.pid})\n")
    
    # Chờ processes khởi động
    time.sleep(2)
    
    print("="*60)
    print(" SYSTEM READY")
    print("="*60)
    print("\n Đang chạy ở chế độ SIMULATION:")
    print("   - Logic Processor đang đợi events từ roi_result_queue")
    print("   - Bạn có thể gửi test events hoặc kết nối với main.py thật")
    print("\n Test simulation:")
    print("   - Sẽ tự động gửi 1 vài test events sau 3 giây...")
    print("\n  Press Ctrl+C to stop\n")
    print("="*60 + "\n")
    
    # Simulate một vài events sau 3s để test
    time.sleep(3)
    
    print(" Gửi test events...\n")
    
    # Simulate events giống output từ roi_checker
    base_time = time.time()
    
    # Test case: Logic 3 điểm
    # s1 (qr=000, cam-1, slot 1) = shelf
    # e1 (qr=111, cam-1, slot 2) = empty  
    # e2 (qr=222, cam-1, slot 3) = empty
    
    for i in range(150):  # 15 giây (150 * 0.1s)
        current_time = base_time + (i * 0.1)
        
        # Event 1: s1 = shelf
        event1 = {
            "camera_id": "cam-1",
            "timestamp": current_time,
            "slot_id": "1",
            "object_type": "shelf",
            "confidence": 0.95,
            "iou": 0.85,
            "bbox": [10, 15, 50, 60]
        }
        roi_result_queue.put(event1)
        
        # Event 2: e1 = empty
        event2 = {
            "camera_id": "cam-1",
            "timestamp": current_time,
            "slot_id": "2",
            "object_type": "empty",
            "confidence": 0.0,
            "iou": 0.0,
            "bbox": []
        }
        roi_result_queue.put(event2)
        
        # Event 3: e2 = empty
        event3 = {
            "camera_id": "cam-1",
            "timestamp": current_time,
            "slot_id": "3",
            "object_type": "empty",
            "confidence": 0.0,
            "iou": 0.0,
            "bbox": []
        }
        roi_result_queue.put(event3)
        
        time.sleep(0.1)
        
        if i % 50 == 0 and i > 0:
            elapsed = i * 0.1
            print(f" Đã giả lập {elapsed:.1f}s...")
    
    print("\n Test events đã gửi xong!")
    print(" Chờ xử lý...")
    time.sleep(3)
    
    try:
        # Giữ process chạy
        print("\n Entering idle mode. Press Ctrl+C to stop.\n")
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n\n Shutting down...")
    
    finally:
        print(" Cleaning up processes...")
        logic_process.terminate()
        consumer_process.terminate()
        
        logic_process.join(timeout=3)
        consumer_process.join(timeout=3)
        
        print(" All processes stopped")
        print("\n" + "="*60)
        print(" System shutdown complete")
        print("="*60 + "\n")


if __name__ == "__main__":
    main()





