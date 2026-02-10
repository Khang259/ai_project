import subprocess
import numpy as np
import cv2
import threading

class BoundingBoxDrawerFFmpeg:
    def __init__(self, rtsp_url, width, height, frame_size, window_name):
        self.rtsp_url = rtsp_url
        self.width = width
        self.height = height
        self.frame_size = frame_size
        self.window_name = window_name
        self.drawing = False
        self.ix, self.iy = -1, -1
        self.start_point = None
        self.end_point = None
        self.boxes = []

    def draw_rectangle(self, event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            self.drawing = True
            self.ix, self.iy = x, y
            self.start_point = (x, y)

        elif event == cv2.EVENT_MOUSEMOVE:
            if self.drawing:
                self.end_point = (x, y)

        elif event == cv2.EVENT_LBUTTONUP:
            self.drawing = False
            self.end_point = (x, y)
            self.boxes.append((self.ix, self.iy, x, y))
            print(f"[{self.window_name}] Bounding Box: Start({self.ix}, {self.iy}), End({x}, {y})")
            print(f"[{self.window_name}] Width: {abs(x - self.ix)}, Height: {abs(y - self.iy)}")

    def run(self):
        command = [
            'ffmpeg',
            '-rtsp_transport', 'tcp',
            '-i', self.rtsp_url,
            '-loglevel', 'quiet',
            '-an',
            '-f', 'image2pipe',
            '-pix_fmt', 'bgr24',
            '-vcodec', 'rawvideo',
            '-'
        ]

        pipe = subprocess.Popen(command, stdout=subprocess.PIPE, bufsize=10**8)
        cv2.namedWindow(self.window_name)
        cv2.setMouseCallback(self.window_name, self.draw_rectangle)

        while True:
            raw_frame = pipe.stdout.read(self.frame_size)
            if len(raw_frame) != self.frame_size:
                print(f"[{self.window_name}] ⚠️ Không đủ dữ liệu frame. Có thể mất kết nối.")
                break

            frame = np.frombuffer(raw_frame, dtype=np.uint8).reshape((self.height, self.width, 3))
            img = frame.copy()

            for box in self.boxes:
                cv2.rectangle(img, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)

            if self.drawing and self.start_point and self.end_point:
                cv2.rectangle(img, self.start_point, self.end_point, (0, 0, 255), 2)

            cv2.imshow(self.window_name, img)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        pipe.terminate()
        cv2.destroyWindow(self.window_name)

def main():
    rtsp_urls = [
        #"rtsp://admin:Thado12@@192.168.1.130:554/Streaming/Channels/102",
        "rtsp://admin:Thado12@@192.168.1.140:554/Streaming/Channels/102"
    ]

    width, height = 640, 480  # Cập nhật theo độ phân giải camera thật
    frame_size = width * height * 3  # Tính frame_size

    threads = []
    for i, url in enumerate(rtsp_urls):
        window_name = f"Camera {i+1}"
        drawer = BoundingBoxDrawerFFmpeg(url, width, height, frame_size, window_name)
        t = threading.Thread(target=drawer.run)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

if __name__ == "__main__":
    main()