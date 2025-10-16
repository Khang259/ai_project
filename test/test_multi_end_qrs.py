"""
Test script để kiểm tra logic xử lý multiple end_qrs
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logic'))

import time
from queue_store import SQLiteQueue

def test_view_stable_pairs():
    """Xem các stable_pairs đã được publish"""
    print("\n" + "="*80)
    print("📊 TEST: Xem Stable Pairs đã publish")
    print("="*80)
    
    db_path = "../queues.db"
    queue = SQLiteQueue(db_path)
    
    try:
        with queue._connect() as conn:
            # Lấy 20 stable_pairs gần nhất
            cur = conn.execute(
                """
                SELECT id, key, payload, timestamp 
                FROM messages 
                WHERE topic = 'stable_pairs' 
                ORDER BY id DESC 
                LIMIT 20
                """,
            )
            rows = cur.fetchall()
            
            if not rows:
                print("\n❌ Chưa có stable_pairs nào trong queue")
                return
            
            print(f"\n✅ Tìm thấy {len(rows)} stable_pairs gần nhất:\n")
            
            for i, row in enumerate(rows, 1):
                msg_id, key, payload_str, timestamp = row
                
                import json
                payload = json.loads(payload_str) if isinstance(payload_str, str) else payload_str
                
                print(f"\n--- Pair #{i} (ID: {msg_id}) ---")
                print(f"  Key: {key}")
                print(f"  Pair ID: {payload.get('pair_id')}")
                print(f"  Start Slot: {payload.get('start_slot')}")
                print(f"  End Slot: {payload.get('end_slot')}")
                
                # Kiểm tra xem có phải là "all empty" case không
                if payload.get('is_all_empty'):
                    print(f"  🎯 ALL EMPTY: {payload.get('all_empty_end_slots')}")
                
                print(f"  Stable Since: {payload.get('stable_since')}")
                print(f"  Timestamp: {timestamp}")
                
    except Exception as e:
        print(f"\n❌ Lỗi khi đọc queue: {e}")
        import traceback
        traceback.print_exc()


def test_monitor_stable_pairs():
    """Monitor real-time stable_pairs đang được publish"""
    print("\n" + "="*80)
    print("🔍 TEST: Monitor Real-time Stable Pairs")
    print("="*80)
    print("\nĐang lắng nghe stable_pairs... (Ctrl+C để dừng)\n")
    
    db_path = "../queues.db"
    queue = SQLiteQueue(db_path)
    
    # Lấy ID message gần nhất
    last_id = 0
    try:
        with queue._connect() as conn:
            cur = conn.execute(
                "SELECT MAX(id) FROM messages WHERE topic = 'stable_pairs'"
            )
            row = cur.fetchone()
            if row and row[0]:
                last_id = row[0]
    except Exception as e:
        print(f"Lỗi khi khởi tạo: {e}")
        return
    
    print(f"Bắt đầu từ ID: {last_id}\n")
    
    try:
        while True:
            try:
                with queue._connect() as conn:
                    cur = conn.execute(
                        """
                        SELECT id, key, payload, timestamp 
                        FROM messages 
                        WHERE topic = 'stable_pairs' AND id > ?
                        ORDER BY id ASC
                        LIMIT 10
                        """,
                        (last_id,)
                    )
                    rows = cur.fetchall()
                
                for row in rows:
                    msg_id, key, payload_str, timestamp = row
                    last_id = msg_id
                    
                    import json
                    payload = json.loads(payload_str) if isinstance(payload_str, str) else payload_str
                    
                    print(f"\n🔔 NEW PAIR (ID: {msg_id}) - {timestamp}")
                    print(f"   Pair ID: {payload.get('pair_id')}")
                    print(f"   {payload.get('start_slot')} → {payload.get('end_slot')}")
                    
                    # Kiểm tra nếu có multiple empty ends
                    if payload.get('is_all_empty'):
                        all_empty = payload.get('all_empty_end_slots', [])
                        print(f"   🎯 TẤT CẢ {len(all_empty)} end slots đều EMPTY: {all_empty}")
                        print(f"   ➜ Đã chọn: {payload.get('end_slot')} (ưu tiên cao nhất)")
                    else:
                        print(f"   ℹ️  Chỉ end slot này đang empty")
                    
                    print(f"   Stable since: {payload.get('stable_since')}")
                    print(f"   " + "-"*60)
                
                time.sleep(0.5)
                
            except KeyboardInterrupt:
                raise
            except Exception as e:
                print(f"\n❌ Lỗi: {e}")
                time.sleep(1.0)
                
    except KeyboardInterrupt:
        print("\n\n✋ Đã dừng monitor")


def test_analyze_patterns():
    """Phân tích patterns của stable_pairs để kiểm tra logic"""
    print("\n" + "="*80)
    print("📈 TEST: Phân tích Patterns của Stable Pairs")
    print("="*80)
    
    db_path = "../queues.db"
    queue = SQLiteQueue(db_path)
    
    try:
        with queue._connect() as conn:
            # Lấy tất cả stable_pairs trong 5 phút gần nhất
            cur = conn.execute(
                """
                SELECT payload 
                FROM messages 
                WHERE topic = 'stable_pairs' 
                AND timestamp > datetime('now', '-5 minutes')
                ORDER BY id ASC
                """,
            )
            rows = cur.fetchall()
            
            if not rows:
                print("\n❌ Không có stable_pairs nào trong 5 phút gần nhất")
                return
            
            print(f"\n✅ Tìm thấy {len(rows)} stable_pairs trong 5 phút gần nhất\n")
            
            import json
            from collections import defaultdict
            
            # Thống kê
            start_slot_count = defaultdict(int)
            all_empty_count = 0
            single_empty_count = 0
            
            for row in rows:
                payload_str = row[0]
                payload = json.loads(payload_str) if isinstance(payload_str, str) else payload_str
                
                start_slot = payload.get('start_slot')
                start_slot_count[start_slot] += 1
                
                if payload.get('is_all_empty'):
                    all_empty_count += 1
                else:
                    single_empty_count += 1
            
            # In thống kê
            print("📊 THỐNG KÊ THEO START SLOT:")
            print("-" * 60)
            for start_slot, count in sorted(start_slot_count.items()):
                print(f"  Start Slot {start_slot}: {count} lần publish")
            
            print("\n📊 THỐNG KÊ THEO LOẠI:")
            print("-" * 60)
            print(f"  🎯 ALL EMPTY cases: {all_empty_count}")
            print(f"  ℹ️  SINGLE/PARTIAL EMPTY cases: {single_empty_count}")
            
            # Kiểm tra xem có start_slot nào bị publish nhiều lần liên tiếp không
            print("\n🔍 PHÂN TÍCH CHI TIẾT:")
            print("-" * 60)
            
            prev_start = None
            duplicate_count = 0
            
            for row in rows:
                payload_str = row[0]
                payload = json.loads(payload_str) if isinstance(payload_str, str) else payload_str
                
                start_slot = payload.get('start_slot')
                
                if start_slot == prev_start:
                    duplicate_count += 1
                    print(f"  ⚠️  Start slot {start_slot} publish liên tiếp (có thể cần kiểm tra)")
                
                prev_start = start_slot
            
            if duplicate_count == 0:
                print(f"  ✅ Không có start_slot nào publish liên tiếp (tốt!)")
            else:
                print(f"  ⚠️  Có {duplicate_count} trường hợp publish liên tiếp")
            
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test multi end_qrs logic")
    parser.add_argument(
        "mode",
        choices=["view", "monitor", "analyze"],
        help="Chế độ test: view (xem history), monitor (real-time), analyze (phân tích)"
    )
    
    args = parser.parse_args()
    
    if args.mode == "view":
        test_view_stable_pairs()
    elif args.mode == "monitor":
        test_monitor_stable_pairs()
    elif args.mode == "analyze":
        test_analyze_patterns()
    
    print("\n✅ Test hoàn tất!\n")

