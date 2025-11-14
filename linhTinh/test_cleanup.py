#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script cho Daily Cleanup System
"""

import os
import sys
import time
import tempfile
import shutil
from pathlib import Path
from daily_cleanup import ROILogicCleaner
from cleanup_service import CleanupService

def create_test_environment():
    """Tạo môi trường test với các file giả"""
    print("=== Tạo môi trường test ===")
    
    # Tạo các thư mục test
    test_dirs = [
        "logs",
        "logs/logs_post_request", 
        "logs/logs_errors",
        "detectObject/logs",
        "__pycache__",
        "logic/__pycache__",
        "logic"
    ]
    
    for dir_path in test_dirs:
        os.makedirs(dir_path, exist_ok=True)
        print(f"✓ Tạo thư mục: {dir_path}")
    
    # Tạo các file test
    test_files = [
        "logs/roi_processor.log",
        "logs/stable_pair_processor.log", 
        "logs/logs_post_request/log_post_request_20250929.log",
        "logs/logs_errors/error_20250929.log",
        "detectObject/logs/detection.log",
        "__pycache__/test.pyc",
        "logic/__pycache__/module.pyc",
        "logic/queues.db",
        "temp_file.tmp",
        "test_file.temp"
    ]
    
    for file_path in test_files:
        # Tạo file với nội dung giả
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w') as f:
            f.write(f"Test content for {file_path}\n")
            f.write("This is a test file created for cleanup testing.\n")
        print(f"✓ Tạo file: {file_path}")
    
    # Tạo SQLite database giả
    import sqlite3
    db_path = "logic/queues.db"
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            topic TEXT,
            key TEXT,
            payload TEXT,
            created_at TEXT
        )
    """)
    conn.execute("INSERT INTO messages (topic, key, payload, created_at) VALUES (?, ?, ?, ?)",
                ("test_topic", "test_key", "test_payload", "2024-01-01T00:00:00Z"))
    conn.commit()
    conn.close()
    print(f"✓ Tạo SQLite database: {db_path}")

def show_current_state():
    """Hiển thị trạng thái hiện tại của các file"""
    print("\n=== Trạng thái hiện tại ===")
    
    paths_to_check = [
        "logs",
        "detectObject/logs",
        "__pycache__",
        "logic/__pycache__", 
        "logic/queues.db",
        "*.tmp",
        "*.temp"
    ]
    
    for path_pattern in paths_to_check:
        if "*" in path_pattern:
            # Pattern matching
            import glob
            files = glob.glob(path_pattern)
            if files:
                print(f"📁 {path_pattern}: {len(files)} files")
                for f in files:
                    print(f"   - {f}")
            else:
                print(f"📁 {path_pattern}: Không có file")
        else:
            path = Path(path_pattern)
            if path.exists():
                if path.is_dir():
                    files = list(path.rglob("*"))
                    file_count = len([f for f in files if f.is_file()])
                    dir_count = len([f for f in files if f.is_dir()])
                    print(f"📁 {path}: {file_count} files, {dir_count} subdirs")
                else:
                    size = path.stat().st_size
                    print(f"📄 {path}: {size} bytes")
            else:
                print(f"❌ {path}: Không tồn tại")

def test_dry_run():
    """Test chế độ dry run"""
    print("\n=== Test Dry Run ===")
    
    cleaner = ROILogicCleaner(project_root=".", dry_run=True)
    cleaner.run_cleanup()

def test_actual_cleanup():
    """Test cleanup thực tế"""
    print("\n=== Test Actual Cleanup ===")
    
    cleaner = ROILogicCleaner(project_root=".", dry_run=False)
    cleaner.run_cleanup()

def test_cleanup_service():
    """Test cleanup service"""
    print("\n=== Test Cleanup Service ===")
    
    # Test manual cleanup
    service = CleanupService(project_root=".")
    service.run_manual_cleanup(dry_run=True)
    
    # Test status
    service.status()

def cleanup_test_environment():
    """Dọn dẹp môi trường test"""
    print("\n=== Dọn dẹp môi trường test ===")
    
    dirs_to_remove = [
        "__pycache__",
        "logic/__pycache__",
        "detectObject"
    ]
    
    files_to_remove = [
        "temp_file.tmp",
        "test_file.temp"
    ]
    
    for dir_path in dirs_to_remove:
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path)
            print(f"✓ Xoá thư mục: {dir_path}")
    
    for file_path in files_to_remove:
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"✓ Xoá file: {file_path}")

def main():
    """Hàm main cho test"""
    print("ROI_LOGIC Daily Cleanup - Test Script")
    print("=====================================")
    
    try:
        # Hiển thị trạng thái ban đầu
        show_current_state()
        
        # Tạo môi trường test
        create_test_environment()
        
        # Hiển thị sau khi tạo test files
        show_current_state()
        
        # Test dry run
        test_dry_run()
        
        # Hiển thị trạng thái sau dry run (không thay đổi)
        show_current_state()
        
        # Hỏi user có muốn test cleanup thực tế không
        response = input("\nBạn có muốn test cleanup thực tế? (y/N): ").lower()
        if response in ['y', 'yes']:
            test_actual_cleanup()
            show_current_state()
        
        # Test cleanup service
        test_cleanup_service()
        
    except Exception as e:
        print(f"Lỗi trong quá trình test: {e}")
        return 1
    
    finally:
        # Dọn dẹp môi trường test
        cleanup_test_environment()
    
    print("\n✓ Test hoàn thành!")
    return 0

if __name__ == "__main__":
    exit(main())

