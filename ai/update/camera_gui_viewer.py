"""
Camera GUI Viewer - Giao diện đồ họa để bật/tắt hiển thị camera
Hiển thị grid 34 icon camera, click để toggle on/off
"""

import tkinter as tk
from tkinter import ttk
import threading
import cv2
import json
import os
import time
import numpy as np
from typing import Dict, List, Any, Optional, Set
from queue_store import SQLiteQueue
from optimized_roi_visualizer import ROIVisualizer, CameraDisplayThread


class CameraIcon(tk.Frame):
    """Widget icon camera có thể click để bật/tắt"""
    
    def __init__(self, parent, camera_id: str, callback, **kwargs):
        super().__init__(parent, **kwargs)
        self.camera_id = camera_id
        self.callback = callback
        self.is_active = False
        
        # Cấu hình màu sắc
        self.color_off = "#2c3e50"  # Xám đậm
        self.color_on = "#27ae60"   # Xanh lá
        self.color_hover = "#34495e"  # Xám sáng
        
        # Frame chứa icon
        self.configure(bg=self.color_off, relief=tk.RAISED, borderwidth=2)
        self.configure(width=120, height=100)
        self.pack_propagate(False)
        
        # Label camera ID
        self.label = tk.Label(
            self,
            text=camera_id,
            font=("Arial", 11, "bold"),
            fg="white",
            bg=self.color_off
        )
        self.label.pack(expand=True)
        
        # Status indicator
        self.status_label = tk.Label(
            self,
            text="●",
            font=("Arial", 20),
            fg="#e74c3c",  # Đỏ khi off
            bg=self.color_off
        )
        self.status_label.pack()
        
        # Bind events
        self.bind("<Button-1>", self._on_click)
        self.label.bind("<Button-1>", self._on_click)
        self.status_label.bind("<Button-1>", self._on_click)
        
        self.bind("<Enter>", self._on_hover)
        self.bind("<Leave>", self._on_leave)
    
    def _on_click(self, event):
        """Xử lý click"""
        self.toggle()
        self.callback(self.camera_id, self.is_active)
    
    def _on_hover(self, event):
        """Hover effect"""
        if not self.is_active:
            self.configure(bg=self.color_hover)
            self.label.configure(bg=self.color_hover)
            self.status_label.configure(bg=self.color_hover)
    
    def _on_leave(self, event):
        """Leave hover"""
        if not self.is_active:
            self.configure(bg=self.color_off)
            self.label.configure(bg=self.color_off)
            self.status_label.configure(bg=self.color_off)
    
    def toggle(self):
        """Toggle trạng thái"""
        self.is_active = not self.is_active
        self.update_visual()
    
    def set_active(self, active: bool):
        """Set trạng thái"""
        self.is_active = active
        self.update_visual()
    
    def update_visual(self):
        """Cập nhật giao diện"""
        if self.is_active:
            bg_color = self.color_on
            status_color = "#2ecc71"  # Xanh sáng
        else:
            bg_color = self.color_off
            status_color = "#e74c3c"  # Đỏ
        
        self.configure(bg=bg_color)
        self.label.configure(bg=bg_color)
        self.status_label.configure(bg=bg_color, fg=status_color)


