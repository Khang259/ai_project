import torch
from ultralytics import YOLO

# 🧩 Cho phép các lớp cần thiết khi unpickle YOLOv8 model
torch.serialization.add_safe_globals([
    __import__("ultralytics").nn.tasks.DetectionModel,
    torch.nn.modules.container.Sequential,
    torch.nn.Conv2d,
    torch.nn.BatchNorm2d,
    torch.nn.ReLU,
    torch.nn.Module,
])

# ✅ Patch lại torch.load để luôn cho phép full unpickle khi model đáng tin cậy
_original_torch_load = torch.load

def safe_torch_load(*args, **kwargs):
    # ép weights_only=False để tránh lỗi WeightsOnlyLoadFailed
    kwargs["weights_only"] = False
    # ép map_location nếu chưa có
    if "map_location" not in kwargs:
        kwargs["map_location"] = "cpu"
    return _original_torch_load(*args, **kwargs)

torch.load = safe_torch_load  # ⚠️ chỉ nên làm khi model .pt là do bạn huấn luyện

class YoloDetector:
    def __init__(self, model_path, use_gpu=False):
        self.model = YOLO(model_path)
        self.device = "cuda" if (use_gpu and torch.cuda.is_available()) else "cpu"
        # Log thiết bị sử dụng để suy luận
        try:
            cuda_available = torch.cuda.is_available()
            print(f"[YOLO] CUDA available: {cuda_available}")
            print(f"[YOLO] Selected device: {self.device}")
            if self.device == "cuda":
                try:
                    dev_index = torch.cuda.current_device()
                    dev_name = torch.cuda.get_device_name(dev_index)
                    print(f"[YOLO] CUDA device: index={dev_index}, name={dev_name}")
                except Exception as e:
                    print(f"[YOLO] Warning: cannot query CUDA device info: {e}")
        except Exception as e:
            print(f"[YOLO] Warning during device logging: {e}")
        # Đưa model về đúng device (Ultralytics thường tự xử lý, nhưng ta chủ động gọi)
        try:
            self.model.to(self.device)
        except Exception as e:
            print(f"[YOLO] Warning: cannot move model to {self.device}: {e}")

    def detect(self, frame):
        results = self.model.predict(source=frame, device=self.device, verbose=False)
        objects = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_name = self.model.names[int(box.cls[0])]
                conf = float(box.conf[0])
                objects.append({
                    "class": cls_name,
                    "confidence": conf,
                    "bbox": [x1, y1, x2, y2],
                })
        return objects
