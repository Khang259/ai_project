from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import platform
import psutil
import os
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)
CORS(app)  

# Đường dẫn Python environment cố định
PYTHON_EXECUTABLE = r"D:\WORK\ROI_LOGIC\venv\Scripts\python.exe"

# Lưu process IDs của các file đang chạy
running_processes = {}

class ProcessManager:
    def __init__(self):
        self.system = platform.system()
    
    def start_ai(self, file_paths):
        """Khởi chạy 4 file Python"""
        results = []
        
        for i, file_path in enumerate(file_paths):
            if not os.path.exists(file_path):
                results.append({
                    'file': file_path,
                    'status': 'error',
                    'message': 'File không tồn tại'
                })
                continue
            work_dir = os.path.dirname(file_path)

            try:
                # Chạy file Python và lưu process
                if self.system == "Windows":
                    python_cmd = [PYTHON_EXECUTABLE, file_path] if os.path.exists(PYTHON_EXECUTABLE) else ['python', file_path]
                    process = subprocess.Popen(
                        python_cmd,
                        cwd=work_dir,
                        creationflags=subprocess.CREATE_NEW_CONSOLE
                    )
                else:  # macOS/Linux
                    process = subprocess.Popen(
                        ['python3', file_path],
                        cwd=work_dir,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE
                    )

                # Lưu PID
                running_processes[f'file_{i+1}'] = {
                    'pid': process.pid,
                    'path': file_path,
                    'process': process
                }
                
                results.append({
                    'file': file_path,
                    'status': 'success',
                    'pid': process.pid
                })

                time.sleep(3)
            except Exception as e:
                results.append({
                    'file': file_path,
                    'status': 'error',
                    'message': str(e)
                })
        
        return results
    
    def stop_ai(self):
        """Dừng tất cả các process đang chạy"""
        results = []
        
        for key, proc_info in list(running_processes.items()):
            try:
                pid = proc_info['pid']
                
                # Kill process và các process con
                parent = psutil.Process(pid)
                for child in parent.children(recursive=True):
                    child.kill()
                parent.kill()
                
                results.append({
                    'file': proc_info['path'],
                    'status': 'stopped',
                    'pid': pid
                })
                
                del running_processes[key]
            except Exception as e:
                results.append({
                    'file': proc_info['path'],
                    'status': 'error',
                    'message': str(e)
                })
        
        return results
    
    def get_status(self):
        """Kiểm tra trạng thái các process"""
        status = {}
        
        for key, proc_info in running_processes.items():
            try:
                process = psutil.Process(proc_info['pid'])
                is_running = process.is_running()
                status[key] = {
                    'running': is_running,
                    'pid': proc_info['pid'],
                    'path': proc_info['path']
                }
            except:
                status[key] = {
                    'running': False,
                    'pid': proc_info['pid'],
                    'path': proc_info['path']
                }
        
        return status

# Khởi tạo manager
manager = ProcessManager()

# Cấu hình đường dẫn đến 4 file Python
PYTHON_FILES = [
    os.path.join(BASE_DIR, "../../../ai/detectObject/main.py"),
    os.path.join(BASE_DIR, "../../../ai/roi_processor.py"),
    os.path.join(BASE_DIR, "../../../ai/logic/stable_pair_processor.py"),
    os.path.join(BASE_DIR, "../../../ai/postRq/postAPI.py")
]

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/api/ai/start', methods=['POST'])
def start_ai():
    """API để khởi chạy phần mềm 1"""
    try:
        results = manager.start_ai(PYTHON_FILES)
        return jsonify({
            'success': True,
            'message': 'Đã khởi chạy Phần mềm 1',
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/ai/stop', methods=['POST'])
def stop_ai():
    """API để dừng phần mềm 1"""
    try:
        results = manager.stop_ai()
        return jsonify({
            'success': True,
            'message': 'Đã dừng Phần mềm 1',
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/ai/status', methods=['GET'])
def get_status():
    """API để kiểm tra trạng thái"""
    try:
        status = manager.get_status()
        is_running = any(s['running'] for s in status.values())
        
        return jsonify({
            'success': True,
            'running': is_running,
            'processes': status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/api/ai/toggle', methods=['POST'])
def toggle_ai():
    """API để bật/tắt phần mềm 1"""
    try:
        status = manager.get_status()
        is_running = any(s['running'] for s in status.values())
        
        if is_running:
            results = manager.stop_ai()
            return jsonify({
                'success': True,
                'action': 'stopped',
                'message': 'Đã tắt Phần mềm 1',
                'results': results
            })
        else:
            results = manager.start_ai(PYTHON_FILES)
            return jsonify({
                'success': True,
                'action': 'started',
                'message': 'Đã bật Phần mềm 1',
                'results': results
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    print(" Backend API đang chạy tại: http://localhost:5000")
    app.run(debug=True, port=5000)