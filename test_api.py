"""
Script test API cho User-Controlled End Slots
"""
import requests
import json
import time

BASE_URL = "http://localhost:8001"

def print_response(response):
    """In response đẹp"""
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except:
        print(response.text)
    print("-" * 50)

def test_request_end_slot(end_qr, reason="test"):
    """Test request end slot"""
    print(f"\n🔵 TEST: Request end slot {end_qr}")
    response = requests.post(
        f"{BASE_URL}/api/request-end-slot",
        json={"end_qr": end_qr, "reason": reason}
    )
    print_response(response)
    return response.json() if response.status_code == 200 else None

def test_cancel_end_slot(end_qr, reason="test"):
    """Test cancel end slot"""
    print(f"\n🔴 TEST: Cancel end slot {end_qr}")
    response = requests.post(
        f"{BASE_URL}/api/cancel-end-slot",
        json={"end_qr": end_qr, "reason": reason}
    )
    print_response(response)
    return response.json() if response.status_code == 200 else None

def test_get_status():
    """Test get end slots status"""
    print(f"\n📊 TEST: Get all end slots status")
    response = requests.get(f"{BASE_URL}/api/end-slots-status")
    print_response(response)
    return response.json() if response.status_code == 200 else None

def main():
    """Main test function"""
    print("=" * 50)
    print("TEST API - User-Controlled End Slots")
    print("=" * 50)
    
    # Test 1: Request end slot
    print("\n" + "="*50)
    print("TEST 1: Request end slot để đánh dấu empty")
    print("="*50)
    test_request_end_slot(10000004, "ready_to_receive")
    time.sleep(1)
    
    # Test 2: Request multiple end slots
    print("\n" + "="*50)
    print("TEST 2: Request nhiều end slots")
    print("="*50)
    test_request_end_slot(10000005, "also_ready")
    time.sleep(0.5)
    test_request_end_slot(10000006, "warehouse_empty")
    time.sleep(1)
    
    # Test 3: Get status
    print("\n" + "="*50)
    print("TEST 3: Kiểm tra trạng thái tất cả end slots")
    print("="*50)
    test_get_status()
    time.sleep(1)
    
    # Test 4: Cancel one slot
    print("\n" + "="*50)
    print("TEST 4: Hủy yêu cầu end slot")
    print("="*50)
    test_cancel_end_slot(10000005, "not_ready_anymore")
    time.sleep(1)
    
    # Test 5: Get status again
    print("\n" + "="*50)
    print("TEST 5: Kiểm tra lại trạng thái sau khi cancel")
    print("="*50)
    test_get_status()
    
    print("\n" + "="*50)
    print("✅ HOÀN THÀNH TẤT CẢ TESTS")
    print("="*50)
    print("\nLưu ý:")
    print("- Các end slots đã request sẽ ở trạng thái empty")
    print("- Khi stable_pair_processor phát hiện start_qr có shelf → sẽ publish pair")
    print("- Sau khi publish, end_qr sẽ TỰ ĐỘNG reset về shelf")
    print("- Kiểm tra log của stable_pair_processor để xem chi tiết")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ LỖI: Không thể kết nối đến API server")
        print("Hãy đảm bảo API handler đang chạy:")
        print("  python api_handler.py")
    except Exception as e:
        print(f"\n❌ LỖI: {e}")

