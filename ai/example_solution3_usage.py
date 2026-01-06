"""
Example: Cách sử dụng GIẢI PHÁP 3 - Sync Blocking State

File này demo cách integrate roi_processor với visualizer
sử dụng Giải pháp 3 để tránh race condition.
"""

import threading
import time
from roi_processor import ROIProcessor
from optimized_roi_visualizer import VideoDisplayManager


def main():
    """
    Main function demo GIẢI PHÁP 3
    """
    print("=" * 80)
    print("DEMO: GIẢI PHÁP 3 - Sync Blocking State từ roi_processor")
    print("=" * 80)
    
    # 1. Khởi tạo ROI Processor
    print("\n[1] Khởi tạo ROI Processor...")
    processor = ROIProcessor(db_path="queues.db")
    
    # 2. Khởi tạo Video Display Manager
    print("[2] Khởi tạo Video Display Manager...")
    visualizer = VideoDisplayManager(
        show_video=True,
        cam_config_path="logic/cam_config.json",
        config_path="visualizer_config.json"
    )
    
    # 3. Khởi động ROI Processor trong thread riêng
    print("[3] Khởi động ROI Processor...")
    processor_thread = threading.Thread(target=processor.run, daemon=True)
    processor_thread.start()
    
    # Đợi processor khởi tạo xong
    time.sleep(2)
    
    # 4. Khởi động Video Display với GIẢI PHÁP 3
    print("\n[4] Khởi động Video Display với Giải pháp 3...")
    print("    ✅ Truyền blocked_slots reference từ roi_processor")
    print("    ✅ Không cần subscribe blocking topics")
    print("    ✅ Đồng bộ tức thì, không có race condition")
    print()
    
    try:
        # ← ĐÂY LÀ ĐIỂM QUAN TRỌNG: Truyền processor.blocked_slots
        visualizer.display_video(
            roi_cache=processor.roi_cache,
            latest_roi_detections=processor.latest_roi_detections,
            end_slot_states=processor.end_slot_states,
            video_captures={},
            frame_cache={},
            update_frame_cache_func=None,
            blocked_slots=processor.blocked_slots  # ← GIẢI PHÁP 3: Truyền reference
        )
    except KeyboardInterrupt:
        print("\n[STOP] Dừng chương trình...")
        processor.running = False
    
    print("\n[DONE] Hoàn thành!")


def demo_blocking_scenarios():
    """
    Demo các scenario blocking để test Giải pháp 3
    """
    from queue_store import SQLiteQueue
    
    print("\n" + "=" * 80)
    print("DEMO: Test Blocking Scenarios")
    print("=" * 80)
    
    queue = SQLiteQueue("queues.db")
    
    # Scenario 1: Dual Block
    print("\n[Scenario 1] Dual Block")
    print("  - Gửi dual_block message")
    print("  - Kiểm tra: Slot phải hiển thị 'Blocked' ngay lập tức")
    
    dual_block_payload = {
        "dual_id": "123->456",
        "start_qr": 123,
        "end_qrs": 456,
        "action": "block",
        "timestamp": time.time()
    }
    queue.publish("dual_block", "123->456", dual_block_payload)
    print("  ✅ Đã gửi dual_block message")
    
    time.sleep(2)
    
    # Scenario 2: Manual Block
    print("\n[Scenario 2] Manual Block via API")
    print("  - Gửi block_slot message")
    print("  - Kiểm tra: Slot phải hiển thị 'Blocked' ngay lập tức")
    
    block_payload = {
        "qr_code": 789,
        "reason": "manual_test",
        "timestamp": time.time()
    }
    queue.publish("block_slot", 789, block_payload)
    print("  ✅ Đã gửi block_slot message")
    
    time.sleep(2)
    
    # Scenario 3: Unblock
    print("\n[Scenario 3] Unblock")
    print("  - Gửi unblock_slot message")
    print("  - Kiểm tra: Slot phải hiển thị 'Empty' hoặc 'Shelf'")
    
    unblock_payload = {
        "qr_code": 789,
        "reason": "manual_test",
        "timestamp": time.time()
    }
    queue.publish("unblock_slot", 789, unblock_payload)
    print("  ✅ Đã gửi unblock_slot message")
    
    print("\n[INFO] Quan sát camera display để verify kết quả")


def compare_before_after():
    """
    So sánh Before/After khi áp dụng Giải pháp 3
    """
    print("\n" + "=" * 80)
    print("SO SÁNH: Before vs After Giải pháp 3")
    print("=" * 80)
    
    print("\n❌ BEFORE (Subscribe Topics - Có Race Condition):")
    print("   Timeline:")
    print("   T1: roi_processor nhận dual_block → cập nhật blocked_slots")
    print("   T2: roi_processor xử lý frame → tạo 'empty' detection")
    print("   T3: visualizer copy detection data")
    print("   T4: visualizer._handle_dual_block() chưa chạy → blocked_rois CHƯA có")
    print("   T5: Display → thấy 'empty' + blocked_rois[slot]=False")
    print("   ❌ KẾT QUẢ: Hiển thị 'Empty' (SAI!)")
    
    print("\n✅ AFTER (Sync Direct - Không có Race Condition):")
    print("   Timeline:")
    print("   T1: roi_processor nhận dual_block → cập nhật blocked_slots")
    print("   T2: roi_processor xử lý frame → tạo 'empty' detection")
    print("   T3: visualizer._update_local_dict_from_processor():")
    print("       - Copy detection data")
    print("       - Sync blocked_slots từ roi_processor (cùng lúc)")
    print("   T4: Display → thấy 'empty' + blocked_rois[slot]=True")
    print("   ✅ KẾT QUẢ: Hiển thị 'Blocked' (ĐÚNG!)")
    
    print("\n📊 LỢI ÍCH:")
    print("   ✅ Single Source of Truth: roi_processor.blocked_slots")
    print("   ✅ Không có Race Condition")
    print("   ✅ Đồng bộ tức thì")
    print("   ✅ Code đơn giản hơn")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "demo":
            demo_blocking_scenarios()
        elif sys.argv[1] == "compare":
            compare_before_after()
        else:
            print("Usage:")
            print("  python example_solution3_usage.py        # Run main demo")
            print("  python example_solution3_usage.py demo   # Demo blocking scenarios")
            print("  python example_solution3_usage.py compare # Compare before/after")
    else:
        # Run main demo
        main()

