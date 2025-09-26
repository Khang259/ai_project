import argparse
import json
from datetime import datetime
from queue_store import SQLiteQueue


def view_roi_detection_results(db_path: str = "queues.db", camera_id: str = None, limit: int = 10, show_all: bool = False):
    """
    Xem kết quả ROI detection từ queue
    
    Args:
        db_path: Đường dẫn database
        camera_id: ID camera cụ thể (None = tất cả)
        limit: Số lượng kết quả hiển thị (0 = tất cả khi show_all=True)
        show_all: Hiển thị tất cả kết quả thay vì chỉ kết quả mới nhất
    """
    queue = SQLiteQueue(db_path)
    
    if show_all:
        print("=== TẤT CẢ KẾT QUẢ ROI DETECTION ===\n")
    else:
        print("=== ROI DETECTION RESULTS ===\n")
    
    # Lấy danh sách camera IDs
    with queue._connect() as conn:
        if camera_id:
            camera_ids = [camera_id]
        else:
            cur = conn.execute(
                "SELECT DISTINCT key FROM messages WHERE topic = 'roi_detection' ORDER BY key"
            )
            camera_ids = [row[0] for row in cur.fetchall()]
    
    if not camera_ids:
        print("Không tìm thấy kết quả ROI detection nào!")
        return
    
    for cam_id in camera_ids:
        print(f"Camera: {cam_id}")
        print("-" * 50)
        
        if show_all:
            # Lấy tất cả kết quả ROI detection cho camera này
            with queue._connect() as conn:
                if limit > 0:
                    cur = conn.execute(
                        """
                        SELECT id, payload, created_at FROM messages 
                        WHERE topic = 'roi_detection' AND key = ?
                        ORDER BY id DESC LIMIT ?
                        """,
                        (cam_id, limit)
                    )
                else:
                    cur = conn.execute(
                        """
                        SELECT id, payload, created_at FROM messages 
                        WHERE topic = 'roi_detection' AND key = ?
                        ORDER BY id DESC
                        """,
                        (cam_id,)
                    )
                rows = cur.fetchall()
            
            if not rows:
                print("Không có dữ liệu")
                continue
            
            print(f"Tổng số kết quả: {len(rows)}")
            print()
            
            for idx, (msg_id, payload_json, created_at) in enumerate(rows, 1):
                payload = json.loads(payload_json)
                print(f"--- Kết quả {idx} (ID: {msg_id}) ---")
                print(f"Timestamp: {payload['timestamp']}")
                print(f"Frame ID: {payload['frame_id']}")
                print(f"ROI Detections: {payload['roi_detection_count']}")
                print(f"Original Detections: {payload['original_detection_count']}")
                print(f"Frame Size: {payload['frame_shape']['width']}x{payload['frame_shape']['height']}")
                
                if payload['roi_detections']:
                    print("Detected Objects:")
                    for i, detection in enumerate(payload['roi_detections'], 1):
                        print(f"  {i}. {detection['class_name']} (ID: {detection['class_id']})")
                        # Hiển thị slot_number nếu có
                        if 'slot_number' in detection:
                            print(f"     Slot: {detection['slot_number']}")
                        print(f"     Confidence: {detection['confidence']:.3f}")
                        print(f"     BBox: ({detection['bbox']['x1']:.1f}, {detection['bbox']['y1']:.1f}) -> ({detection['bbox']['x2']:.1f}, {detection['bbox']['y2']:.1f})")
                        print(f"     Center: ({detection['center']['x']:.1f}, {detection['center']['y']:.1f})")
                else:
                    print("Không có object nào trong ROI")
                
                print()
        else:
            # Lấy kết quả mới nhất
            latest_result = queue.get_latest("roi_detection", cam_id)
            if latest_result:
                print(f"Timestamp: {latest_result['timestamp']}")
                print(f"Frame ID: {latest_result['frame_id']}")
                print(f"ROI Detections: {latest_result['roi_detection_count']}")
                print(f"Original Detections: {latest_result['original_detection_count']}")
                print(f"Frame Size: {latest_result['frame_shape']['width']}x{latest_result['frame_shape']['height']}")
                
                if latest_result['roi_detections']:
                    print("\nDetected Objects:")
                    for i, detection in enumerate(latest_result['roi_detections'], 1):
                        print(f"  {i}. {detection['class_name']} (ID: {detection['class_id']})")
                        # Hiển thị slot_number nếu có
                        if 'slot_number' in detection:
                            print(f"     Slot: {detection['slot_number']}")
                        print(f"     Confidence: {detection['confidence']:.3f}")
                        print(f"     BBox: ({detection['bbox']['x1']:.1f}, {detection['bbox']['y1']:.1f}) -> ({detection['bbox']['x2']:.1f}, {detection['bbox']['y2']:.1f})")
                        print(f"     Center: ({detection['center']['x']:.1f}, {detection['center']['y']:.1f})")
                else:
                    print("\nKhông có object nào trong ROI")
            else:
                print("Không có dữ liệu")
        
        print("\n" + "="*60 + "\n")


