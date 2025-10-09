import { useState, useCallback} from 'react';

const useLeafletMapControls = () => {
  const [mapInstance, setMapInstance] = useState(null);

  const handleMapReady = useCallback((map) => {
    setMapInstance(map);

    if (map) {
      // Cấu hình zoom bằng chuột
      map.options.minZoom = -10;
      map.options.maxZoom = 5;
      map.options.zoomSnap = 0.1;
      map.options.zoomDelta = 0.25;
      map.options.wheelPxPerZoomLevel = 120;
      map.options.bounceAtZoomLimits = false;
      map.options.worldCopyJump = false;
      map.options.maxBoundsViscosity = 1.0;

      // Thiết lập giá trị ban đầu cho map
      const initialZoom = 0;
      const initialBounds = [
        [6912, 1280], // [south, west]
        [70912, 89600], // [north, east]
      ];
      const initialCenter = [
        (6912 + 70912) / 2, // lat: trung bình của south và north
        (1280 + 89600) / 2, // lng: trung bình của west và east
      ];

      // Đặt zoom và bounds ban đầu
      map.setView(initialCenter, initialZoom);
      map.fitBounds(initialBounds, {
        padding: [50, 50],
        maxZoom: initialZoom,
      });

      // Thêm event listener cho zoom
      map.on('zoom', (e) => {
        const currentZoom = map.getZoom();
        console.log('🖱️ Mouse zoom event:', {
          currentZoom: currentZoom,
          center: map.getCenter(),
        });
      });
    }
  }, []);

  const setOffset = useCallback((offset) => {
    if (mapInstance) {
      mapInstance.panTo([offset.y, offset.x]);
    }
  }, [mapInstance]);

  return {
    mapInstance,
    handleMapReady,
    setOffset,
  };
};

export default useLeafletMapControls;