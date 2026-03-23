import { getStreamCamera } from '@/services/infocamera-dashboard';
import { useRef, useState, useEffect } from "react";

export default function RTSPBBoxDrawer() {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState(null);
  const [bboxes, setBboxes] = useState([]);

  // Cập nhật canvas size theo ảnh
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (img && canvas) {
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
    }
  }, []);

  const handleMouseDown = (e) => {
    setStart({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    setDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { offsetX, offsetY } = e.nativeEvent;
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.strokeRect(start.x, start.y, offsetX - start.x, offsetY - start.y);
  };

  const handleMouseUp = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    const newBox = { x1: start.x, y1: start.y, x2: offsetX, y2: offsetY };
    setBboxes([...bboxes, newBox]);
    setDrawing(false);
  };

  const handleSave = async () => {
    await fetch("http://localhost:8000/save_bbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bboxes),
    });
    alert("Đã lưu bbox!");
  };

  return (
    <div className="relative inline-block">
      <img
        ref={imgRef}
        src="http://localhost:8000/video_feed"
        alt="RTSP Stream"
        className="rounded"
      />
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="absolute top-0 left-0"
      />
      <button
        onClick={handleSave}
        className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
      >
        Lưu BBox
      </button>
    </div>
  );
}
