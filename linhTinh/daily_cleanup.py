#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Daily Cleanup System for ROI_LOGIC Project
Tự động xoá logs, queues, kết quả nhận diện vào cuối ngày
"""

import os
import shutil
import sqlite3
import schedule
import time
import logging
import argparse
from datetime import datetime, timedelta
from typing import List, Optional
from pathlib import Path
import glob


def setup_cleanup_logger(log_file: str = "logs/daily_cleanup.log") -> logging.Logger:
    """Thiết lập logger cho cleanup system"""
    # Tạo thư mục logs nếu chưa có
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    logger = logging.getLogger('daily_cleanup')
    logger.setLevel(logging.INFO)
    
    # Tránh duplicate handlers
    if logger.handlers:
        return logger
    
    # Tạo formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Thêm handlers vào logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


class ROILogicCleaner:
    """Class quản lý cleanup cho dự án ROI_LOGIC"""
    
    def __init__(self, project_root: str = ".", dry_run: bool = False):
        """
        Khởi tạo cleaner
        
        Args:
            project_root: Thư mục gốc của dự án
            dry_run: Nếu True, chỉ log không thực sự xoá
        """
        self.project_root = Path(project_root).resolve()
        self.dry_run = dry_run
        self.logger = setup_cleanup_logger()
        
        # Cấu hình các thư mục và file cần xoá
        self.cleanup_config = {
            # Log directories
            "log_dirs": [
                "logs",
                "detectObject/logs"
            ],
            # SQLite databases
            "db_files": [
                "logic/queues.db",
                "queues.db",
                "*.db"  # Pattern để tìm tất cả .db files
            ],
            # Cache directories  
            "cache_dirs": [
                "__pycache__",
                "*/__pycache__",
                "**/__pycache__"
            ],
            # Temporary files
            "temp_patterns": [
                "*.tmp",
                "*.temp",
                "*.log.*",  # rotated log files
                "*.pyc",
                "*.pyo"
            ],
            # Specific files to preserve
            "preserve_files": [
                "logs/daily_cleanup.log",  # Preserve cleanup log
                "logs/README_logging.md"   # Preserve documentation
            ]
        }
    
    def log_action(self, action: str, target: str, success: bool = True, error: Optional[str] = None):
        """Log cleanup actions"""
        status = "SUCCESS" if success else "ERROR"
        prefix = "[DRY_RUN] " if self.dry_run else ""
        
        if success:
            self.logger.info(f"{prefix}{action}: {target} - {status}")
        else:
            self.logger.error(f"{prefix}{action}: {target} - {status} - {error}")
    
    def clean_log_files(self) -> None:
        """Xoá các file log cũ"""
        self.logger.info("=== Bắt đầu dọn dẹp log files ===")
        cleaned_count = 0
        
        for log_dir in self.cleanup_config["log_dirs"]:
            log_path = self.project_root / log_dir
            
            if not log_path.exists():
                self.logger.info(f"Thư mục log không tồn tại: {log_path}")
                continue
            
            # Duyệt qua tất cả file trong thư mục log
            for file_path in log_path.rglob("*"):
                if file_path.is_file():
                    # Kiểm tra file có trong danh sách preserve không
                    relative_path = file_path.relative_to(self.project_root)
                    if str(relative_path) in self.cleanup_config["preserve_files"]:
                        self.logger.info(f"Bảo tồn file: {relative_path}")
                        continue
                    
                    try:
                        if not self.dry_run:
                            file_path.unlink()
                        self.log_action("XOÁ LOG FILE", str(relative_path))
                        cleaned_count += 1
                    except Exception as e:
                        self.log_action("XOÁ LOG FILE", str(relative_path), False, str(e))
        
        self.logger.info(f"Đã xoá {cleaned_count} log files")
    
    def clean_queue_databases(self) -> None:
        """Xoá SQLite queue databases"""
        self.logger.info("=== Bắt đầu dọn dẹp queue databases ===")
        cleaned_count = 0
        
        for db_pattern in self.cleanup_config["db_files"]:
            if "*" in db_pattern:
                # Pattern matching
                for db_path in self.project_root.glob(db_pattern):
                    if db_path.is_file():
                        try:
                            # Kiểm tra xem có phải SQLite file không
                            if self.is_sqlite_file(db_path):
                                if not self.dry_run:
                                    db_path.unlink()
                                self.log_action("XOÁ DATABASE", str(db_path.relative_to(self.project_root)))
                                cleaned_count += 1
                        except Exception as e:
                            self.log_action("XOÁ DATABASE", str(db_path.relative_to(self.project_root)), False, str(e))
            else:
                # Direct path
                db_path = self.project_root / db_pattern
                if db_path.exists():
                    try:
                        if not self.dry_run:
                            db_path.unlink()
                        self.log_action("XOÁ DATABASE", str(db_path.relative_to(self.project_root)))
                        cleaned_count += 1
                    except Exception as e:
                        self.log_action("XOÁ DATABASE", str(db_path.relative_to(self.project_root)), False, str(e))
        
        self.logger.info(f"Đã xoá {cleaned_count} database files")
    
    def clean_cache_directories(self) -> None:
        """Xoá cache directories"""
        self.logger.info("=== Bắt đầu dọn dẹp cache directories ===")
        cleaned_count = 0
        
        for cache_pattern in self.cleanup_config["cache_dirs"]:
            for cache_path in self.project_root.glob(cache_pattern):
                if cache_path.is_dir():
                    try:
                        if not self.dry_run:
                            shutil.rmtree(cache_path)
                        self.log_action("XOÁ CACHE DIR", str(cache_path.relative_to(self.project_root)))
                        cleaned_count += 1
                    except Exception as e:
                        self.log_action("XOÁ CACHE DIR", str(cache_path.relative_to(self.project_root)), False, str(e))
        
        self.logger.info(f"Đã xoá {cleaned_count} cache directories")
    
    def clean_temp_files(self) -> None:
        """Xoá temporary files"""
        self.logger.info("=== Bắt đầu dọn dẹp temporary files ===")
        cleaned_count = 0
        
        for temp_pattern in self.cleanup_config["temp_patterns"]:
            for temp_path in self.project_root.rglob(temp_pattern):
                if temp_path.is_file():
                    try:
                        if not self.dry_run:
                            temp_path.unlink()
                        self.log_action("XOÁ TEMP FILE", str(temp_path.relative_to(self.project_root)))
                        cleaned_count += 1
                    except Exception as e:
                        self.log_action("XOÁ TEMP FILE", str(temp_path.relative_to(self.project_root)), False, str(e))
        
        self.logger.info(f"Đã xoá {cleaned_count} temporary files")
    
    def is_sqlite_file(self, file_path: Path) -> bool:
        """Kiểm tra file có phải SQLite không"""
        try:
            with open(file_path, 'rb') as f:
                header = f.read(16)
                return header.startswith(b'SQLite format 3\x00')
        except:
            return False
    
    def get_directory_size(self, dir_path: Path) -> int:
        """Tính tổng kích thước thư mục"""
        total_size = 0
        try:
            for file_path in dir_path.rglob("*"):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
        except:
            pass
        return total_size
    
    def show_cleanup_summary(self) -> None:
        """Hiển thị tóm tắt trước khi cleanup"""
        self.logger.info("=== TÓM TẮT TRƯỚC KHI CLEANUP ===")
        
        # Tính toán tổng kích thước các file sẽ bị xoá
        total_size = 0
        file_count = 0
        
        # Log files
        for log_dir in self.cleanup_config["log_dirs"]:
            log_path = self.project_root / log_dir
            if log_path.exists():
                size = self.get_directory_size(log_path)
                total_size += size
                count = sum(1 for _ in log_path.rglob("*") if _.is_file())
                file_count += count
                self.logger.info(f"Log directory {log_dir}: {count} files, {size/1024/1024:.2f} MB")
        
        # Database files
        db_size = 0
        db_count = 0
        for db_pattern in self.cleanup_config["db_files"]:
            if "*" in db_pattern:
                for db_path in self.project_root.glob(db_pattern):
                    if db_path.is_file() and self.is_sqlite_file(db_path):
                        size = db_path.stat().st_size
                        db_size += size
                        db_count += 1
            else:
                db_path = self.project_root / db_pattern
                if db_path.exists():
                    size = db_path.stat().st_size
                    db_size += size
                    db_count += 1
        
        total_size += db_size
        file_count += db_count
        self.logger.info(f"Database files: {db_count} files, {db_size/1024/1024:.2f} MB")
        
        self.logger.info(f"TỔNG CỘNG: {file_count} files, {total_size/1024/1024:.2f} MB sẽ bị xoá")
    
    def run_cleanup(self) -> None:
        """Chạy toàn bộ quá trình cleanup"""
        start_time = datetime.now()
        mode_text = "DRY RUN" if self.dry_run else "THỰC TẾ"
        
        self.logger.info(f"=== BẮT ĐẦU DAILY CLEANUP ({mode_text}) ===")
        self.logger.info(f"Project root: {self.project_root}")
        self.logger.info(f"Thời gian bắt đầu: {start_time}")
        
        try:
            # Hiển thị tóm tắt
            self.show_cleanup_summary()
            
            # Thực hiện cleanup
            self.clean_log_files()
            self.clean_queue_databases()
            self.clean_cache_directories() 
            self.clean_temp_files()
            
            end_time = datetime.now()
            duration = end_time - start_time
            
            self.logger.info(f"=== HOÀN THÀNH DAILY CLEANUP ===")
            self.logger.info(f"Thời gian kết thúc: {end_time}")
            self.logger.info(f"Thời gian thực hiện: {duration}")
            
        except Exception as e:
            self.logger.error(f"Lỗi trong quá trình cleanup: {e}")
            raise


def run_daily_cleanup(project_root: str = ".", dry_run: bool = False) -> None:
    """Hàm wrapper để chạy daily cleanup"""
    cleaner = ROILogicCleaner(project_root, dry_run)
    cleaner.run_cleanup()


def schedule_cleanup(cleanup_time: str = "23:30", project_root: str = ".", dry_run: bool = False) -> None:
    """
    Lên lịch chạy cleanup hàng ngày
    
    Args:
        cleanup_time: Thời gian chạy cleanup (HH:MM format)
        project_root: Thư mục gốc dự án
        dry_run: Chế độ dry run
    """
    logger = setup_cleanup_logger()
    
    # Lên lịch chạy hàng ngày
    schedule.every().day.at(cleanup_time).do(run_daily_cleanup, project_root, dry_run)
    
    logger.info(f"Đã lên lịch daily cleanup vào {cleanup_time} hàng ngày")
    logger.info(f"Project root: {project_root}")
    logger.info(f"Dry run mode: {dry_run}")
    logger.info("Nhấn Ctrl+C để dừng scheduler...")
    
    # Chạy scheduler
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check mỗi phút
    except KeyboardInterrupt:
        logger.info("Đã dừng cleanup scheduler")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Daily Cleanup System for ROI_LOGIC")
    parser.add_argument("--project-root", type=str, default=".", 
                       help="Thư mục gốc của dự án (mặc định: thư mục hiện tại)")
    parser.add_argument("--schedule", action="store_true", 
                       help="Chạy với scheduler hàng ngày")
    parser.add_argument("--cleanup-time", type=str, default="23:30",
                       help="Thời gian chạy cleanup (HH:MM format, mặc định: 23:30)")
    parser.add_argument("--dry-run", action="store_true",
                       help="Chế độ dry run (chỉ log, không xoá thực tế)")
    parser.add_argument("--run-now", action="store_true",
                       help="Chạy cleanup ngay lập tức")
    
    return parser.parse_args()


def main():
    """Hàm main"""
    args = parse_args()
    
    try:
        if args.run_now:
            # Chạy cleanup ngay lập tức
            run_daily_cleanup(args.project_root, args.dry_run)
        elif args.schedule:
            # Chạy với scheduler
            schedule_cleanup(args.cleanup_time, args.project_root, args.dry_run)
        else:
            # Hiển thị help
            print("ROI_LOGIC Daily Cleanup System")
            print("Sử dụng --run-now để chạy cleanup ngay")
            print("Sử dụng --schedule để chạy với scheduler hàng ngày")
            print("Sử dụng --help để xem đầy đủ tùy chọn")
    
    except Exception as e:
        print(f"Lỗi: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

