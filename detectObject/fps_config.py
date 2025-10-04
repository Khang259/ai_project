"""
Cấu hình FPS cho hệ thống detectObject
"""

# Cấu hình FPS mặc định
DEFAULT_FPS_CONFIG = {
    # FPS cho camera capture và AI inference
    "target_fps": 1.0,  # FPS mục tiêu (có thể thay đổi: 0.5, 1.0, 2.0, 5.0, 10.0)
    
    # Các preset FPS phổ biến
    "presets": {
        "very_low": 0.5,    # 0.5 FPS - tiết kiệm tài nguyên tối đa
        "low": 1.0,         # 1 FPS - tiết kiệm tài nguyên
        "normal": 2.0,      # 2 FPS - cân bằng (mặc định)
        "high": 5.0,        # 5 FPS - hiệu suất cao
        "very_high": 10.0   # 10 FPS - hiệu suất tối đa
    },
    
    # Thông tin về từng preset
    "preset_info": {
        "very_low": {
            "description": "Tiết kiệm tài nguyên tối đa",
            "cpu_usage": "Rất thấp",
            "gpu_usage": "Rất thấp",
            "detection_rate": "2 detections/phút/camera",
            "use_case": "Monitoring dài hạn, hệ thống có tài nguyên hạn chế"
        },
        "low": {
            "description": "Tiết kiệm tài nguyên",
            "cpu_usage": "Thấp",
            "gpu_usage": "Thấp", 
            "detection_rate": "4 detections/phút/camera",
            "use_case": "Monitoring cơ bản, hệ thống có tài nguyên hạn chế"
        },
        "normal": {
            "description": "Cân bằng hiệu suất và tài nguyên",
            "cpu_usage": "Trung bình",
            "gpu_usage": "Trung bình",
            "detection_rate": "8 detections/phút/camera", 
            "use_case": "Sử dụng hàng ngày, cân bằng tốt"
        },
        "high": {
            "description": "Hiệu suất cao",
            "cpu_usage": "Cao",
            "gpu_usage": "Cao",
            "detection_rate": "20 detections/phút/camera",
            "use_case": "Monitoring real-time, hệ thống có tài nguyên tốt"
        },
        "very_high": {
            "description": "Hiệu suất tối đa",
            "cpu_usage": "Rất cao",
            "gpu_usage": "Rất cao", 
            "detection_rate": "40 detections/phút/camera",
            "use_case": "Monitoring real-time cao cấp, hệ thống mạnh"
        }
    }
}

def get_fps_config(preset_name=None, custom_fps=None):
    """
    Lấy cấu hình FPS
    
    Args:
        preset_name: Tên preset ("very_low", "low", "normal", "high", "very_high")
        custom_fps: FPS tùy chỉnh (float)
    
    Returns:
        float: FPS value
    """
    if custom_fps is not None:
        return float(custom_fps)
    
    if preset_name and preset_name in DEFAULT_FPS_CONFIG["presets"]:
        return DEFAULT_FPS_CONFIG["presets"][preset_name]
    
    return DEFAULT_FPS_CONFIG["target_fps"]

def print_fps_presets():
    """In ra thông tin các preset FPS"""
    print("=== CÁC PRESET FPS CÓ SẴN ===")
    for preset_name, info in DEFAULT_FPS_CONFIG["preset_info"].items():
        fps_value = DEFAULT_FPS_CONFIG["presets"][preset_name]
        print(f"\n{preset_name.upper()} ({fps_value} FPS):")
        print(f"  Mô tả: {info['description']}")
        print(f"  CPU Usage: {info['cpu_usage']}")
        print(f"  GPU Usage: {info['gpu_usage']}")
        print(f"  Detection Rate: {info['detection_rate']}")
        print(f"  Use Case: {info['use_case']}")

if __name__ == "__main__":
    print_fps_presets()
