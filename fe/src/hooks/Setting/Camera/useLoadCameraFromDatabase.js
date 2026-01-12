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
      
      // Flatten và transform dữ liệu từ backend
      const formattedCameras = camerasData.flatMap(item => 
        item.cameras.map(cam => ({
          id: item.id, // Dùng ID từ parent
          client_id: item.client_id,
          camera_id: cam.cameraId,
          camera_path: cam.url,
          area_id: cam.area_id,
          source_owner: cam.source_owner,
          type_model: cam.type_model,
          roi: cam.rois && Array.isArray(cam.rois) && cam.rois.length > 0
            ? cam.rois.map((roiItem, i) => {
                if (roiItem && roiItem.roi && Array.isArray(roiItem.roi)) {
                  return {
                    x: roiItem.roi[0],
                    y: roiItem.roi[1],
                    width: roiItem.roi[2],
                    height: roiItem.roi[3],
                    label: `ROI ${i + 1}`,
                    node_id: roiItem.node_id || ''
                  };
                }
                else {
                  return null;
                }
              })
            : [],
          node_id: '' // Có thể lấy từ roi nếu cần
        }))
      );
      
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

