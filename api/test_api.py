"""
Test script - Demo cách dùng Point Status API
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from logic.hash_tables import HashTables
from api.point_status import PointStatusAPI
import time

def test_block_unblock():
    """Test block/unblock điểm"""
    
    # Khởi tạo
    print("=" * 60)
    print("📦 Khởi tạo HashTables...")
    hash_tables = HashTables("../logic/config.json")
    
    print("\n🔧 Khởi tạo API...")
    api = PointStatusAPI(hash_tables)
    
    test_qr = "911"  # Điểm test
    
    # 1. Xem trạng thái ban đầu
    print("\n" + "=" * 60)
    print("1️⃣  Kiểm tra trạng thái ban đầu:")
    result = api.get_point_status(test_qr)
    print(f"   Status: {result['data']['status']}")
    print(f"   Object: {result['data']['object_type']}")
    
    # 2. Block điểm
    print("\n" + "=" * 60)
    print("2️⃣  Block điểm...")
    result = api.block_point(test_qr, blocked_by="test_manual")
    print(f"   ✅ {result['message']}")
    print(f"   Blocked by: {result['data']['blocked_by']}")
    
    # 3. Kiểm tra lại sau khi block
    print("\n" + "=" * 60)
    print("3️⃣  Kiểm tra sau khi block:")
    result = api.get_point_status(test_qr)
    print(f"   Status: {result['data']['status']}")
    print(f"   Blocked by: {result['data']['blocked_by']}")
    
    # 4. Thử block lại (sẽ fail)
    print("\n" + "=" * 60)
    print("4️⃣  Thử block lại (expect fail):")
    result = api.block_point(test_qr, blocked_by="test_again")
    print(f"   ❌ {result['message']}")
    
    # 5. Unblock điểm
    print("\n" + "=" * 60)
    print("5️⃣  Unblock điểm...")
    time.sleep(1)  # Đợi 1 giây
    result = api.unblock_point(test_qr)
    print(f"   ✅ {result['message']}")
    
    # 6. Kiểm tra lại sau khi unblock
    print("\n" + "=" * 60)
    print("6️⃣  Kiểm tra sau khi unblock:")
    result = api.get_point_status(test_qr)
    print(f"   Status: {result['data']['status']}")
    
    # 7. Xem state trong hash_tables (để verify stable_since đã reset)
    print("\n" + "=" * 60)
    print("7️⃣  Kiểm tra state trong HashTables:")
    state = hash_tables.get_state(test_qr)
    print(f"   Status: {state['status']}")
    print(f"   Object type: {state['object_type']}")
    print(f"   Stable since: {state['stable_since']:.2f}")
    print(f"   Last update: {state['last_update']:.2f}")
    print(f"   → Thời gian stable hiện tại: {time.time() - state['stable_since']:.2f}s")
    
    # 8. Xem tất cả điểm bị block
    print("\n" + "=" * 60)
    print("8️⃣  Danh sách điểm bị block:")
    result = api.get_all_blocked_points()
    print(f"   {result['message']}")
    if result['data']:
        for point in result['data']:
            print(f"   - {point['qr_code']}: blocked by {point['blocked_by']}")
    
    print("\n" + "=" * 60)
    print("✅ Test hoàn tất!")
    print("=" * 60)


if __name__ == "__main__":
    test_block_unblock()

