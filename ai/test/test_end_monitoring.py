#!/usr/bin/env python3
"""
Script test để kiểm tra hệ thống end slot monitoring
"""

import json
import time
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from queue_store import SQLiteQueue

def test_end_monitoring():
    """Test end slot monitoring system"""
    print("=== Test End Slot Monitoring System ===")
    
    # Kết nối database
    queue = SQLiteQueue("queues.db")
    
    # Test 1: Kiểm tra slot_pairing_config.json
    print("\n1. Kiểm tra slot_pairing_config.json...")
    config_path = "logic/slot_pairing_config.json"
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        
        print(f"   - Starts: {len(config.get('starts', []))} slots")
        print(f"   - Ends: {len(config.get('ends', []))} slots")
        print(f"   - Pairs: {len(config.get('pairs', []))} pairs")
        
        # Hiển thị một số pairs
        for i, pair in enumerate(config.get('pairs', [])[:3]):
            print(f"   - Pair {i+1}: start_qr={pair['start_qr']} -> end_qr={pair['end_qrs']}")
    else:
        print("   - Không tìm thấy config file!")
        return False
    
    # Test 2: Kiểm tra stable_pairs queue
    print("\n2. Kiểm tra stable_pairs queue...")
    try:
        with queue._connect() as conn:
            cur = conn.execute(
                "SELECT COUNT(*) FROM messages WHERE topic = 'stable_pairs'"
            )
            count = cur.fetchone()[0]
            print(f"   - Có {count} messages trong stable_pairs queue")
            
            # Lấy message mới nhất
            cur = conn.execute(
                "SELECT payload FROM messages WHERE topic = 'stable_pairs' ORDER BY id DESC LIMIT 1"
            )
            row = cur.fetchone()
            if row:
                payload = json.loads(row[0])
                print(f"   - Message mới nhất: {payload}")
            else:
                print("   - Không có message nào trong queue")
    except Exception as e:
        print(f"   - Lỗi khi kiểm tra queue: {e}")
    
    # Test 3: Kiểm tra roi_detection queue
    print("\n3. Kiểm tra roi_detection queue...")
    try:
        with queue._connect() as conn:
            cur = conn.execute(
                "SELECT COUNT(*) FROM messages WHERE topic = 'roi_detection'"
            )
            count = cur.fetchone()[0]
            print(f"   - Có {count} messages trong roi_detection queue")
            
            # Lấy message mới nhất cho mỗi camera
            cur = conn.execute(
                "SELECT key, payload FROM messages WHERE topic = 'roi_detection' ORDER BY id DESC LIMIT 5"
            )
            rows = cur.fetchall()
            for row in rows:
                camera_id = row[0]
                payload = json.loads(row[1])
                roi_count = payload.get('roi_detection_count', 0)
                print(f"   - Camera {camera_id}: {roi_count} ROI detections")
    except Exception as e:
        print(f"   - Lỗi khi kiểm tra roi_detection queue: {e}")
    
    # Test 4: Tạo test stable_pairs message
    print("\n4. Tạo test stable_pairs message...")
    test_payload = {
        "pair_id": "test_pair_001",
        "start_slot": "11",  # QR code 11 -> cam-1 slot 1
        "end_slot": "24"     # QR code 24 -> cam-2 slot 4
    }
    
    try:
        queue.publish("stable_pairs", "test_pair_001", test_payload)
        print(f"   - Đã tạo test message: {test_payload}")
        print("   - Bây giờ chạy roi_processor.py để xem hệ thống hoạt động")
    except Exception as e:
        print(f"   - Lỗi khi tạo test message: {e}")
    
    print("\n=== Test hoàn thành ===")
    return True

if __name__ == "__main__":
    test_end_monitoring()
