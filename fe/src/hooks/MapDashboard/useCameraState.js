// fe/src/hooks/MapDashboard/useCameraState.js
import { useState, useEffect } from 'react';

const normalizeCameraState = (raw) => {
  const result = {};
  Object.entries(raw || {}).forEach(([key, val]) => {
    // key dạng "camera:Camera066" hoặc "camera:cam299"
    const match = key.match(/^camera:cam(?:era)?(\d{2,3})$/i);
    if (!match) return;
    const idx = parseInt(match[1], 10); // 66, 299, ...
    const online = val?.status ?? val?.staus ?? false; // fallback nếu backend còn typo "staus"
    result[idx] = {
      online: Boolean(online),
      last_seen: val?.last_seen,
      raw: val,
    };
  });
  return result;
};

export function useCameraState() {
  const [cameraState, setCameraState] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let eventSource = null;
    
    try {
      setLoading(true);
      setError(null);
      
      // Tạo SSE connection
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const sseUrl = `${baseURL}/camera-event`;
      eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        console.log('SSE connection opened');
        setLoading(false);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'initial') {
            // Nhận initial snapshot
            const normalized = normalizeCameraState(data.data);
            setCameraState(normalized);
            setLoading(false);
          } else if (data.type === 'update') {
            // Nhận update từng camera
            const cameraId = data.camera_id;
            const match = cameraId.match(/^Camera(\d{2,3})$/i);
            if (match) {
              const idx = parseInt(match[1], 10);
              setCameraState(prev => ({
                ...prev,
                [idx]: {
                  online: Boolean(data.status),
                  last_seen: data.last_seen,
                  raw: { status: data.status, last_seen: data.last_seen }
                }
              }));
            }
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        setError('Lỗi kết nối SSE');
        setLoading(false);
        // Tự động reconnect sau 3 giây
        if (eventSource) {
          eventSource.close();
        }
        setTimeout(() => {
          // Reconnect sẽ được trigger bởi useEffect cleanup và re-run
        }, 3000);
      };
      
    } catch (err) {
      console.error('Error setting up SSE:', err);
      setError(err.message || 'Lỗi khi khởi tạo SSE');
      setLoading(false);
    }
    
    // Cleanup khi component unmount
    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('SSE connection closed');
      }
    };
  }, []); // Chỉ chạy một lần khi mount

  return { cameraState, loading, error };
}