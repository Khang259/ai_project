#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cleanup Service for ROI_LOGIC Project
Service wrapper để chạy daily cleanup như một background service
"""

import os
import sys
import json
import time
import signal
import threading
from datetime import datetime
from typing import Optional
import argparse
from pathlib import Path

# Import daily_cleanup module
from daily_cleanup import ROILogicCleaner, setup_cleanup_logger
import schedule


class CleanupService:
    """Service wrapper cho daily cleanup system"""
    
    def __init__(self, config_file: str = "cleanup_config.json", project_root: str = "."):
        """
        Khởi tạo Cleanup Service
        
        Args:
            config_file: File cấu hình cleanup
            project_root: Thư mục gốc dự án
        """
        self.project_root = Path(project_root).resolve()
        self.config_file = self.project_root / config_file
        self.running = False
        self.logger = setup_cleanup_logger()
        self.config = self.load_config()
        
        # Setup signal handlers để graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def load_config(self) -> dict:
        """Load cấu hình từ file JSON"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                self.logger.info(f"Đã load config từ {self.config_file}")
                return config
            else:
                self.logger.warning(f"File config không tồn tại: {self.config_file}")
                return self.get_default_config()
        except Exception as e:
            self.logger.error(f"Lỗi khi load config: {e}")
            return self.get_default_config()
    
    def get_default_config(self) -> dict:
        """Trả về cấu hình mặc định"""
        return {
            "cleanup_schedule": {
                "enabled": True,
                "daily_time": "23:30"
            },
            "cleanup_targets": {
                "log_dirs": ["logs", "detectObject/logs"],
                "db_files": ["logic/queues.db", "queues.db"],
                "cache_dirs": ["__pycache__", "*/__pycache__", "**/__pycache__"],
                "temp_patterns": ["*.tmp", "*.temp", "*.log.*", "*.pyc", "*.pyo"],
                "preserve_files": ["logs/daily_cleanup.log", "logs/README_logging.md"]
            }
        }
    
    def signal_handler(self, signum, frame):
        """Xử lý signal để graceful shutdown"""
        self.logger.info(f"Nhận signal {signum}, đang dừng service...")
        self.stop()
    
    def run_cleanup_job(self):
        """Chạy cleanup job"""
        try:
            self.logger.info("=== BẮt ĐẦU SCHEDULED CLEANUP JOB ===")
            cleaner = ROILogicCleaner(self.project_root, dry_run=False)
            cleaner.run_cleanup()
            self.logger.info("=== HOÀN THÀNH SCHEDULED CLEANUP JOB ===")
        except Exception as e:
            self.logger.error(f"Lỗi trong cleanup job: {e}")
    
    def schedule_cleanup_jobs(self):
        """Lên lịch các cleanup jobs"""
        schedule_config = self.config.get("cleanup_schedule", {})
        
        if schedule_config.get("enabled", True):
            cleanup_time = schedule_config.get("daily_time", "23:30")
            
            # Lên lịch cleanup hàng ngày
            schedule.every().day.at(cleanup_time).do(self.run_cleanup_job)
            self.logger.info(f"Đã lên lịch daily cleanup vào {cleanup_time}")
            
            # Có thể thêm các lịch khác ở đây (weekly, monthly, etc.)
            
        else:
            self.logger.info("Cleanup scheduling bị tắt trong config")
    
    def start(self):
        """Khởi động service"""
        self.logger.info("=== BẮt ĐẦU CLEANUP SERVICE ===")
        self.logger.info(f"Project root: {self.project_root}")
        self.logger.info(f"Config file: {self.config_file}")
        
        self.running = True
        
        # Lên lịch các cleanup jobs
        self.schedule_cleanup_jobs()
        
        # Main service loop
        self.logger.info("Cleanup Service đang chạy...")
        self.logger.info("Nhấn Ctrl+C để dừng service")
        
        try:
            while self.running:
                schedule.run_pending()
                time.sleep(60)  # Check mỗi phút
                
        except KeyboardInterrupt:
            self.logger.info("Nhận KeyboardInterrupt...")
        finally:
            self.stop()
    
    def stop(self):
        """Dừng service"""
        self.running = False
        self.logger.info("=== DỪNG CLEANUP SERVICE ===")
    
    def run_manual_cleanup(self, dry_run: bool = False):
        """Chạy cleanup thủ công"""
        self.logger.info("=== CHẠY MANUAL CLEANUP ===")
        try:
            cleaner = ROILogicCleaner(self.project_root, dry_run=dry_run)
            cleaner.run_cleanup()
        except Exception as e:
            self.logger.error(f"Lỗi trong manual cleanup: {e}")
            raise
    
    def status(self):
        """Hiển thị trạng thái service"""
        print("=== CLEANUP SERVICE STATUS ===")
        print(f"Project Root: {self.project_root}")
        print(f"Config File: {self.config_file}")
        print(f"Running: {self.running}")
        
        # Hiển thị lịch đã được setup
        jobs = schedule.get_jobs()
        if jobs:
            print("Scheduled Jobs:")
            for job in jobs:
                print(f"  - {job}")
        else:
            print("Không có scheduled jobs")
        
        # Hiển thị config
        print("Current Config:")
        print(json.dumps(self.config, indent=2, ensure_ascii=False))


