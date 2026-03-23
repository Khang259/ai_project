import React, { useState, useEffect, useRef } from 'react';
import { getDetectedStreamUrl } from '@/services/infocamera-dashboard';

const JPEG_SOI = [0xff, 0xd8];
const JPEG_EOI = [0xff, 0xd9];

function findJpegInBuffer(buffer) {
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === JPEG_SOI[0] && buffer[i + 1] === JPEG_SOI[1]) {
      for (let j = i + 2; j < buffer.length - 1; j++) {
        if (buffer[j] === JPEG_EOI[0] && buffer[j + 1] === JPEG_EOI[1]) {
          return { start: i, end: j + 2 };
        }
      }
      return null;
    }
  }
  return null;
}

const FETCH_DELAY_MS = 200;

const CameraViewer = ({ cameraData, onClose }) => {
  const [currentFrameUrl, setCurrentFrameUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStartedRef = useRef(false);
  const lastUrlRef = useRef(null);

  const cameraName = cameraData?.cameraName || cameraData?.camera_name;

  useEffect(() => {
    if (!cameraName) {
      setError('Không có tên camera');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentFrameUrl(null);
    fetchStartedRef.current = false;

    let cancelled = false;
    const controller = new AbortController();
    const url = getDetectedStreamUrl(cameraName);

    const startFetch = () => {
      if (cancelled) return;
      fetchStartedRef.current = true;

      fetch(url, { signal: controller.signal, credentials: 'omit' })
        .then((res) => {
          if (!res.ok || !res.body) throw new Error('Stream failed');
          return res.body.getReader();
        })
        .then((reader) => {
          let buffer = new Uint8Array(0);
          const read = () => {
            if (cancelled) return;
            return reader.read().then(({ done, value }) => {
              if (cancelled || done) return;
              const newBuf = new Uint8Array(buffer.length + value.length);
              newBuf.set(buffer);
              newBuf.set(value, buffer.length);
              buffer = newBuf;
              const found = findJpegInBuffer(buffer);
              if (found) {
                const jpeg = buffer.slice(found.start, found.end);
                buffer = buffer.slice(found.end);
                const blob = new Blob([jpeg], { type: 'image/jpeg' });
                const blobUrl = URL.createObjectURL(blob);
                if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
                lastUrlRef.current = blobUrl;
                setCurrentFrameUrl(blobUrl);
                setLoading(false);
              }
              return read();
            });
          };
          return read();
        })
        .catch((err) => {
          if (err.name !== 'AbortError' && !cancelled) {
            setError('Không thể tải video stream');
          }
          setLoading(false);
        });
    };

    const timeoutId = setTimeout(startFetch, FETCH_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (fetchStartedRef.current) {
        controller.abort();
      }
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = null;
      }
    };
  }, [cameraName]);

  if (!cameraData) return null;

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.85)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          textAlign: 'center',
          maxWidth: '95vw',
          width: '100%',
          maxHeight: '95vh',
          overflow: 'auto',
        }}
      >
        {loading && <div>Đang tải camera...</div>}
        {error && <div style={{ color: 'red', marginBottom: 16 }}>Lỗi: {error}</div>}
        {currentFrameUrl ? (
          <>
            <div style={{ marginBottom: 12, fontWeight: 'bold', fontSize: '1.1rem' }}>
              {cameraData.cameraName || 'Camera Stream'}
            </div>
            <img
              src={currentFrameUrl}
              alt="Camera stream"
              style={{
                width: '100%',
                maxWidth: 1280,
                height: 'auto',
                maxHeight: 'calc(95vh - 140px)',
                objectFit: 'contain',
                border: '2px solid #333',
                borderRadius: 6,
              }}
            />
            <div style={{ marginTop: 10, fontSize: 11, color: '#666', wordBreak: 'break-all' }}>
              RTSP: {cameraData.cameraPath}
            </div>
          </>
        ) : !error && (
          <div style={{ color: 'orange', marginBottom: 16 }}>Đang kết nối stream...</div>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={handleClose}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraViewer;
