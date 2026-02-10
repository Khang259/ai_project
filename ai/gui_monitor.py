# File: gui_monitor.py
import tkinter as tk
from tkinter import ttk

class GUIMonitor:
    def __init__(self, state_manager, validate_pairs):
        """
        Khởi tạo GUI Monitor
        
        Args:
            state_manager: Instance của StateManager để đọc trạng thái
            validate_pairs: List các cặp (start_point, end_point)
        """
        self.state_manager = state_manager
        self.validate_pairs = validate_pairs
        
        # Tạo main window
        self.window = tk.Tk()
        self.window.title("VALIDATE_PAIRS Monitor")
        self.window.geometry("900x600")
        
        # Tạo frame chính với scrollbar
        main_frame = tk.Frame(self.window)
        main_frame.pack(fill=tk.BOTH, expand=1)
        
        # Tạo canvas và scrollbar
        canvas = tk.Canvas(main_frame)
        scrollbar = ttk.Scrollbar(main_frame, orient=tk.VERTICAL, command=canvas.yview)
        scrollable_frame = tk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=1)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Container cho labels
        self.labels = []
        
        # Tạo header
        headers = ["Start Point", "State", "Flag", "End Point", "State", "Flag"]
        for col, header in enumerate(headers):
            label = tk.Label(
                scrollable_frame,
                text=header,
                font=("Arial", 11, "bold"),
                borderwidth=2,
                relief="solid",
                padx=10,
                pady=5,
                bg="#2c3e50",
                fg="white"
            )
            label.grid(row=0, column=col, sticky="nsew", padx=1, pady=1)
        
        # Tạo rows cho mỗi pair
        for idx, (start_point, end_point) in enumerate(self.validate_pairs, start=1):
            row_labels = {}
            
            # Start point name
            label = tk.Label(
                scrollable_frame,
                text=start_point,
                font=("Arial", 9),
                borderwidth=1,
                relief="solid",
                padx=10,
                pady=5,
                bg="white"
            )
            label.grid(row=idx, column=0, sticky="nsew", padx=1, pady=1)
            
            # Start state
            label = tk.Label(
                scrollable_frame,
                text="False",
                font=("Arial", 9),
                borderwidth=1,
                relief="solid",
                padx=10,
                pady=5
            )
            label.grid(row=idx, column=1, sticky="nsew", padx=1, pady=1)
            row_labels["start_state"] = label
            
            # Start flag
            label = tk.Label(
                scrollable_frame,
                text="False",
                font=("Arial", 9),
                borderwidth=1,
                relief="solid",
                padx=10,
                pady=5
            )
            label.grid(row=idx, column=2, sticky="nsew", padx=1, pady=1)
            row_labels["start_flag"] = label
            
            # End point name
            label = tk.Label(
                scrollable_frame,
                text=end_point,
                font=("Arial", 9),
                borderwidth=1,
                relief="solid",
                padx=10,
                pady=5,
                bg="white"
            )
            label.grid(row=idx, column=3, sticky="nsew", padx=1, pady=1)
            
            # End state
            label = tk.Label(
                scrollable_frame,
                text="False",
                font=("Arial", 9),
                borderwidth=1,
                relief="solid",
                padx=10,
                pady=5
            )
            label.grid(row=idx, column=4, sticky="nsew", padx=1, pady=1)
            row_labels["end_state"] = label
            
            # End flag
            label = tk.Label(
                scrollable_frame,
                text="False",
                font=("Arial", 9),
                borderwidth=1,
                relief="solid",
                padx=10,
                pady=5
            )
            label.grid(row=idx, column=5, sticky="nsew", padx=1, pady=1)
            row_labels["end_flag"] = label
            
            # Lưu labels và node_ids
            self.labels.append({
                "start_point": start_point,
                "end_point": end_point,
                "labels": row_labels
            })
        
        # Cấu hình grid weights để responsive
        for col in range(6):
            scrollable_frame.grid_columnconfigure(col, weight=1)
    
    def update_display(self):
        """
        Cập nhật hiển thị trạng thái của các points
        Được gọi mỗi 1 giây
        """
        for row in self.labels:
            start_point = row["start_point"]
            end_point = row["end_point"]
            labels = row["labels"]
            
            # Lấy state và flag của start point
            start_data = self.state_manager.points[start_point]
            start_state = start_data["state"]
            start_flag = start_data["flag"]
            
            # Cập nhật start state
            labels["start_state"].config(
                text=str(start_state),
                bg="#00ff00" if start_state else "#ff0000"
            )
            
            # Cập nhật start flag
            labels["start_flag"].config(
                text=str(start_flag),
                bg="#ffff00" if start_flag else "#808080"
            )
            
            # Lấy state và flag của end point
            end_data = self.state_manager.points[end_point]
            end_state = end_data["state"]
            end_flag = end_data["flag"]
            
            # Cập nhật end state
            labels["end_state"].config(
                text=str(end_state),
                bg="#00ff00" if end_state else "#ff0000"
            )
            
            # Cập nhật end flag
            labels["end_flag"].config(
                text=str(end_flag),
                bg="#ffff00" if end_flag else "#808080"
            )
        
        # Lên lịch cập nhật lần tiếp theo sau 1 giây
        self.window.after(1000, self.update_display)
    
    def run(self):
        """
        Khởi động GUI và bắt đầu vòng lặp cập nhật
        """
        # Bắt đầu vòng lặp cập nhật
        self.update_display()
        
        # Chạy main loop
        self.window.mainloop()
