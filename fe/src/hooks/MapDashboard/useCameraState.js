// fe/src/hooks/MapDashboard/useCameraState.js
import { getCamerasStatus } from '@/services/camera-settings';
import { useState, useCallback, useEffect } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCameraState = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await getCamerasStatus();
      setCameraState(normalizeCameraState(raw));
      setError(null);
    } catch (err) {
      console.error('Error fetching camera state:', err);
      setError(err.message || 'Lỗi khi lấy trạng thái camera');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameraState();
  }, [fetchCameraState]);

  return { cameraState, loading, error };
}