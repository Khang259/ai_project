#!/usr/bin/env python3
"""
Script test đơn giản để kiểm tra FastAPI server
"""

import requests
import json
import time

def test_server():
    """Test server cơ bản"""
    base_url = "http://localhost:7000"
    
    print("="*60)
    print("TEST FASTAPI SERVER")
    print("="*60)
    
    # Test health check
    try:
        print("1. Testing health check...")
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            print("   ✓ Health check OK")
        else:
            print("   ✗ Health check failed")
            return False
            
    except Exception as e:
        print(f"   ✗ Health check error: {e}")
        return False
    
    # Test main endpoint
    try:
        print("\n2. Testing main endpoint...")
        payload = {
            "modelProcessCode": "lenhDon",
            "fromSystem": "ICS",
            "orderId": f"test_{int(time.time() * 1000)}",
            "taskOrderDetail": [
                {
                    "taskPath": "QR001,QR002"
                }
            ]
        }
        
        print(f"   Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")
        
        response = requests.post(f"{base_url}/ics/taskOrder/addTask", json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            print("   ✓ Main endpoint OK")
        else:
            print("   ✗ Main endpoint failed")
            return False
            
    except Exception as e:
        print(f"   ✗ Main endpoint error: {e}")
        return False
    
    print("\n" + "="*60)
    print("✓ TẤT CẢ TESTS THÀNH CÔNG!")
    print("Server đang hoạt động bình thường.")
    print("="*60)
    
    return True

if __name__ == "__main__":
    test_server()
