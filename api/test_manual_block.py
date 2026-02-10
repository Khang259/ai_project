"""
Test script - Demo cơ chế manually block/unblock điểm
Test xem logic có BỎ QUA điểm bị manually disabled không
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from logic.hash_tables import HashTables
from api.point_status import PointStatusAPI
import time

def test_manual_block_unblock():
    """Test manually block/unblock và kiểm tra logic"""
    
    print("=" * 70)
    print("🧪 TEST CƠ CHẾ MANUALLY BLOCK/UNBLOCK")
    print("=" * 70)
    
    # Khởi tạo
    print("\n📦 Khởi tạo HashTables...")
    hash_tables = HashTables("logic/config.json")
    
    print("🔧 Khởi tạo API...")
    api = PointStatusAPI(hash_tables)
    
    test_qr = "911"  # Điểm test
    
    # 1. Xem trạng thái ban đầu
    print("\n" + "=" * 70)
    print("1️⃣  Trạng thái ban đầu:")
    result = api.get_point_status(test_qr)
    data = result['data']
    print(f"   ✓ Status: {data['status']}")
    print(f"   ✓ Object: {data['object_type']}")
    print(f"   ✓ Manually disabled: {data['manually_disabled']}")
    
    # 2. Giả lập event detection và kiểm tra stability
    print("\n" + "=" * 70)
    print("2️⃣  Giả lập logic kiểm tra điều kiện (TRƯỚC khi block):")
    state = hash_tables.get_state(test_qr)
    is_disabled = state.get("manually_disabled", False)
    print(f"   ✓ Manually disabled: {is_disabled}")
    print(f"   ✓ Logic sẽ {'BỎ QUA' if is_disabled else 'KIỂM TRA'} điểm này")
    
    # 3. BLOCK điểm (TẮT điểm)
    print("\n" + "=" * 70)
    print("3️⃣  TẮT điểm bằng API (manually block):")
    result = api.block_point(test_qr, blocked_by="test_manual")
    print(f"   ✅ {result['message']}")
    
    # 4. Kiểm tra state sau khi block
    print("\n" + "=" * 70)
    print("4️⃣  Kiểm tra state sau khi TẮT:")
    result = api.get_point_status(test_qr)
    data = result['data']
    print(f"   ✓ Status: {data['status']}")
    print(f"   ✓ Blocked by: {data['blocked_by']}")
    print(f"   ✓ Manually disabled: {data['manually_disabled']}")
    
    # 5. Giả lập logic kiểm tra sau khi block
    print("\n" + "=" * 70)
    print("5️⃣  Giả lập logic kiểm tra điều kiện (SAU khi TẮT):")
    state = hash_tables.get_state(test_qr)
    is_disabled = state.get("manually_disabled", False)
    print(f"   ✓ Manually disabled: {is_disabled}")
    print(f"   ✓ Logic sẽ {'BỎ QUA' if is_disabled else 'KIỂM TRA'} điểm này")
    if is_disabled:
        print(f"   🚫 ĐIỂM BỊ TẮT → Logic sẽ KHÔNG trigger rule liên quan!")
    
    # 6. Thử block lại (sẽ fail)
    print("\n" + "=" * 70)
    print("6️⃣  Thử TẮT lại (expect fail):")
    result = api.block_point(test_qr, blocked_by="test_again")
    print(f"   ❌ {result['message']}")
    
    # 7. UNBLOCK điểm (BẬT lại điểm)
    print("\n" + "=" * 70)
    print("7️⃣  BẬT lại điểm bằng API (unblock):")
    time.sleep(1)
    result = api.unblock_point(test_qr)
    print(f"   ✅ {result['message']}")
    data = result['data']
    print(f"   ✓ Was manually disabled: {data['was_manually_disabled']}")
    
    # 8. Kiểm tra state sau khi unblock
    print("\n" + "=" * 70)
    print("8️⃣  Kiểm tra state sau khi BẬT lại:")
    result = api.get_point_status(test_qr)
    data = result['data']
    print(f"   ✓ Status: {data['status']}")
    print(f"   ✓ Manually disabled: {data['manually_disabled']}")
    
    # 9. Giả lập logic kiểm tra sau khi unblock
    print("\n" + "=" * 70)
    print("9️⃣  Giả lập logic kiểm tra điều kiện (SAU khi BẬT lại):")
    state = hash_tables.get_state(test_qr)
    is_disabled = state.get("manually_disabled", False)
    print(f"   ✓ Manually disabled: {is_disabled}")
    print(f"   ✓ Logic sẽ {'BỎ QUA' if is_disabled else 'KIỂM TRA'} điểm này")
    print(f"   ✓ Stable since đã reset: {state['stable_since']:.2f}")
    print(f"   ✅ ĐIỂM ĐÃ BẬT → Logic có thể trigger rule khi đủ điều kiện!")
    
    # 10. Xem state chi tiết
    print("\n" + "=" * 70)
    print("🔟  State chi tiết trong HashTables:")
    state = hash_tables.get_state(test_qr)
    print(f"   ✓ Status: {state['status']}")
    print(f"   ✓ Object type: {state['object_type']}")
    print(f"   ✓ Manually disabled: {state.get('manually_disabled', False)}")
    print(f"   ✓ Stable since: {state['stable_since']:.2f}")
    print(f"   ✓ Last update: {state['last_update']:.2f}")
    print(f"   ✓ Thời gian ổn định hiện tại: {time.time() - state['stable_since']:.2f}s")
    
    print("\n" + "=" * 70)
    print("✅ TEST HOÀN TẤT!")
    print("=" * 70)
    
    print("\n📝 KẾT LUẬN:")
    print("   ✓ API block → set manually_disabled=True → logic BỎ QUA điểm")
    print("   ✓ API unblock → set manually_disabled=False → logic KIỂM TRA lại")
    print("   ✓ User có thể can thiệp TẮT/BẬT điểm để kiểm soát logic!")


if __name__ == "__main__":
    test_manual_block_unblock()


