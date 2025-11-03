import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import onlineCameraIcon from '@/assets/online_camera.png';
import offlineCameraIcon from '@/assets/offline_camera.png';

// Tính kích thước icon camera theo zoom hiện tại của map (CRS.Simple)
const getCameraIconSizeByZoom = (map) => {
  if (!map) return [32, 32];
  const zoom = map.getZoom();
  const baseSize = 24; // kích thước cơ sở tại zoom 0
  const scale = Math.pow(2, zoom);
  const size = Math.max(16, Math.min(64, Math.round(baseSize * scale)));
  return [size, size];
};

const Camera = ({
  mapInstance,
  mapData,
  showCameras,
  onCameraClick,
  cameraStatus,
  camerasData,
  focusCamera,
}) => {
  const layerRef = useRef(null);
  const markersRef = useRef({}); // Lưu markers để tra cứu

  useEffect(() => {
    try {
      if (!mapInstance || !mapData || !showCameras) {
        if (layerRef.current && mapInstance) {
          try {
            mapInstance.removeLayer(layerRef.current);
          } catch (error) {
            console.warn('⚠️ Error removing camera layer:', error);
          }
          layerRef.current = null;
        }
        return;
      }

      // Kiểm tra map container vẫn tồn tại
      if (!mapInstance.getContainer()) {
        console.warn('⚠️ Map container missing, skipping camera render');
        return;
      }

      // Remove existing camera layer
      if (layerRef.current) {
        try {
          mapInstance.removeLayer(layerRef.current);
        } catch (error) {
          console.warn('⚠️ Error removing existing camera layer:', error);
        }
      }

      const camerasLayer = L.layerGroup();

      if (mapData.nodeArr && Array.isArray(mapData.nodeArr)) {
        mapData.nodeArr.forEach((node) => {
          try {
            if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
              return;
            }

            if (typeof node.name === 'string' && /^Camera\d+$/i.test(node.name.trim())) {
              // Extract camera ID from name (Camera1, Camera2...)
              const cameraIndex = parseInt(node.name.replace(/Camera/i, ''));
              const isOnline = cameraStatus[cameraIndex]?.online || false;

              // Map theo index với -1 để Camera1 -> DB[0]
              const cameraFromDB = camerasData[cameraIndex - 1];
              const cameraPath = cameraFromDB?.camera_path || `Chưa được cấu hình`;
              const cameraName = cameraFromDB?.camera_name || node.name;

              const currentSize = getCameraIconSizeByZoom(mapInstance);
              const cameraIcon = L.icon({
                iconUrl: isOnline ? onlineCameraIcon : offlineCameraIcon,
                iconSize: currentSize,
                iconAnchor: [Math.round(currentSize[0] / 2), Math.round(currentSize[1] / 2)],
                popupAnchor: [0, -Math.round(currentSize[1] / 2)],
                className: 'camera-marker-icon'
              });

              const marker = L.marker([node.y, node.x], { icon: cameraIcon });

              marker.bindTooltip(`<div style="
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 1px solid ${isOnline ? '#52c41a' : '#ff4d4f'};
              ">
                <div style="margin-bottom: 4px; font-weight: 600;">${cameraName}</div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? '#52c41a' : '#ff4d4f'}; display: inline-block;"></span>
                  <span style="font-family: monospace; font-size: 11px;">${cameraPath}</span>
                </div>
                <div style="margin-top: 4px; font-size: 11px; opacity: 0.8;">
                  Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
                <div style="margin-top: 2px; font-size: 10px; opacity: 0.7;">
                  Index: ${cameraIndex} | Area: ${cameraFromDB?.area || 'N/A'}
                </div>
              </div>`, {
                permanent: false,
                direction: 'top',
                offset: [0, -20],
                className: 'camera-tooltip'
              });

              if (onCameraClick) {
                marker.on('click', () => {
                  onCameraClick({
                    cameraIndex: cameraIndex,
                    cameraName: cameraName,
                    cameraPath: cameraPath,
                    cameraData: cameraFromDB
                  });
                });
              }

              // Update size on zoom
              const onZoom = () => {
                const newSize = getCameraIconSizeByZoom(mapInstance);
                const newIcon = L.icon({
                  iconUrl: isOnline ? onlineCameraIcon : offlineCameraIcon,
                  iconSize: newSize,
                  iconAnchor: [Math.round(newSize[0] / 2), Math.round(newSize[1] / 2)],
                  popupAnchor: [0, -Math.round(newSize[1] / 2)],
                  className: 'camera-marker-icon'
                });
                marker.setIcon(newIcon);
              };
              mapInstance.on('zoomend', onZoom);
              marker.on('remove', () => {
                mapInstance && mapInstance.off('zoomend', onZoom);
              });

              camerasLayer.addLayer(marker);

              // Lưu markers vào markersRef để tra cứu
              markersRef.current[node.name] = marker;
              markersRef.current[`Camera${cameraIndex}`] = marker;
              if (cameraName) markersRef.current[cameraName] = marker;
            }
          } catch (nodeError) {
            console.error('🚨 Error processing camera node:', node, nodeError);
          }
        });
      }

      // Kiểm tra map container vẫn tồn tại trước khi add layer
      if (mapInstance && mapInstance.getContainer()) {
        camerasLayer.addTo(mapInstance);
        layerRef.current = camerasLayer;
      } else {
        console.warn('⚠️ Map container missing, cannot add camera layer');
      }

    } catch (error) {
      console.error('🚨 Camera useEffect error:', error);
      // Cleanup on error
      if (layerRef.current && mapInstance) {
        try {
          mapInstance.removeLayer(layerRef.current);
        } catch (cleanupError) {
          console.warn('⚠️ Error during cleanup:', cleanupError);
        }
        layerRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (layerRef.current && mapInstance && mapInstance.getContainer()) {
        try {
          mapInstance.removeLayer(layerRef.current);
        } catch (error) {
          console.warn('⚠️ Error removing camera layer in cleanup:', error);
        }
        layerRef.current = null;
      }
      markersRef.current = {};
    };
  }, [mapInstance, mapData, showCameras, onCameraClick, cameraStatus, camerasData]);

  // useEffect để xử lý focus + tooltip khi cameraFilter thay đổi
  useEffect(() => {
    if (!mapInstance || !focusCamera || !markersRef.current) {
      return;
    }

    const query = String(focusCamera).trim();
    if (!query) {
      return;
    }
    // Tìm marker theo nhiều cách
    let targetMarker = null;
    
    // Thử các key khác nhau
    const keysToTry = [
      query,
      `Camera${query}`,
      query.replace(/\s+/g, ''),
      query.toLowerCase()
    ];

    // Tìm theo camera_name từ DB
    if (Array.isArray(camerasData)) {
      const found = camerasData.find(c => c?.camera_name === query);
      if (found) {
        const nodeKey = `Camera${found.camera_id}`;
        targetMarker = markersRef.current[nodeKey];
      }
    }

    // Nếu chưa tìm thấy, thử các key khác
    if (!targetMarker) {
      for (const key of keysToTry) {
        if (markersRef.current[key]) {
          targetMarker = markersRef.current[key];
          break;
        }
      }
    }

    if (targetMarker) {
      // Chỉ mở tooltip, không pan và không highlight
      targetMarker.openTooltip();
    } else {
    }
  }, [focusCamera, mapInstance, camerasData]);

  // Route change detection và cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Cleanup khi route thay đổi
      if (layerRef.current && mapInstance) {
        try {
          mapInstance.removeLayer(layerRef.current);
          layerRef.current = null;
        } catch (error) {
          console.warn('⚠️ Error cleaning up on route change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload(); // Cleanup ngay lập tức
    };
  }, [mapInstance]);

  return null;
};

export default Camera;


