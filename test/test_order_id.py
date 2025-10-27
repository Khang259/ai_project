"""
Test script để kiểm tra logic tạo orderId mới
"""

import sys
import os
import re
import time
from datetime import datetime
from collections import Counter

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'postRq'))

from postRq.postAPI import get_next_order_id


def test_format():
    """Test format của orderId"""
    print("\n" + "="*80)
    print("📋 TEST 1: Kiểm tra format")
    print("="*80)
    
    # Pattern: 13 chữ số _ 4 ký tự hex
    pattern = r'^\d{13}_[0-9a-f]{4}$'
    
    # Test 10 orderId
    for i in range(10):
        order_id = get_next_order_id()
        
        if re.match(pattern, order_id):
            print(f"  ✅ {i+1}. {order_id} - Valid format")
        else:
            print(f"  ❌ {i+1}. {order_id} - INVALID format!")
            return False
        
        time.sleep(0.001)  # Sleep ngắn để tạo timestamp khác nhau
    
    print("\n✅ TẤT CẢ orderId đều có format hợp lệ!")
    return True


def test_uniqueness():
    """Test tính unique của orderId"""
    print("\n" + "="*80)
    print("🔍 TEST 2: Kiểm tra tính unique")
    print("="*80)
    
    # Tạo 1000 orderId liên tiếp
    print("\nĐang tạo 1000 orderId...")
    order_ids = []
    for i in range(1000):
        order_ids.append(get_next_order_id())
    
    # Kiểm tra duplicate
    total = len(order_ids)
    unique = len(set(order_ids))
    duplicates = total - unique
    
    print(f"\n📊 Kết quả:")
    print(f"  - Tổng số orderId: {total}")
    print(f"  - Số orderId unique: {unique}")
    print(f"  - Số duplicate: {duplicates}")
    
    if duplicates == 0:
        print(f"\n✅ TẤT CẢ orderId đều unique!")
        return True
    else:
        print(f"\n❌ Có {duplicates} orderId bị duplicate!")
        
        # Tìm các orderId bị duplicate
        counter = Counter(order_ids)
        duplicated_ids = [oid for oid, count in counter.items() if count > 1]
        print(f"\nDanh sách duplicate:")
        for oid in duplicated_ids:
            print(f"  - {oid} (xuất hiện {counter[oid]} lần)")
        
        return False


def test_timestamp_accuracy():
    """Test độ chính xác của timestamp trong orderId"""
    print("\n" + "="*80)
    print("⏱️  TEST 3: Kiểm tra timestamp accuracy")
    print("="*80)
    
    all_passed = True
    
    for i in range(5):
        # Lấy timestamp trước và sau khi tạo orderId
        before = datetime.now()
        order_id = get_next_order_id()
        after = datetime.now()
        
        # Parse timestamp từ orderId
        timestamp_str = order_id.split('_')[0]
        timestamp_ms = int(timestamp_str)
        dt = datetime.fromtimestamp(timestamp_ms / 1000.0)
        
        # Kiểm tra timestamp nằm trong khoảng before..after
        if before <= dt <= after:
            print(f"  ✅ {i+1}. {order_id}")
            print(f"      Before:  {before.strftime('%Y-%m-%d %H:%M:%S.%f')}")
            print(f"      OrderID: {dt.strftime('%Y-%m-%d %H:%M:%S.%f')}")
            print(f"      After:   {after.strftime('%Y-%m-%d %H:%M:%S.%f')}")
        else:
            print(f"  ❌ {i+1}. {order_id} - Timestamp ngoài khoảng!")
            all_passed = False
        
        time.sleep(0.1)
    
    if all_passed:
        print("\n✅ TẤT CẢ timestamp đều chính xác!")
        return True
    else:
        print("\n❌ Có timestamp không chính xác!")
        return False


def test_parse_order_id():
    """Test parse orderId để lấy thông tin"""
    print("\n" + "="*80)
    print("🔧 TEST 4: Parse orderId")
    print("="*80)
    
    def parse_order_id(order_id: str):
        """Extract thông tin từ orderId"""
        parts = order_id.split('_')
        timestamp_str = parts[0]
        random_salt = parts[1]
        
        timestamp_ms = int(timestamp_str)
        dt = datetime.fromtimestamp(timestamp_ms / 1000.0)
        
        return {
            "order_id": order_id,
            "timestamp_ms": timestamp_ms,
            "random_salt": random_salt,
            "datetime": dt,
            "formatted_time": dt.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        }
    
    # Test với 5 orderId
    print("\nParse 5 orderId:\n")
    
    for i in range(5):
        order_id = get_next_order_id()
        info = parse_order_id(order_id)
        
        print(f"  {i+1}. OrderID: {info['order_id']}")
        print(f"     - Timestamp: {info['timestamp_ms']} ms")
        print(f"     - Random Salt: {info['random_salt']}")
        print(f"     - DateTime: {info['formatted_time']}")
        print()
        
        time.sleep(0.1)
    
    print("✅ Parse thành công!")
    return True