def view_recent_history(db_path: str = "queues.db", camera_id: str = None, limit: int = 5):
    """
    Xem lịch sử ROI detection gần đây
    
    Args:
        db_path: Đường dẫn database
        camera_id: ID camera cụ thể
        limit: Số lượng kết quả hiển thị
    """
    queue = SQLiteQueue(db_path)
    
    print("=== RECENT ROI DETECTION HISTORY ===\n")
    
    # Lấy danh sách camera IDs
    with queue._connect() as conn:
        if camera_id:
            camera_ids = [camera_id]
        else:
            cur = conn.execute(
                "SELECT DISTINCT key FROM messages WHERE topic = 'roi_detection' ORDER BY key"
            )
            camera_ids = [row[0] for row in cur.fetchall()]
    
    if not camera_ids:
        print("Không tìm thấy lịch sử ROI detection nào!")
        return
    
    for cam_id in camera_ids:
        print(f"Camera: {cam_id}")
        print("-" * 50)
        
        # Lấy lịch sử gần đây
        with queue._connect() as conn:
            cur = conn.execute(
                """
                SELECT id, payload, created_at FROM messages 
                WHERE topic = 'roi_detection' AND key = ?
                ORDER BY id DESC LIMIT ?
                """,
                (cam_id, limit)
            )
            rows = cur.fetchall()
        
        if not rows:
            print("Không có dữ liệu")
            continue
        
        for i, (msg_id, payload_json, created_at) in enumerate(rows, 1):
            payload = json.loads(payload_json)
            print(f"{i}. Frame {payload['frame_id']} - {created_at}")
            print(f"   ROI Detections: {payload['roi_detection_count']}/{payload['original_detection_count']}")
            
            if payload['roi_detections']:
                objects = [det['class_name'] for det in payload['roi_detections']]
                print(f"   Objects: {', '.join(objects)}")
            else:
                print("   Objects: None")
            print()
        
        print("="*60 + "\n")


def view_queue_stats(db_path: str = "queues.db"):
    """
    Xem thống kê tổng quan của các queue
    
    Args:
        db_path: Đường dẫn database
    """
    queue = SQLiteQueue(db_path)
    
    print("=== QUEUE STATISTICS ===\n")
    
    with queue._connect() as conn:
        # Thống kê theo topic
        cur = conn.execute(
            """
            SELECT topic, COUNT(*) as count, 
                   MIN(created_at) as first_msg,
                   MAX(created_at) as last_msg
            FROM messages 
            GROUP BY topic
            ORDER BY topic
            """
        )
        topics = cur.fetchall()
        
        for topic, count, first_msg, last_msg in topics:
            print(f"Topic: {topic}")
            print(f"   Messages: {count}")
            print(f"   First: {first_msg}")
            print(f"   Last: {last_msg}")
            
            # Thống kê theo key trong topic
            cur2 = conn.execute(
                "SELECT key, COUNT(*) as count FROM messages WHERE topic = ? GROUP BY key ORDER BY key",
                (topic,)
            )
            keys = cur2.fetchall()
            
            for key, key_count in keys:
                print(f"   └─ {key}: {key_count} messages")
            print()


def export_results_to_json(db_path: str = "queues.db", camera_id: str = None, output_file: str = None):
    """
    Export kết quả ROI detection ra file JSON
    
    Args:
        db_path: Đường dẫn database
        camera_id: ID camera cụ thể
        output_file: File output (mặc định: roi_results_YYYYMMDD_HHMMSS.json)
    """
    queue = SQLiteQueue(db_path)
    
    if not output_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"roi_results_{timestamp}.json"
    
    # Lấy tất cả kết quả ROI detection
    with queue._connect() as conn:
        if camera_id:
            cur = conn.execute(
                """
                SELECT id, key, payload, created_at FROM messages 
                WHERE topic = 'roi_detection' AND key = ?
                ORDER BY id ASC
                """,
                (camera_id,)
            )
        else:
            cur = conn.execute(
                """
                SELECT id, key, payload, created_at FROM messages 
                WHERE topic = 'roi_detection'
                ORDER BY id ASC
                """
            )
        rows = cur.fetchall()
    
    results = []
    for msg_id, key, payload_json, created_at in rows:
        payload = json.loads(payload_json)
        results.append({
            "message_id": msg_id,
            "camera_id": key,
            "created_at": created_at,
            "data": payload
        })
    
    # Lưu ra file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"Đã export {len(results)} kết quả ra file: {output_file}")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="View ROI Detection Results")
    parser.add_argument("--db-path", type=str, default="queues.db", 
                       help="Đường dẫn đến database SQLite")
    parser.add_argument("--camera-id", type=str, 
                       help="ID camera cụ thể (mặc định: tất cả)")
    parser.add_argument("--limit", type=int, default=10, 
                       help="Số lượng kết quả hiển thị (0 = tất cả khi dùng --all)")
    parser.add_argument("--all", action="store_true", 
                       help="Xem tất cả kết quả thay vì chỉ kết quả mới nhất")
    parser.add_argument("--history", action="store_true", 
                       help="Xem lịch sử gần đây")
    parser.add_argument("--stats", action="store_true", 
                       help="Xem thống kê queue")
    parser.add_argument("--export", type=str, 
                       help="Export kết quả ra file JSON")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        if args.stats:
            view_queue_stats(args.db_path)
        elif args.history:
            view_recent_history(args.db_path, args.camera_id, args.limit)
        elif args.export:
            export_results_to_json(args.db_path, args.camera_id, args.export)
        else:
            view_roi_detection_results(args.db_path, args.camera_id, args.limit, args.all)
            
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())