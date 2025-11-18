import os
import sys
import time
import signal
import subprocess
import multiprocessing as mp
import threading
from typing import List, Optional, Dict
from datetime import datetime


class ProcessRunner:
    """Quản lý chạy nhiều Python scripts đồng thời"""
    
    def __init__(self, auto_restart: bool = True, show_output: bool = True):
        self.processes: List[Dict] = []
        self.running = True
        self.auto_restart = auto_restart
        self.show_output = show_output
        self.restart_counts: Dict[str, int] = {}
        self.max_restarts = 5  # Giới hạn số lần restart
        
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
    
    def _read_output(self, process: subprocess.Popen, name: str):
        """Đọc output từ process và hiển thị"""
        try:
            for line in iter(process.stdout.readline, ''):
                if not line:
                    break
                if self.show_output:
                    # Hiển thị output với prefix tên process
                    print(f"[{name}] {line.rstrip()}")
        except Exception as e:
            self.log(f"[ERROR] Lỗi khi đọc output từ {name}: {e}")
    
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
            
            # Kiểm tra số lần restart
            restart_count = self.restart_counts.get(name, 0)
            if restart_count > 0:
                self.log(f"[RESTART] Đang restart {name} (lần {restart_count}/{self.max_restarts})...")
            else:
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
            
            # Tạo thread để đọc output
            output_thread = threading.Thread(
                target=self._read_output,
                args=(process, name),
                daemon=True
            )
            output_thread.start()
            
            self.log(f"[OK] {name} đã khởi động (PID: {process.pid})")
            return process
            
        except Exception as e:
            self.log(f"[ERROR] Lỗi khi khởi động {name}: {e}")
            import traceback
            self.log(f"[ERROR] Traceback: {traceback.format_exc()}")
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
                    "start_time": time.time(),
                    "script_info": script_info
                })
                # Đợi một chút giữa các lần khởi động
                time.sleep(5)
        
        self.log("="*80)
        self.log(f"ĐÃ KHỞI ĐỘNG {len(self.processes)}/{len(self.scripts)} PROCESS")
        self.log("="*80)
        self.log("")
        self.log("Nhấn Ctrl+C để dừng tất cả các process...")
        self.log("")
    
    def monitor_processes(self):
        """Monitor trạng thái các process và tự động restart nếu cần"""
        while self.running:
            try:
                time.sleep(5)
                
                # Kiểm tra trạng thái các process
                for i, proc_info in enumerate(self.processes):
                    process = proc_info["process"]
                    name = proc_info["name"]
                    script_info = proc_info["script_info"]
                    
                    # Reset restart count nếu process chạy ổn định > 60 giây
                    runtime = time.time() - proc_info["start_time"]
                    if runtime > 60 and name in self.restart_counts:
                        self.restart_counts[name] = 0
                        self.log(f"[INFO] {name} đã chạy ổn định {runtime:.0f}s, reset restart count")
                    
                    # Kiểm tra xem process có bị tắt không
                    if process.poll() is not None:
                        exit_code = process.returncode
                        runtime = time.time() - proc_info["start_time"]
                        
                        self.log("")
                        self.log(f"[WARNING] {name} đã dừng!")
                        self.log(f"         Exit code: {exit_code}")
                        self.log(f"         Runtime: {runtime:.1f}s")
                        
                        # Hiển thị thông báo lỗi
                        if exit_code != 0:
                            self.log(f"[ERROR] {name} đã dừng với lỗi (exit code: {exit_code})")
                            self.log(f"         Kiểm tra output ở trên để xem chi tiết lỗi.")
                        
                        # Tự động restart nếu được bật
                        if self.auto_restart:
                            restart_count = self.restart_counts.get(name, 0)
                            if restart_count < self.max_restarts:
                                self.restart_counts[name] = restart_count + 1
                                self.log(f"[RESTART] Sẽ restart {name} sau 3 giây...")
                                time.sleep(3)
                                
                                # Restart process
                                new_process = self.start_process(script_info)
                                if new_process:
                                    self.processes[i] = {
                                        "name": name,
                                        "process": new_process,
                                        "start_time": time.time(),
                                        "script_info": script_info
                                    }
                                    self.log(f"[OK] Đã restart {name} thành công")
                                else:
                                    self.log(f"[ERROR] Không thể restart {name}")
                            else:
                                self.log(f"[ERROR] {name} đã đạt giới hạn restart ({self.max_restarts} lần). Không restart nữa.")
                        else:
                            self.log(f"[INFO] Auto-restart đã tắt. {name} sẽ không được restart.")
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                self.log(f"[ERROR] Lỗi khi monitor: {e}")
                import traceback
                self.log(f"[ERROR] Traceback: {traceback.format_exc()}")
    
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

