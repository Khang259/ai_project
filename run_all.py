import os
import sys
import time
import signal
import subprocess
import multiprocessing as mp
from typing import List, Optional
from datetime import datetime


class ProcessRunner:
    """Quản lý chạy nhiều Python scripts đồng thời"""
    
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.running = True
        
        # Danh sách các script cần chạy (relative path từ thư mục gốc ROI_LOGIC)
        self.scripts = [
            {
                "name": "Camera System",
                "path": "detectObject/main.py",
                "cwd": "detectObject"
            },
            {
                "name": "ROI Processor",
                "path": "roi_processor.py",
                "cwd": None  # Chạy từ root
            },
            {
                "name": "Stable Pair Processor",
                "path": "logic/stable_pair_processor.py",
                "cwd": "logic"
            },
            {
                "name": "POST API",
                "path": "postRq/postAPI.py",
                "cwd": "postRq"
            }
        ]
        
    def log(self, message: str):
        """In log với timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
    
    def start_process(self, script_info: dict) -> Optional[subprocess.Popen]:
        """Khởi động một Python script trong process riêng"""
        name = script_info["name"]
        path = script_info["path"]
        cwd = script_info.get("cwd")
        
        try:
            # Xác định thư mục làm việc
            if cwd:
                working_dir = os.path.join(os.path.dirname(__file__), cwd)
            else:
                working_dir = os.path.dirname(__file__)
            
            # Xác định đường dẫn file
            script_path = os.path.join(os.path.dirname(__file__), path)
            
            if not os.path.exists(script_path):
                self.log(f"[ERROR] Không tìm thấy file: {script_path}")
                return None
            
            self.log(f"[START] Đang khởi động {name}...")
            self.log(f"        Script: {path}")
            self.log(f"        Working Dir: {working_dir}")
            
            # Khởi động process
            process = subprocess.Popen(
                [sys.executable, os.path.basename(path)],
                cwd=working_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                bufsize=1,
                universal_newlines=True
            )
            
            self.log(f"[OK] {name} đã khởi động (PID: {process.pid})")
            return process
            
        except Exception as e:
            self.log(f"[ERROR] Lỗi khi khởi động {name}: {e}")
            return None
    
    def start_all(self):
        """Khởi động tất cả các script"""
        self.log("="*80)
        self.log("BẮT ĐẦU KHỞI ĐỘNG HỆ THỐNG ROI LOGIC")
        self.log("="*80)
        
        for script_info in self.scripts:
            process = self.start_process(script_info)
            if process:
                self.processes.append({
                    "name": script_info["name"],
                    "process": process,
                    "start_time": time.time()
                })
                # Đợi một chút giữa các lần khởi động
                time.sleep(3)
        
        self.log("="*80)
        self.log(f"ĐÃ KHỞI ĐỘNG {len(self.processes)}/{len(self.scripts)} PROCESS")
        self.log("="*80)
        self.log("")
        self.log("Nhấn Ctrl+C để dừng tất cả các process...")
        self.log("")
    
    def monitor_processes(self):
        """Monitor trạng thái các process"""
        while self.running:
            try:
                time.sleep(5)
                
                # Kiểm tra trạng thái các process
                for proc_info in self.processes:
                    process = proc_info["process"]
                    name = proc_info["name"]
                    
                    # Kiểm tra xem process có bị tắt không
                    if process.poll() is not None:
                        exit_code = process.returncode
                        runtime = time.time() - proc_info["start_time"]
                        self.log(f"[WARNING] {name} đã dừng (Exit code: {exit_code}, Runtime: {runtime:.1f}s)")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                self.log(f"[ERROR] Lỗi khi monitor: {e}")
    
    def stop_all(self):
        """Dừng tất cả các process"""
        self.running = False
        
        self.log("")
        self.log("="*80)
        self.log("ĐANG DỪNG TẤT CẢ CÁC PROCESS...")
        self.log("="*80)
        
        for proc_info in self.processes:
            name = proc_info["name"]
            process = proc_info["process"]
            
            try:
                if process.poll() is None:  # Process còn chạy
                    self.log(f"[STOP] Đang dừng {name} (PID: {process.pid})...")
                    process.terminate()
                    
                    # Đợi process dừng (timeout 5s)
                    try:
                        process.wait(timeout=5)
                        self.log(f"[OK] {name} đã dừng")
                    except subprocess.TimeoutExpired:
                        self.log(f"[FORCE] {name} không phản hồi, force kill...")
                        process.kill()
                        process.wait()
                        self.log(f"[OK] {name} đã bị force kill")
                else:
                    self.log(f"[SKIP] {name} đã dừng trước đó")
                    
            except Exception as e:
                self.log(f"[ERROR] Lỗi khi dừng {name}: {e}")
        
        self.log("="*80)
        self.log("ĐÃ DỪNG TẤT CẢ CÁC PROCESS")
        self.log("="*80)
    
    def run(self):
        """Chạy hệ thống"""
        try:
            # Khởi động tất cả
            self.start_all()
            
            # Monitor
            self.monitor_processes()
            
        except KeyboardInterrupt:
            self.log("\n[INTERRUPT] Nhận tín hiệu dừng từ người dùng...")
        except Exception as e:
            self.log(f"[ERROR] Lỗi không mong đợi: {e}")
        finally:
            # Dừng tất cả
            self.stop_all()


def main():
    """Hàm main"""
    # Kiểm tra xem đang ở đúng thư mục không
    if not os.path.exists("detectObject") or not os.path.exists("logic"):
        print("ERROR: Vui lòng chạy script này từ thư mục gốc ROI_LOGIC")
        return 1
    
    # Tạo runner và chạy
    runner = ProcessRunner()
    runner.run()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

