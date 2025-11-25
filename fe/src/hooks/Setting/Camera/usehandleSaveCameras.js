import { useState } from 'react';
import { addCamera, updateCamera } from '@/services/camera-settings';

/**
 * Validation helpers
 */
const validateRTSPUrl = (url) => {
  const rtspRegex = /^rtsp:\/\/[\w\-\.]+(:\d+)?(\/.*)?$/i;
  return rtspRegex.test(url);
};

const validateROI = (roi) => {
  return (
    roi &&
    typeof roi === 'object' &&
    typeof roi.x === 'number' && roi.x >= 0 &&
    typeof roi.y === 'number' && roi.y >= 0 &&
    typeof roi.width === 'number' && roi.width > 0 &&
    typeof roi.height === 'number' && roi.height > 0
  );
};

/**
 * Custom hook để xử lý việc lưu cameras
 * @param {Array} cameras - Danh sách cameras
 * @param {function} refetchCameras - Hàm để reload cameras từ database
 * @param {function} t - Translation function
 * @returns {object} { handleSaveCameras, saving } - Hàm save và trạng thái saving
 */
export const useHandleSaveCameras = (cameras, refetchCameras, t) => {
  const [saving, setSaving] = useState(false);

  const handleSaveCameras = async () => {
    try {
      setSaving(true);

      // Validate cameras
      const invalidCameras = cameras.filter(camera =>
        (camera.camera_path && !validateRTSPUrl(camera.camera_path)) ||
        camera.roi.some(roi => !validateROI(roi))
      );

      if (invalidCameras.length > 0) {
        alert(t('settings.invalidRTSPUrlsOrBbox'));
        return;
      }

      // Save each camera
      for (const camera of cameras) {
        // Convert ROI từ frontend format sang backend schema (MappingItem)
        const mapping = camera.roi
          .filter(validateROI)
          .map(roi => ({
            roi: [
              Math.round(roi.x),
              Math.round(roi.y),
              Math.round(roi.width),
              Math.round(roi.height)
            ],
            position: roi.task_path ? parseInt(roi.task_path) : 0
          }));

        const cameraData = {
          camera_id: camera.camera_id,
          camera_name: camera.camera_name,
          camera_path: camera.camera_path,
          mapping: mapping, // Gửi theo format schema backend
          area: camera.area
        };

        if (camera.isNew) {
          if (camera.camera_name && camera.camera_path) {
            await addCamera(cameraData);
          }
        } else {
          await updateCamera({ ...cameraData, id: camera.id });
        }
      }

      // Reload cameras from database
      await refetchCameras();
      alert(t('settings.cameraConfigurationSavedSuccessfully'));
    } catch (error) {
      console.error('Error saving cameras:', error);
      alert(t('settings.errorSavingCameraConfiguration'));
    } finally {
      setSaving(false);
    }
  };

  return {
    handleSaveCameras,
    saving,
    validateRTSPUrl, // Export để component có thể dùng cho validation realtime
    validateROI
  };
};

