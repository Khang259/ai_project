import React, { useRef, useState, useEffect } from 'react';

const StreamWithBoundingBox = ({ streamUrl, initialROIs = [], onROIsChange, cameraName }) => {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [ROIs, setROIs] = useState(initialROIs);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    setROIs(initialROIs);
  }, [initialROIs]);

  useEffect(() => {
    onROIsChange?.(ROIs);
  }, [ROIs, onROIsChange]);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;

    const ctx = canvas.getContext('2d');
    const { clientWidth, clientHeight, naturalWidth, naturalHeight } = img;

    canvas.width = clientWidth;
    canvas.height = clientHeight;

    const scaleX = clientWidth / naturalWidth;
    const scaleY = clientHeight / naturalHeight;

    ctx.clearRect(0, 0, clientWidth, clientHeight);

    // Vẽ các ROI hiện có
    ROIs.forEach((roi, i) => {
      const { x, y, width, height } = roi;
      const sx = x * scaleX, sy = y * scaleY, sw = width * scaleX, sh = height * scaleY;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`ROI ${i + 1}`, sx + 6, sy + 22);
    });

    // Vẽ ROI đang kéo
    if (isDrawing && startPos) {
      const rect = canvas.getBoundingClientRect();
      const currentX = startPos.currentX || startPos.x;
      const currentY = startPos.currentY || startPos.y;

      const x = Math.min(startPos.x, currentX);
      const y = Math.min(startPos.y, currentY);
      const width = Math.abs(currentX - startPos.x);
      const height = Math.abs(currentY - startPos.y);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos) return;

    const rect = canvasRef.current.getBoundingClientRect();
    startPos.currentX = e.clientX - rect.left;
    startPos.currentY = e.clientY - rect.top;

    draw();
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !startPos) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const x1 = Math.min(startPos.x, endX);
    const y1 = Math.min(startPos.y, endY);
    const x2 = Math.max(startPos.x, endX);
    const y2 = Math.max(startPos.y, endY);

    const x = Math.round(x1 * scaleX);
    const y = Math.round(y1 * scaleY);
    const width = Math.round((x2 - x1) * scaleX);
    const height = Math.round((y2 - y1) * scaleY);
    const label = `ROI ${ROIs.length + 1}`;

    const newROI = { x, y, width, height, label};
    setROIs(prev => [...prev, newROI]);
    setIsDrawing(false);
    setStartPos(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDrawing, startPos]);

  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      img.onload = draw;
      if (img.complete) draw();
    }
  }, [streamUrl, ROIs]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      draw();
    });
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [ROIs, isDrawing, startPos]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setROIs(prev => prev.slice(0, -1)); // Xóa vùng cuối
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative inline-block">
      <img
        ref={imgRef}
        src={streamUrl}
        alt={cameraName}
        className="max-w-full h-auto rounded border-2 border-gray-300"
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 cursor-crosshair"
        style={{ background: 'transparent' }}
      />
      <div className="mt-2 text-xs text-gray-600 text-center">
        Kéo chuột để vẽ vùng mới
      </div>
    </div>
  );
};

export default StreamWithBoundingBox;