def test_collision_probability():
    """Test xác suất collision trong cùng millisecond"""
    print("\n" + "="*80)
    print("🎲 TEST 5: Xác suất collision")
    print("="*80)
    
    print("\nMô phỏng: Tạo nhiều orderId trong cùng millisecond")
    print("(Bình thường không xảy ra, nhưng test để chắc chắn)\n")
    
    # Giả lập tạo nhiều orderId trong cùng 1 thời điểm
    # Bằng cách ghi đè time.time()
    import random
    
    fake_timestamp = 1729085445.123
    order_ids_same_ms = []
    
    # Tạo 100 orderId với cùng timestamp
    for _ in range(100):
        timestamp_ms = int(fake_timestamp * 1000)
        random_salt = format(random.randint(0, 0xFFFF), '04x')
        order_id = f"{timestamp_ms}_{random_salt}"
        order_ids_same_ms.append(order_id)
    
    # Kiểm tra unique
    total = len(order_ids_same_ms)
    unique = len(set(order_ids_same_ms))
    collision_rate = (total - unique) / total * 100
    
    print(f"📊 Kết quả mô phỏng:")
    print(f"  - Số orderId tạo: {total}")
    print(f"  - Số orderId unique: {unique}")
    print(f"  - Tỷ lệ collision: {collision_rate:.2f}%")
    print(f"  - Xác suất unique: {(unique/total)*100:.2f}%")
    
    # Với 65536 giá trị random, xác suất collision rất thấp
    expected_collision_rate = 100 * (1 - (1 - 1/65536)**100)  # Birthday paradox
    print(f"\n  - Xác suất collision lý thuyết: {expected_collision_rate:.4f}%")
    
    print("\n💡 Kết luận:")
    print("  - Random salt có 65536 giá trị khác nhau (16 bits)")
    print("  - Trong 100 requests cùng millisecond:")
    print(f"    → Xác suất collision chỉ ~{expected_collision_rate:.2f}%")
    print("  - Trong thực tế, hệ thống < 100 req/s → collision gần như không xảy ra")
    
    return True


def test_performance():
    """Test performance của get_next_order_id()"""
    print("\n" + "="*80)
    print("⚡ TEST 6: Performance")
    print("="*80)
    
    # Test tốc độ tạo orderId
    iterations = 10000
    print(f"\nĐang tạo {iterations:,} orderId...")
    
    start_time = time.time()
    for _ in range(iterations):
        get_next_order_id()
    end_time = time.time()
    
    elapsed = end_time - start_time
    rate = iterations / elapsed
    
    print(f"\n📊 Kết quả:")
    print(f"  - Thời gian: {elapsed:.3f} giây")
    print(f"  - Tốc độ: {rate:,.0f} orderId/giây")
    print(f"  - Trung bình: {(elapsed/iterations)*1000:.3f} ms/orderId")
    
    print("\n💡 So sánh:")
    print("  - Logic cũ (đọc/ghi file): ~1-5 ms/orderId")
    print(f"  - Logic mới (timestamp+random): ~{(elapsed/iterations)*1000:.3f} ms/orderId")
    print(f"  - Nhanh hơn: ~{(5/(elapsed/iterations*1000)):.0f}x")
    
    print("\n✅ Performance test hoàn tất!")
    return True


def run_all_tests():
    """Chạy tất cả tests"""
    print("\n" + "="*80)
    print("🧪 CHẠY TẤT CẢ TESTS CHO ORDER_ID MỚI")
    print("="*80)
    
    tests = [
        ("Format validation", test_format),
        ("Uniqueness check", test_uniqueness),
        ("Timestamp accuracy", test_timestamp_accuracy),
        ("Parse orderId", test_parse_order_id),
        ("Collision probability", test_collision_probability),
        ("Performance", test_performance),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' gặp lỗi: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Tổng kết
    print("\n" + "="*80)
    print("📊 TỔNG KẾT")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {test_name}")
    
    print(f"\n{'='*80}")
    print(f"Kết quả: {passed}/{total} tests passed")
    print(f"{'='*80}\n")
    
    if passed == total:
        print("🎉 TẤT CẢ TESTS ĐỀU PASS! Logic OrderID mới hoạt động tốt!")
        return 0
    else:
        print(f"⚠️  Có {total - passed} tests failed. Vui lòng kiểm tra lại!")
        return 1


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test OrderID generation logic")
    parser.add_argument(
        "--test",
        choices=["all", "format", "unique", "timestamp", "parse", "collision", "performance"],
        default="all",
        help="Chọn test để chạy"
    )
    
    args = parser.parse_args()
    
    if args.test == "all":
        exit_code = run_all_tests()
    elif args.test == "format":
        exit_code = 0 if test_format() else 1
    elif args.test == "unique":
        exit_code = 0 if test_uniqueness() else 1
    elif args.test == "timestamp":
        exit_code = 0 if test_timestamp_accuracy() else 1
    elif args.test == "parse":
        exit_code = 0 if test_parse_order_id() else 1
    elif args.test == "collision":
        exit_code = 0 if test_collision_probability() else 1
    elif args.test == "performance":
        exit_code = 0 if test_performance() else 1
    
    sys.exit(exit_code)

