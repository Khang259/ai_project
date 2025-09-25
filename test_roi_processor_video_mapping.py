#!/usr/bin/env python3
"""
Test script để kiểm tra chức năng mapping video source trong ROI Processor
"""

from queue_store import SQLiteQueue

def test_roi_processor_video_mapping():
    """Test chức năng mapping video source cho ROI processor"""
    queue = SQLiteQueue("queues.db")
    
    print("=== Test ROI Processor Video Mapping ===")
    
    # Kiểm tra ROI config cho cả 2 camera
    cameras = ["cam-1", "cam-2"]
    video_mapping = {
        "cam-1": "video/hanam.mp4",
        "cam-2": "video/vinhPhuc.mp4"
    }
    
    print(f"📊 Video Mapping:")
    for camera_id, video_source in video_mapping.items():
        print(f"   {camera_id} → {video_source}")
    
    print(f"\n🎬 ROI Config Status:")
    
    for camera_id in cameras:
        print(f"\n📊 Camera {camera_id}:")
        
        # Kiểm tra ROI config
        roi_config = queue.get_latest("roi_config", camera_id)
        if roi_config:
            print(f"   ✅ Có ROI config")
            print(f"   Timestamp: {roi_config['timestamp']}")
            print(f"   Number of ROI slots: {len(roi_config['slots'])}")
        else:
            print(f"   ❌ Không có ROI config")
            print(f"   💡 Chạy: python roi_tool.py --vinhphuc để tạo ROI cho camera này")
        
        # Kiểm tra raw detection
        raw_detection = queue.get_latest("raw_detection", camera_id)
        if raw_detection:
            print(f"   ✅ Có raw detection data")
            print(f"   Frame ID: {raw_detection['frame_id']}")
            print(f"   Detections: {raw_detection['detection_count']}")
        else:
            print(f"   ❌ Không có raw detection data")
            print(f"   💡 Chạy: python yolo_detector.py để tạo detection data")
        
        # Kiểm tra ROI detection
        roi_detection = queue.get_latest("roi_detection", camera_id)
        if roi_detection:
            print(f"   ✅ Có ROI detection data")
            print(f"   Frame ID: {roi_detection['frame_id']}")
            print(f"   ROI Detections: {roi_detection['roi_detection_count']}")
            
            # Đếm shelf và empty
            roi_detections = roi_detection.get('roi_detections', [])
            shelf_count = sum(1 for d in roi_detections if d.get('class_name') == 'shelf')
            empty_count = sum(1 for d in roi_detections if d.get('class_name') == 'empty')
            print(f"   Shelf: {shelf_count}, Empty: {empty_count}")
        else:
            print(f"   ❌ Không có ROI detection data")
            print(f"   💡 Chạy: python roi_processor.py để xử lý ROI detection")
    
    # Thống kê tổng quan
    print(f"\n📈 Thống kê tổng quan:")
    
    total_roi_slots = 0
    total_detections = 0
    total_roi_detections = 0
    
    for camera_id in cameras:
        roi_config = queue.get_latest("roi_config", camera_id)
        raw_detection = queue.get_latest("raw_detection", camera_id)
        roi_detection = queue.get_latest("roi_detection", camera_id)
        
        roi_count = len(roi_config['slots']) if roi_config else 0
        detection_count = raw_detection['detection_count'] if raw_detection else 0
        roi_detection_count = roi_detection['roi_detection_count'] if roi_detection else 0
        
        total_roi_slots += roi_count
        total_detections += detection_count
        total_roi_detections += roi_detection_count
        
        print(f"   Camera {camera_id}: {roi_count} ROI, {detection_count} raw detections, {roi_detection_count} ROI detections")
    
    print(f"   Tổng cộng: {total_roi_slots} ROI slots, {total_detections} raw detections, {total_roi_detections} ROI detections")
    
    # Hướng dẫn workflow
    print(f"\n🔧 Workflow hoàn chỉnh:")
    print(f"   1. Vẽ ROI cho camera 1: python roi_tool.py")
    print(f"   2. Vẽ ROI cho camera 2: python roi_tool.py --vinhphuc")
    print(f"   3. Chạy multi camera detection: python yolo_detector.py")
    print(f"   4. Chạy ROI processor: python roi_processor.py")
    print(f"   5. Mỗi camera sẽ hiển thị video tương ứng:")
    print(f"      - cam-1 → video/hanam.mp4")
    print(f"      - cam-2 → video/vinhPhuc.mp4")
    
    # Kiểm tra video files
    print(f"\n🎬 Video Files Status:")
    import os
    
    for camera_id, video_source in video_mapping.items():
        if os.path.exists(video_source):
            print(f"   ✅ {video_source} - Tồn tại")
        else:
            print(f"   ❌ {video_source} - Không tồn tại")

if __name__ == "__main__":
    test_roi_processor_video_mapping()
