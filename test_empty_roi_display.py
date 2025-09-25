#!/usr/bin/env python3
"""
Test script để kiểm tra chức năng hiển thị Empty ROI trên video
"""

import time
import json
from queue_store import SQLiteQueue

def test_empty_roi_display():
    """Test chức năng hiển thị empty ROI"""
    queue = SQLiteQueue("queues.db")
    
    print("=== Test Empty ROI Display Functionality ===")
    
    # Lấy kết quả mới nhất từ roi_detection queue
    latest_result = queue.get_latest("roi_detection", "cam-1")
    
    if latest_result:
        print(f"📊 Kết quả mới nhất:")
        print(f"   Camera ID: {latest_result['camera_id']}")
        print(f"   Frame ID: {latest_result['frame_id']}")
        print(f"   Timestamp: {latest_result['timestamp']}")
        print(f"   Total ROI Detections: {latest_result['roi_detection_count']}")
        print(f"   Original Detections: {latest_result['original_detection_count']}")
        
        print(f"\n🎯 ROI Detections (bao gồm Empty):")
        shelf_count = 0
        empty_count = 0
        
        for i, detection in enumerate(latest_result['roi_detections']):
            class_name = detection['class_name']
            confidence = detection.get('confidence', 0)
            bbox = detection['bbox']
            center = detection['center']
            
            if class_name == "shelf":
                shelf_count += 1
                print(f"   {i+1}. ✅ SHELF")
                print(f"      Confidence: {confidence:.3f}")
                print(f"      BBox: ({bbox['x1']:.1f}, {bbox['y1']:.1f}) -> ({bbox['x2']:.1f}, {bbox['y2']:.1f})")
                print(f"      Center: ({center['x']:.1f}, {center['y']:.1f})")
            elif class_name == "empty":
                empty_count += 1
                print(f"   {i+1}. ⚠️  EMPTY [ROI]")
                print(f"      Confidence: {confidence:.3f}")
                print(f"      BBox: ({bbox['x1']:.1f}, {bbox['y1']:.1f}) -> ({bbox['x2']:.1f}, {bbox['y2']:.1f})")
                print(f"      Center: ({center['x']:.1f}, {center['y']:.1f})")
                print(f"      → ROI này được đánh dấu là EMPTY (không có shelf hoặc confidence < 0.5)")
        
        print(f"\n📈 Thống kê:")
        print(f"   - Shelf detections: {shelf_count}")
        print(f"   - Empty detections: {empty_count}")
        print(f"   - Tổng ROI: {len(latest_result['roi_detections'])}")
        
        if empty_count > 0:
            print(f"\n🎨 Hiển thị Empty ROI:")
            print(f"   - Màu sắc: Vàng (0, 255, 255)")
            print(f"   - Style: Bounding box đứt nét")
            print(f"   - Label: 'EMPTY [ROI]'")
            print(f"   - Độ dày: 2px")
        
    else:
        print("❌ Không tìm thấy kết quả nào trong roi_detection queue")
        print("💡 Hãy chạy roi_processor.py trước để tạo dữ liệu")
    
    print(f"\n🔧 Cách sử dụng:")
    print(f"   1. Chạy roi_processor.py để bắt đầu xử lý")
    print(f"   2. Mở cửa sổ video để xem Empty ROI được vẽ")
    print(f"   3. Empty ROI sẽ hiển thị với màu vàng và đường viền đứt nét")
    print(f"   4. Nhấn 'q' trong cửa sổ video để thoát")

if __name__ == "__main__":
    test_empty_roi_display()
