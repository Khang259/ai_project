#!/usr/bin/env python3
"""
Script để kiểm tra và tạo dữ liệu test cho maintenanceLogs
"""

from pymongo import MongoClient
from datetime import datetime
import json

# Kết nối MongoDB
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "amrMaintenance"

def check_and_create_test_data():
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        maintenanceLogs = db["maintenanceLogs"]
        
        print("🔍 Kiểm tra dữ liệu hiện tại...")
        
        # Kiểm tra tổng số logs
        total_logs = maintenanceLogs.count_documents({})
        print(f"📊 Tổng số logs: {total_logs}")
        
        # Kiểm tra logs theo action
        action_counts = {}
        for log in maintenanceLogs.find({}, {"action": 1}):
            action = log.get("action", "unknown")
            action_counts[action] = action_counts.get(action, 0) + 1
        
        print(f"📈 Số lượng theo action: {action_counts}")
        
        # Nếu không có dữ liệu, tạo dữ liệu test
        if total_logs == 0:
            print("⚠️ Không có dữ liệu! Đang tạo dữ liệu test...")
            
            # Tạo dữ liệu test cho kiểm tra định kỳ
            test_check_logs = [
                {
                    "id_thietBi": "AMR001",
                    "ten_thietBi": "Robot AMR 001",
                    "action": "kiểm tra định kỳ",
                    "chu_ky": "ngày",
                    "old_data": {
                        "id_thietBi": "AMR001",
                        "ten_thietBi": "Robot AMR 001",
                        "chu_ky": "ngày",
                        "trang_thai": "pending",
                        "ngay_check": None
                    },
                    "new_data": {
                        "id_thietBi": "AMR001",
                        "ten_thietBi": "Robot AMR 001",
                        "chu_ky": "ngày",
                        "trang_thai": "done",
                        "ngay_check": "2024-01-15",
                        "ghi_chu": "Kiểm tra định kỳ hàng ngày - OK"
                    },
                    "ghi_chu": "Kiểm tra định kỳ hàng ngày - OK",
                    "ngay_check": "2024-01-15",
                    "created_at": datetime.now().isoformat(),
                    "created_by": "system"
                },
                {
                    "id_thietBi": "AMR002",
                    "ten_thietBi": "Robot AMR 002",
                    "action": "kiểm tra định kỳ",
                    "chu_ky": "tuần",
                    "old_data": {
                        "id_thietBi": "AMR002",
                        "ten_thietBi": "Robot AMR 002",
                        "chu_ky": "tuần",
                        "trang_thai": "pending",
                        "ngay_check": None
                    },
                    "new_data": {
                        "id_thietBi": "AMR002",
                        "ten_thietBi": "Robot AMR 002",
                        "chu_ky": "tuần",
                        "trang_thai": "done",
                        "ngay_check": "2024-01-14",
                        "ghi_chu": "Kiểm tra định kỳ hàng tuần - OK"
                    },
                    "ghi_chu": "Kiểm tra định kỳ hàng tuần - OK",
                    "ngay_check": "2024-01-14",
                    "created_at": datetime.now().isoformat(),
                    "created_by": "system"
                }
            ]
            
            # Tạo dữ liệu test cho thay thế linh kiện
            test_replacement_logs = [
                {
                    "amr_id": "AMR001",
                    "action": "Thay thế linh kiện",
                    "Mã linh kiện": "LK001",
                    "Loại linh kiện": "Motor",
                    "Số lượng/ AMR": 1,
                    "Ngày update": "2024-01-15",
                    "Ghi chú": "Thay thế motor bị hỏng",
                    "timestamp": datetime.now().isoformat()
                },
                {
                    "amr_id": "AMR002",
                    "action": "Thay thế linh kiện",
                    "Mã linh kiện": "LK002",
                    "Loại linh kiện": "Battery",
                    "Số lượng/ AMR": 2,
                    "Ngày update": "2024-01-14",
                    "Ghi chú": "Thay thế pin hết hạn",
                    "timestamp": datetime.now().isoformat()
                }
            ]
            
            # Insert dữ liệu test
            result_check = maintenanceLogs.insert_many(test_check_logs)
            result_replacement = maintenanceLogs.insert_many(test_replacement_logs)
            
            print(f"✅ Đã tạo {len(result_check.inserted_ids)} logs kiểm tra định kỳ")
            print(f"✅ Đã tạo {len(result_replacement.inserted_ids)} logs thay thế linh kiện")
            
        else:
            print("✅ Đã có dữ liệu trong database")
            
        # Hiển thị sample data
        print("\n📋 Sample data:")
        sample_logs = list(maintenanceLogs.find({}).limit(3))
        for i, log in enumerate(sample_logs):
            print(f"Log {i+1}:")
            print(f"  Action: {log.get('action', 'N/A')}")
            print(f"  Device: {log.get('ten_thietBi', log.get('amr_id', 'N/A'))}")
            print(f"  Created: {log.get('created_at', log.get('timestamp', 'N/A'))}")
            print()
            
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    check_and_create_test_data()
