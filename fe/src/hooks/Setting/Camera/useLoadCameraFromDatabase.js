import { useState, useEffect, useCallback } from 'react';
import { getCamerasByArea } from '@/services/camera-settings';

/**
 * Custom hook để load cameras từ database theo area
 * @param {number} areaId - ID của area cần load cameras
 * @param {function} t - Translation function từ useTranslation
 * @returns {object} { cameras, loading, refetch } - Dữ liệu cameras, trạng thái loading và hàm refetch
 */
export const useLoadCameraFromDatabase = (areaId, t) => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCameras = useCallback(async () => {
    try {
      setLoading(true);
      const camerasData = await getCamerasByArea(areaId);
      const formattedCameras = camerasData.map(cam => ({
        ...cam,
        roi: cam.mapping && Array.isArray(cam.mapping) && cam.mapping.length > 0
          ? cam.mapping.map((item, i) => {
            // Convert từ backend format: { roi: [x, y, w, h], position }
            // Sang frontend format: { x, y, width, height, label, task_path }
            if (item.roi && Array.isArray(item.roi) && item.roi.length === 4) {
              return {
                x: item.roi[0],
                y: item.roi[1],
                width: item.roi[2],
                height: item.roi[3],
                label: `ROI ${i + 1}`,
                task_path: item.position
              };
            }
            return null;
          }).filter(roi => roi !== null && roi.width > 0 && roi.height > 0)
          : []
      }));
      setCameras(formattedCameras);
      console.log('[DEBUG-formattedCameras]', formattedCameras);
    } catch (error) {
      console.error('Error loading cameras:', error);
      alert(t('settings.errorLoadingCameras'));
    } finally {
      setLoading(false);
    }
  }, [areaId, t]);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  return {
    cameras,
    setCameras, // Export để component có thể update cameras khi cần
    loading,
    refetch: loadCameras // Cho phép refetch manual
  };
};