class CameraGUIViewer:
    """GUI để quản lý hiển thị camera"""
    
    def __init__(self, db_path: str = "queues.db", config_path: str = "visualizer_config.json"):
        """
        Args:
            db_path: Đường dẫn database
            config_path: Đường dẫn config
        """
        self.db_path = db_path
        self.running = False
        
        # Load config
        self.config = self._load_config(config_path)
        
        # Queue
        self.queue = SQLiteQueue(db_path)
        
        # Visualizer
        self.visualizer = ROIVisualizer()
        
        # Camera URLs
        self.cam_urls: Dict[str, str] = {}
        self._load_cam_config(os.path.join("logic", "cam_config.json"))
        
        # Active cameras (đang hiển thị)
        self.active_cameras: Set[str] = set()
        
        # Display threads
        self.display_threads: Dict[str, CameraDisplayThread] = {}
        
        # Local dict để share data
        self.local_dict: Dict[str, Any] = {}
        
        # QR mapping
        self.qr_to_slot: Dict[int, tuple] = {}
        self._load_qr_mapping()
        
        # Blocked ROIs
        self.blocked_rois: Dict[str, Dict[int, Any]] = {}
        
        # ROI cache
        self.roi_cache: Dict[str, List[Dict[str, Any]]] = {}
        
        # Latest detections
        self.latest_roi_detections: Dict[str, Dict[str, Any]] = {}
        
        # GUI
        self.root: Optional[tk.Tk] = None
        self.camera_icons: Dict[str, CameraIcon] = {}
        
        # Lock
        self.lock = threading.Lock()
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load config"""
        default_config = {
            'max_workers': 4,
            'buffer_size': 1,
            'target_fps': 5,
            'max_display_resolution': 1280,
            'roi_cache_ttl': 30.0,
            'reconnect_delay': 5.0,
            'max_retry_attempts': 5
        }
        
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    default_config.update(config)
                print(f"[CONFIG] Đã load từ {config_path}")
        except Exception as e:
            print(f"[CONFIG] Sử dụng mặc định: {e}")
        
        return default_config
    
    def _load_cam_config(self, cam_config_path: str):
        """Load camera URLs"""
        try:
            if os.path.exists(cam_config_path):
                with open(cam_config_path, 'r') as f:
                    cfg = json.load(f)
                for item in cfg.get("cam_urls", []):
                    if isinstance(item, list) and len(item) >= 2:
                        self.cam_urls[str(item[0])] = str(item[1])
                print(f"[RTSP] Loaded {len(self.cam_urls)} camera URLs")
        except Exception as e:
            print(f"[RTSP] Error: {e}")
    
    def _load_qr_mapping(self):
        """Load QR mapping"""
        try:
            pairing_config_path = os.path.join("logic", "slot_pairing_config.json")
            if not os.path.exists(pairing_config_path):
                return
            
            with open(pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            
            for item in cfg.get("starts", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    self.qr_to_slot[qr_code] = (camera_id, slot_number)
                except Exception:
                    continue
            
            for item in cfg.get("starts_2", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    self.qr_to_slot[qr_code] = (camera_id, slot_number)
                except Exception:
                    continue
            
            for item in cfg.get("ends", []):
                try:
                    qr_code = int(item["qr_code"])
                    camera_id = str(item["camera_id"])
                    slot_number = int(item["slot_number"])
                    self.qr_to_slot[qr_code] = (camera_id, slot_number)
                except Exception:
                    continue
            
            print(f"[QR] Đã load {len(self.qr_to_slot)} QR mappings")
            
        except Exception as e:
            print(f"[QR] Lỗi: {e}")
    
    def _load_roi_config_from_file(self):
        """Load ROI config"""
        pairing_config_path = os.path.join("logic", "slot_pairing_config.json")
        if not os.path.exists(pairing_config_path):
            return
        
        try:
            with open(pairing_config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            
            roi_entries = cfg.get("roi_coordinates", [])
            if not isinstance(roi_entries, list):
                return
            
            from collections import defaultdict
            camera_slots: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
            
            for entry in roi_entries:
                camera_id = entry.get("camera_id")
                points = entry.get("points")
                slot_number = entry.get("slot_number")
                
                if not camera_id or points is None:
                    continue
                
                slot_data: Dict[str, Any] = {"points": points}
                try:
                    slot_num_int = int(slot_number)
                    slot_data["slot_number"] = slot_num_int
                except (TypeError, ValueError):
                    slot_data["slot_number"] = None
                
                camera_slots[str(camera_id)].append(slot_data)
            
            new_cache: Dict[str, List[Dict[str, Any]]] = {}
            for camera_id, slots in camera_slots.items():
                sorted_slots = sorted(
                    slots,
                    key=lambda s: s.get("slot_number") if s.get("slot_number") is not None else float("inf")
                )
                normalized_slots = [
                    {"points": slot["points"], "slot_number": slot.get("slot_number")}
                    for slot in sorted_slots
                ]
                new_cache[camera_id] = normalized_slots
            
            self.roi_cache = new_cache
            print(f"[ROI] Đã load ROI cho {len(self.roi_cache)} camera")
            
        except Exception as e:
            print(f"[ROI] Lỗi: {e}")
    
    def _subscribe_roi_detections(self):
        """Subscribe ROI detections"""
        print("[DETECTIONS] Bắt đầu subscribe...")
        
        try:
            with self.queue._connect() as conn:
                cur = conn.execute(
                    "SELECT DISTINCT key FROM messages WHERE topic = 'roi_detection' ORDER BY key"
                )
                camera_ids = [row[0] for row in cur.fetchall()]
        except Exception as e:
            print(f"[DETECTIONS] Lỗi: {e}")
            return
        
        last_detection_ids = {}
        for camera_id in camera_ids:
            detection_data = self.queue.get_latest_row("roi_detection", camera_id)
            if detection_data:
                last_detection_ids[camera_id] = detection_data["id"]
            else:
                last_detection_ids[camera_id] = 0
        
        print(f"[DETECTIONS] Đang monitor {len(camera_ids)} cameras")
        
        while self.running:
            try:
                for camera_id in camera_ids:
                    new_detections = self.queue.get_after_id(
                        "roi_detection",
                        camera_id,
                        last_detection_ids.get(camera_id, 0),
                        limit=10
                    )
                    
                    for detection_row in new_detections:
                        payload = detection_row["payload"]
                        last_detection_ids[camera_id] = detection_row["id"]
                        
                        self._add_bbox_to_detections(payload, camera_id)
                        self.latest_roi_detections[camera_id] = payload
                
                time.sleep(0.1)
                
            except Exception as e:
                print(f"[DETECTIONS] Lỗi: {e}")
                time.sleep(1.0)
    
    def _add_bbox_to_detections(self, payload: Dict[str, Any], camera_id: str):
        """Thêm bbox cho detections"""
        roi_slots = self.roi_cache.get(camera_id, [])
        if not roi_slots:
            return
        
        detections = payload.get("roi_detections", [])
        for detection in detections:
            slot_number = detection.get("slot_number", 0)
            if slot_number > 0 and slot_number <= len(roi_slots):
                slot = roi_slots[slot_number - 1]
                points = slot["points"]
                
                detection["bbox"] = {
                    "x1": min(point[0] for point in points),
                    "y1": min(point[1] for point in points),
                    "x2": max(point[0] for point in points),
                    "y2": max(point[1] for point in points)
                }
                
                detection["center"] = {
                    "x": sum(point[0] for point in points) / len(points),
                    "y": sum(point[1] for point in points) / len(points)
                }
    
    def _subscribe_all_blocking(self):
        """
        Subscribe blocking topics
        
        LƯU Ý: camera_gui_viewer là standalone app, không có reference đến roi_processor
        nên vẫn cần subscribe blocking topics để nhận thông tin block/unblock.
        
        Nếu chạy cùng với roi_processor (như trong main app), nên dùng GIẢI PHÁP 3
        (sync trực tiếp từ roi_processor.blocked_slots thay vì subscribe)
        """
        print("[BLOCKING] Bắt đầu subscribe...")
        
        last_ids = {
            "dual_block": 0,
            "dual_unblock": 0,
            "block_slot": 0,
            "unblock_slot": 0,
            "unlock_start_slot": 0
        }
        
        try:
            with self.queue._connect() as conn:
                for topic in last_ids.keys():
                    cur = conn.execute(
                        "SELECT id FROM messages WHERE topic = ? ORDER BY id DESC LIMIT 1",
                        (topic,),
                    )
                    row = cur.fetchone()
                    if row:
                        last_ids[topic] = row[0]
        except Exception as e:
            print(f"[BLOCKING] Lỗi: {e}")
        
        while self.running:
            try:
                # dual_block
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("dual_block", last_ids["dual_block"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["dual_block"] = msg_id
                    self._handle_block(payload, "dual")
                
                # dual_unblock
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("dual_unblock", last_ids["dual_unblock"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["dual_unblock"] = msg_id
                    self._handle_unblock(payload, "dual")
                
                # block_slot
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("block_slot", last_ids["block_slot"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["block_slot"] = msg_id
                    self._handle_block(payload, "manual")
                
                # unblock_slot
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("unblock_slot", last_ids["unblock_slot"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["unblock_slot"] = msg_id
                    self._handle_unblock(payload, "manual")
                
                # unlock_start_slot
                with self.queue._connect() as conn:
                    cur = conn.execute(
                        "SELECT id, payload FROM messages WHERE topic = ? AND id > ? ORDER BY id ASC LIMIT 50",
                        ("unlock_start_slot", last_ids["unlock_start_slot"]),
                    )
                    rows = cur.fetchall()
                
                for r in rows:
                    msg_id = r[0]
                    payload = json.loads(r[1]) if isinstance(r[1], str) else r[1]
                    last_ids["unlock_start_slot"] = msg_id
                    self._handle_unblock(payload, "unlock_start")
                
                time.sleep(0.2)
                
            except Exception as e:
                print(f"[BLOCKING] Lỗi: {e}")
                time.sleep(1.0)
    
    def _handle_block(self, payload: Dict[str, Any], block_type: str):
        """Xử lý block"""
        try:
            if block_type == "dual":
                qr_code = int(payload.get("start_qr", 0))
            else:
                qr_code = int(payload.get("qr_code", 0))
            
            cam_slot = self.qr_to_slot.get(qr_code)
            if not cam_slot:
                return
            
            camera_id, slot_number = cam_slot
            
            if camera_id not in self.blocked_rois:
                self.blocked_rois[camera_id] = {}
            
            self.blocked_rois[camera_id][slot_number] = {
                "type": block_type,
                "blocked_at": time.time()
            }
            
        except Exception as e:
            print(f"[BLOCKING] Lỗi block: {e}")
    
    def _handle_unblock(self, payload: Dict[str, Any], unblock_type: str):
        """Xử lý unblock"""
        try:
            if unblock_type == "dual":
                qr_code = int(payload.get("start_qr", 0))
            elif unblock_type == "unlock_start":
                qr_code = int(payload.get("start_slot", 0))
            else:
                qr_code = int(payload.get("qr_code", 0))
            
            cam_slot = self.qr_to_slot.get(qr_code)
            if not cam_slot:
                return
            
            camera_id, slot_number = cam_slot
            
            if camera_id in self.blocked_rois:
                if slot_number in self.blocked_rois[camera_id]:
                    del self.blocked_rois[camera_id][slot_number]
            
        except Exception as e:
            print(f"[BLOCKING] Lỗi unblock: {e}")
    
    def _update_local_dict(self):
        """Update local dict"""
        try:
            for camera_id, roi_slots in self.roi_cache.items():
                self.local_dict[f'{camera_id}_roi'] = roi_slots
            
            for camera_id, roi_det_data in self.latest_roi_detections.items():
                self.local_dict[f'{camera_id}_detections'] = roi_det_data
            
            for camera_id, blocked_slots in self.blocked_rois.items():
                self.local_dict[f'{camera_id}_blocked'] = blocked_slots
        
        except Exception as e:
            print(f"[UPDATE] Lỗi: {e}")
    
    def _on_camera_toggle(self, camera_id: str, is_active: bool):
        """Callback khi toggle camera"""
        with self.lock:
            if is_active:
                self._start_camera_display(camera_id)
            else:
                self._stop_camera_display(camera_id)
    
    def _start_camera_display(self, camera_id: str):
        """Bật hiển thị camera"""
        if camera_id in self.active_cameras:
            return
        
        if camera_id not in self.cam_urls:
            print(f"[GUI] Camera {camera_id} không có URL")
            return
        
        rtsp_url = self.cam_urls[camera_id]
        target_fps = self.config.get('target_fps', 5)
        max_retry = self.config.get('max_retry_attempts', 5)
        
        thread = CameraDisplayThread(
            camera_id=camera_id,
            rtsp_url=rtsp_url,
            local_dict=self.local_dict,
            config=self.config,
            visualizer=self.visualizer,
            max_retry_attempts=max_retry,
            target_fps=target_fps
        )
        
        self.display_threads[camera_id] = thread
        thread.start()
        self.active_cameras.add(camera_id)
        
        print(f"[GUI] Đã bật camera {camera_id}")
    
    def _stop_camera_display(self, camera_id: str):
        """Tắt hiển thị camera"""
        if camera_id not in self.active_cameras:
            return
        
        if camera_id in self.display_threads:
            thread = self.display_threads[camera_id]
            thread.stop()
            thread.join(timeout=1.0)
            del self.display_threads[camera_id]
        
        self.active_cameras.discard(camera_id)
        
        print(f"[GUI] Đã tắt camera {camera_id}")
    
    def _create_gui(self):
        """Tạo giao diện"""
        self.root = tk.Tk()
        self.root.title("Camera Viewer Control Panel")
        self.root.geometry("900x700")
        self.root.configure(bg="#ecf0f1")
        
        # Header
        header = tk.Frame(self.root, bg="#34495e", height=60)
        header.pack(fill=tk.X)
        header.pack_propagate(False)
        
        title_label = tk.Label(
            header,
            text="CAMERA VIEWER CONTROL PANEL",
            font=("Arial", 16, "bold"),
            fg="white",
            bg="#34495e"
        )
        title_label.pack(pady=15)
        
        # Control buttons
        control_frame = tk.Frame(self.root, bg="#ecf0f1")
        control_frame.pack(pady=10)
        
        btn_all_on = tk.Button(
            control_frame,
            text="BẬT TẤT CẢ",
            command=self._turn_all_on,
            font=("Arial", 10, "bold"),
            bg="#27ae60",
            fg="white",
            width=15,
            height=2
        )
        btn_all_on.pack(side=tk.LEFT, padx=5)
        
        btn_all_off = tk.Button(
            control_frame,
            text="TẮT TẤT CẢ",
            command=self._turn_all_off,
            font=("Arial", 10, "bold"),
            bg="#e74c3c",
            fg="white",
            width=15,
            height=2
        )
        btn_all_off.pack(side=tk.LEFT, padx=5)
        
        # Status
        self.status_label = tk.Label(
            self.root,
            text="Active: 0 / 0",
            font=("Arial", 10),
            bg="#ecf0f1"
        )
        self.status_label.pack(pady=5)
        
        # Camera grid (scrollable)
        canvas_frame = tk.Frame(self.root, bg="#ecf0f1")
        canvas_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(canvas_frame, bg="#ecf0f1", highlightthickness=0)
        scrollbar = tk.Scrollbar(canvas_frame, orient=tk.VERTICAL, command=canvas.yview)
        
        scrollable_frame = tk.Frame(canvas, bg="#ecf0f1")
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Tạo grid camera icons
        camera_list = sorted(self.cam_urls.keys())
        cols = 7  # 7 cột
        
        for idx, camera_id in enumerate(camera_list):
            row = idx // cols
            col = idx % cols
            
            icon = CameraIcon(
                scrollable_frame,
                camera_id,
                self._on_camera_toggle
            )
            icon.grid(row=row, column=col, padx=5, pady=5)
            self.camera_icons[camera_id] = icon
        
        # Update status periodically
        self._update_gui_status()
    
    def _turn_all_on(self):
        """Bật tất cả camera"""
        for camera_id, icon in self.camera_icons.items():
            if not icon.is_active:
                icon.set_active(True)
                self._on_camera_toggle(camera_id, True)
    
    def _turn_all_off(self):
        """Tắt tất cả camera"""
        for camera_id, icon in self.camera_icons.items():
            if icon.is_active:
                icon.set_active(False)
                self._on_camera_toggle(camera_id, False)
    
    def _update_gui_status(self):
        """Update status label"""
        if self.root and self.running:
            active_count = len(self.active_cameras)
            total_count = len(self.cam_urls)
            self.status_label.config(text=f"Active: {active_count} / {total_count}")
            self.root.after(500, self._update_gui_status)
    
    def _background_worker(self):
        """Worker thread để update local_dict và monitor threads"""
        while self.running:
            try:
                self._update_local_dict()
                
                # Check thread health
                with self.lock:
                    for cam_id in list(self.active_cameras):
                        if cam_id in self.display_threads:
                            thread = self.display_threads[cam_id]
                            if not thread.is_alive():
                                # Restart
                                print(f"[GUI] Restart thread {cam_id}")
                                self._stop_camera_display(cam_id)
                                self._start_camera_display(cam_id)
                
                time.sleep(0.1)
            
            except Exception as e:
                print(f"[WORKER] Lỗi: {e}")
                time.sleep(1.0)
    
    def run(self):
        """Chạy GUI"""
        self.running = True
        
        # Load ROI
        self._load_roi_config_from_file()
        
        # Start background threads
        detection_thread = threading.Thread(target=self._subscribe_roi_detections, daemon=True)
        blocking_thread = threading.Thread(target=self._subscribe_all_blocking, daemon=True)
        worker_thread = threading.Thread(target=self._background_worker, daemon=True)
        
        detection_thread.start()
        blocking_thread.start()
        worker_thread.start()
        
        print("\n" + "="*60)
        print("Camera GUI Viewer đang chạy")
        print(f"Tổng số camera: {len(self.cam_urls)}")
        print("="*60 + "\n")
        
        # Create and run GUI
        self._create_gui()
        
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            print("\nĐang dừng...")
        finally:
            self.stop()
    
    def stop(self):
        """Dừng viewer"""
        self.running = False
        
        # Stop all display threads
        with self.lock:
            for camera_id in list(self.active_cameras):
                self._stop_camera_display(camera_id)
        
        cv2.destroyAllWindows()
        
        if self.root:
            try:
                self.root.quit()
                self.root.destroy()
            except:
                pass
        
        print("GUI Viewer đã dừng")


def main():
    """Main function"""
    try:
        viewer = CameraGUIViewer(
            db_path="queues.db",
            config_path="visualizer_config.json"
        )
        viewer.run()
    except Exception as e:
        print(f"Lỗi: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

