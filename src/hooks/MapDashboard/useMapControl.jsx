import { useState, useCallback } from 'react';

const useLeafletMapControls = () => {
  const [mapInstance, setMapInstance] = useState(null);

  const handleMapReady = useCallback((map) => {
    setMapInstance(map);
  }, []);

                const handleZoom = useCallback((direction) => {
                if (mapInstance) {
                  if (direction > 0) {
                    mapInstance.zoomIn();
                  } else {
                    // Zoom out với các mức khác nhau
                    const currentZoom = mapInstance.getZoom();
                    let newZoom;
                    
                    if (direction === -10) {
                      // Zoom out cực mạnh về mức -10
                      newZoom = -10;
                    } else if (direction === -5) {
                      // Zoom out tối đa về mức -8
                      newZoom = -8;
                    } else if (direction === -2) {
                      // Zoom out mạnh
                      newZoom = Math.max(-10, currentZoom - 2);
                    } else {
                      // Zoom out bình thường
                      newZoom = Math.max(-10, currentZoom - 1);
                    }
                    
                    mapInstance.setZoom(newZoom);
                  }
                }
              }, [mapInstance]);

  const handleReset = useCallback(() => {
    if (mapInstance) {
      // Reset to default view - fit to the entire map area
      if (mapInstance._mapData) {
        const bounds = [
          [0, 0],
          [mapInstance._mapData.height, mapInstance._mapData.width]
        ];
        // Fit bounds với padding và giới hạn zoom để có thể nhìn thấy toàn bộ map
        mapInstance.fitBounds(bounds, {
          padding: [50, 50], // Thêm padding lớn hơn
          maxZoom: -2 // Giới hạn zoom tối đa khi reset để có thể nhìn thấy toàn bộ map
        });
      } else {
        // Default bounds if no map data
        const bounds = [
          [0, 0],
          [100000, 100000]
        ];
        mapInstance.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: -2
        });
      }
    }
  }, [mapInstance]);

  const handleRotate = useCallback((direction) => {
    // Leaflet doesn't have built-in rotation, but we can implement it
    // For now, we'll just log the action
    console.log(`Rotate ${direction > 0 ? 'clockwise' : 'counterclockwise'}`);
  }, []);

  const handleMirrorX = useCallback(() => {
    // Leaflet doesn't have built-in mirroring, but we can implement it
    // For now, we'll just log the action
    console.log('Mirror X');
  }, []);

  const handleMirrorY = useCallback(() => {
    // Leaflet doesn't have built-in mirroring, but we can implement it
    // For now, we'll just log the action
    console.log('Mirror Y');
  }, []);

  const setOffset = useCallback((offset) => {
    // In Leaflet, panning is handled automatically by the map
    if (mapInstance) {
      mapInstance.panTo([offset.y, offset.x]);
    }
  }, [mapInstance]);

  return {
    mapInstance,
    handleMapReady,
    handleReset,
    setOffset
  };
};

export default useLeafletMapControls; 