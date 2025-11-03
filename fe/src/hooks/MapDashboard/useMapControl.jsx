import { useState, useCallback} from 'react';

const useLeafletMapControls = () => {
  const [mapInstance, setMapInstance] = useState(null);

  const handleMapReady = useCallback((map, mapData) => {
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

      // Thiết lập giá trị ban đầu cho map với kích thước 300000 x 300000
      const initialZoom = 0;
      const mapWidth = mapData.width;   // Chiều rộng
      const mapHeight = mapData.height; // Chiều cao

      // Tính toán bounds để căn giữa
      const initialBounds = [
        [0, 0],                    // [south, west] - Bottom-left
        [mapHeight, mapWidth],     // [north, east] - Top-right
      ];

      // Center point ở giữa map
      const initialCenter = [
        mapHeight / 2,  // lat: 150000 (giữa chiều cao)
        mapWidth / 2,   // lng: 150000 (giữa chiều rộng)
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