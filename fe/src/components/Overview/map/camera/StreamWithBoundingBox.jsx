import React, { useRef, useState, useEffect } from 'react';

const StreamWithBoundingBox = ({ streamUrl, initialBBoxes = [], onBBoxesChange, cameraName }) => {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const [bBoxes, setBBoxes] = useState(initialBBoxes);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    setBBoxes(initialBBoxes);
  }, [initialBBoxes]);

  useEffect(() => {
    onBBoxesChange?.(bBoxes);
  }, [bBoxes, onBBoxesChange]);

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

    // Vẽ các bbox hiện có
    bBoxes.forEach((bbox, i) => {
      const [x, y, w, h] = bbox.split(',').map(Number);
      const sx = x * scaleX, sy = y * scaleY, sw = w * scaleX, sh = h * scaleY;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Zone ${i + 1}`, sx + 6, sy + 22);
    });

    // Vẽ bbox đang kéo
    if (isDrawing && startPos) {
      const rect = canvas.getBoundingClientRect();
      const endX = rect.left + rect.width;
      const endY = rect.top + rect.height;

      const x = Math.min(startPos.x, endX) - rect.left;
      const y = Math.min(startPos.y, endY) - rect.top;
      const w = Math.abs(endX - startPos.x);
      const h = Math.abs(endY - startPos.y);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
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
    if (!isDrawing) return;
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

    const x = Math.min(startPos.x, endX) * scaleX;
    const y = Math.min(startPos.y, endY) * scaleY;
    const w = Math.abs(endX - startPos.x) * scaleX;
    const h = Math.abs(endY - startPos.y) * scaleY;

    const newBBox = `${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}`;
    setBBoxes(prev => [...prev, newBBox]);
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
    if (img) img.onload = draw;
  }, [streamUrl]);

  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (imgRef.current) ro.observe(imgRef.current);
    return () => ro.disconnect();
  }, [bBoxes, isDrawing, startPos]);

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