def create_startup_script():
    """Tạo script khởi động cho Windows"""
    script_content = f'''@echo off
echo Starting ROI_LOGIC Cleanup Service...
cd /d "{Path.cwd()}"
python cleanup_service.py --start
pause
'''
    
    script_path = Path("start_cleanup_service.bat")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print(f"Đã tạo startup script: {script_path}")


def integrate_with_main_app():
    """Tích hợp cleanup vào ứng dụng chính"""
    integration_code = '''
# Thêm vào đầu file main của dự án (roi_processor.py, yolo_detector.py, etc.)
import threading
from cleanup_service import CleanupService

# Trong hàm main() hoặc __init__():
def setup_cleanup_service():
    """Thiết lập cleanup service chạy background"""
    try:
        cleanup_service = CleanupService()
        cleanup_thread = threading.Thread(target=cleanup_service.start, daemon=True)
        cleanup_thread.start()
        print("✓ Cleanup service đã được khởi động trong background")
    except Exception as e:
        print(f"⚠ Không thể khởi động cleanup service: {e}")

# Gọi hàm này trong main():
# setup_cleanup_service()
'''
    
    integration_file = Path("cleanup_integration_guide.py")
    with open(integration_file, 'w', encoding='utf-8') as f:
        f.write(integration_code)
    
    print(f"Đã tạo hướng dẫn tích hợp: {integration_file}")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="ROI_LOGIC Cleanup Service")
    parser.add_argument("--start", action="store_true",
                       help="Khởi động cleanup service")
    parser.add_argument("--manual", action="store_true",
                       help="Chạy cleanup thủ công một lần")
    parser.add_argument("--dry-run", action="store_true",
                       help="Chế độ dry run (chỉ log, không xoá thực tế)")
    parser.add_argument("--status", action="store_true",
                       help="Hiển thị trạng thái service")
    parser.add_argument("--config", type=str, default="cleanup_config.json",
                       help="File cấu hình cleanup")
    parser.add_argument("--project-root", type=str, default=".",
                       help="Thư mục gốc dự án")
    parser.add_argument("--setup", action="store_true",
                       help="Tạo các file setup và integration")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        service = CleanupService(args.config, args.project_root)
        
        if args.start:
            service.start()
        elif args.manual:
            service.run_manual_cleanup(dry_run=args.dry_run)
        elif args.status:
            service.status()
        elif args.setup:
            create_startup_script()
            integrate_with_main_app()
            print("✓ Đã tạo các file setup và integration")
        else:
            print("ROI_LOGIC Cleanup Service")
            print("Sử dụng --help để xem các tùy chọn")
    
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

