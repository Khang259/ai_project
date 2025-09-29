import cv2
import torch
from ultralytics import YOLO

# --- Fix cho PyTorch 2.6+ (ép weights_only=False) ---
_orig_load = torch.load
def _patched_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _orig_load(*args, **kwargs)
torch.load = _patched_load

# 1. Load model YOLO
model = YOLO("model_0702.pt")

# 2. Mở video (thay "video.mp4" bằng 0 nếu dùng webcam)
cap = cv2.VideoCapture("20250912_20340822015951_20340822030502_111532.mp4")

if not cap.isOpened():
    print("Không mở được video!")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # 3. Chạy YOLO detect
    results = model(frame)

    # 4. Hiển thị bounding box + in tọa độ
    for result in results:
        boxes = result.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            label = f"{model.names[cls]} {conf:.2f}"

            # In ra terminal
            print(f"Object: {model.names[cls]}, "
                  f"Coordinates: ({x1:.1f}, {y1:.1f}, {x2:.1f}, {y2:.1f}), "
                  f"Confidence: {conf:.2f}")

            # Vẽ bounding box
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            cv2.putText(frame, label, (int(x1), int(y1) - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    # 5. Hiển thị video
    cv2.imshow("YOLO Detection", frame)

    # Nhấn "q" để thoát
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
