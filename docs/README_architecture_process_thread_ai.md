### Kiến trúc Process/Thread và Model AI trong ROI_LOGIC

Tài liệu này mô tả cách hệ thống sử dụng đa tiến trình (process), đa luồng (thread) và mô hình AI (YOLO), đồng thời liệt kê các file chính và luồng dữ liệu tổng thể.

---

### 1) Tổng quan

- Hệ thống gồm 2 pipeline chính chạy song song:
  - Pipeline AI Realtime (nhiều RTSP → batch YOLO GPU → hiển thị kết quả AI).
  - Pipeline ROI Processor (đọc `queues.db` → lọc theo ROI → vẽ ROI/bbox từ RTSP).

- Mục tiêu:
  - Tận dụng GPU cho suy luận YOLO (batch nhiều camera).
  - Tách concerns: hiển thị AI riêng, xử lý ROI riêng, tránh nghẽn.

---

### 2) Process (Multiprocessing)

- `detectObject/main.py` (Orchestrator):
  - Sinh nhiều process đọc camera: `camera_process_worker` (mỗi process đọc nhiều camera tùy chia nhóm).
  - Sinh 1 process AI duy nhất: `ai_inference_worker` (GPU, batch tất cả camera hợp lệ).
  - Sinh 1 process hiển thị AI: `ai_display_worker` (đọc `result_dict` do AI tạo ra).

- File liên quan:
  - `detectObject/main.py`: Tạo và quản lý lifecycle các process.
  - `detectObject/camera_process.py`: Worker đọc RTSP và đẩy frame (JPEG bytes) vào `shared_dict`.
  - `detectObject/ai_inference.py`: Worker AI (YOLO) đọc `shared_dict` → batch infer → ghi `result_dict`.
  - `detectObject/ai_display_worker.py`: Hiển thị kết quả AI từ `result_dict`.
  - `detectObject/display_worker.py`: Hiển thị frame gốc khi không bật AI.

---

### 3) Thread (Multithreading)

- `roi_visualizer.py` (VideoDisplayManager):
  - Mỗi camera có 1 thread riêng: mở `cv2.VideoCapture(rtsp_url)` → đọc frame → vẽ ROI/bbox → `cv2.imshow` một cửa sổ/camera.
  - Tự đọc ROI từ `queues.db` (topic `roi_config`, key=`camera_id`) nếu `roi_cache` của processor chưa có.

- `roi_processor.py` (ROIProcessor):
  - Các thread nền:
    - Subscribe `roi_config` (cập nhật cache ROI).
    - Subscribe `raw_detection` (lọc theo ROI, sinh `roi_detection`).
    - Subscribe `stable_pairs` (block/unlock ROI theo quy tắc start/end).
    - Thread hiển thị video (gọi `VideoDisplayManager`).

---

### 4) Model AI (YOLO)

- `detectObject/ai_inference.py`:
  - `YOLOInference`: bắt buộc dùng GPU (`cuda:0`). Nếu không có CUDA → dừng chương trình.
  - `ai_inference_worker`: Gom tất cả frame hợp lệ → batch inference → ghi kết quả JPEG + metadata.

- `yolo_detector.py` (ngoài pipeline detectObject):
  - Có thể dùng YOLO cho các tác vụ khác (tùy implementation cụ thể trong repo).

---

### 5) Danh sách file chính theo chủ đề

- Orchestrator & Processes:
  - `detectObject/main.py`
  - `detectObject/camera_process.py`
  - `detectObject/ai_inference.py`
  - `detectObject/ai_display_worker.py`
  - `detectObject/display_worker.py`

- ROI Processing & Threads:
  - `roi_processor.py`
  - `roi_visualizer.py`
  - `queue_store.py` (SQLiteQueue: publish/subscribe qua `queues.db`)

- Cấu hình/Model/Khác:
  - `logic/cam_config.json` (RTSP cho camera_id)
  - `logic/slot_pairing_config.json` (starts/ends/pairs/roi_coordinates)
  - `model/*.pt` (YOLO models)
  - `queues.db` (SQLite messages: topics `roi_config`, `raw_detection`, `roi_detection`, `stable_pairs`, ...)

---

### 6) Luồng dữ liệu tổng thể

- Pipeline AI Realtime (processes):
  1. `camera_process_worker` → đọc RTSP từng camera → nén JPEG bytes → ghi `shared_dict[cam_name]`.
  2. `ai_inference_worker` (GPU) → thu thập frames hợp lệ → batch YOLO → vẽ lên frame → nén JPEG → ghi `result_dict[cam_name]` + metadata.
  3. `ai_display_worker` → đọc `result_dict` → hiển thị.

- Pipeline ROI Processor (threads):
  1. `ROIProcessor.subscribe_roi_config` → đọc/push `roi_config` từ/đến `queues.db` vào cache.
  2. `ROIProcessor.subscribe_raw_detection` → đọc detections, lọc theo ROI (block/unlock logic), push `roi_detection`.
  3. `VideoDisplayManager` (thread/camera) → đọc RTSP → vẽ ROI/bbox (từ cache hoặc đọc trực tiếp DB khi cache trống) → hiển thị.

---

### 7) Flowchart (Mermaid)

```mermaid
flowchart LR
  subgraph A[Pipeline AI Realtime - Processes]
    CP[camera_process_worker<br/>N tiến trình] -->|shared_dict (JPEG, ts, status)| AIW[ai_inference_worker<br/>1 tiến trình, GPU batch]
    AIW -->|result_dict (JPEG+meta)| AID[ai_display_worker]
  end

  subgraph B[Pipeline ROI - Threads]
    RPC[roi_processor.py<br/>Threads: roi_config, raw_detection, stable_pairs] --> VDM[VideoDisplayManager<br/>thread/camera]
    VDM -->|cv2.imshow| USER((Màn hình))
  end

  DB[(queues.db)]

  RPC <-->|roi_config/raw_detection/roi_detection/stable_pairs| DB
  VDM -->|đọc ROI trực tiếp khi cần| DB

  NOTE1[[GPU]]
  AIW --> NOTE1
```

---

### 8) Ghi chú vận hành

- GPU: Bắt buộc có CUDA để `ai_inference.py` chạy; nếu không, worker AI sẽ dừng ngay.
- Hiệu năng CPU:
  - Encode/decode JPEG tốn CPU; cân nhắc truyền `np.ndarray` nếu hạ tầng cho phép.
  - Điều chỉnh sleep và batch-size để đạt cân bằng.
- RTSP:
  - Cần backend ffmpeg/GStreamer phù hợp. Kiểm tra log nếu không mở được stream.
- Đồng bộ:
  - Sử dụng `multiprocessing.Manager().dict()` cho `shared_dict`/`result_dict` để chia sẻ giữa process.


