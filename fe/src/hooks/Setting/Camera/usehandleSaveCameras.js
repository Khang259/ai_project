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

      let successCount = 0;
      let failCount = 0;

      for (const camera of cameras) {
        const rois = camera.roi
          .filter(validateROI)
          .map(roi => ({
            nodeID: roi.node_id ? parseInt(roi.node_id) : 0,
            roi: [
              Math.round(roi.x),
              Math.round(roi.y),
              Math.round(roi.width),
              Math.round(roi.height)
            ],
          }));
        // TODO: ??? Payload gửi lên backend ??? Sửa kiểu đéo gì để đông bộ với CameraSettings.jsx
        const cameraData = {
          client_id: parseInt(camera.client_id) || 0,
          cameras: [
            {
              url: camera.camera_path || '',
              cameraId: parseInt(camera.camera_id) || 0,
              area_id: parseInt(camera.area_id) || 0,
              source_owner: parseInt(camera.source_owner) || 0,
              type_model: parseInt(camera.type_model) || 0,
              rois: rois
            }
          ],
        };

        if (camera.isNew) {
          if (camera.camera_path && camera.camera_id) {
            try {
              const result = await addCamera(cameraData);
              if (result.status === 200 || result.status === 201) {
                successCount++;
              } else {
                failCount++;
              }
            } catch (error) {
              console.error('[FE] Error adding camera:', error);
              failCount++;
            }
          }
        } else {
          try {
            const result = await updateCamera({
              id: camera.id,
              client_id: parseInt(camera.client_id),
              cameras: cameraData.cameras
            });
            
            if (result) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            console.error('[FE] Error updating camera:', error);
            failCount++;
          }
        }
      }

      // Reload cameras from database
      await refetchCameras();
      
      // Hiển thị thông báo dựa trên kết quả
      if (successCount > 0 && failCount === 0) {
        alert(t('settings.cameraConfigurationSavedSuccessfully'));
      } else if (failCount > 0) {
        alert(t('settings.errorSavingCameraConfiguration'));
      }
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
    validateRTSPUrl,
    validateROI
  };
};