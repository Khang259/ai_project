import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import Camera from '../camera/Camera';
import { getCamerasByArea } from '@/services/camera-settings';
import { useArea } from "@/contexts/AreaContext";
import NodeComponent from './Node';

// Error Boundary Component
class CameraErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Camera component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '10px', 
          color: 'red', 
          background: '#ffe6e6',
          borderRadius: '4px',
          margin: '10px',
          border: '1px solid #ff4d4f'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Camera component error
          </div>
          <div style={{ fontSize: '12px' }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ 
              marginTop: '5px', 
              padding: '2px 8px', 
              fontSize: '10px',
              background: '#ff4d4f',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
// Icon AMR dùng ảnh từ public/assets/: amr_khong_tai.png, amr_co_tai.png (logic hasLoad từ payLoad)

// Camera icon sizing handled inside Camera component

// Icon trạm sạc (charge station) - pin/battery, kích thước gốc 28
const createChargeStationIcon = (displaySize = 28) => {
  const svg = `
    <svg width="${displaySize}" height="${displaySize}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="charge-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <circle cx="14" cy="14" r="12" fill="#667eea" stroke="#4a5568" stroke-width="1.5" filter="url(#charge-shadow)"/>
      <rect x="10" y="6" width="8" height="12" rx="1" fill="none" stroke="#fff" stroke-width="1.2"/>
      <rect x="12" y="9" width="4" height="6" rx="0.5" fill="#fff"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

// Kích thước icon theo zoom: zoom càng lớn icon càng to (kích thước gốc: base 28)
const getIconSizeByZoom = (zoom, baseSize = 28, minSize = 28, maxSize = 56) => {
  const scale = Math.pow(2, zoom);
  return Math.max(minSize, Math.min(maxSize, Math.round(baseSize * scale)));
};

// Fix for default markers in Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Helper function to create Catmull-Rom spline for smooth curves
const catmullRomSpline = (p0, p1, p2, p3, t) => {
  const v0 = (p2[0] - p0[0]) * 0.5;
  const v1 = (p3[0] - p1[0]) * 0.5;
  const v2 = (p2[1] - p0[1]) * 0.5;
  const v3 = (p3[1] - p1[1]) * 0.5;
  
  const t2 = t * t;
  const t3 = t2 * t;
  
  const y = p1[0] + v0 * t + (3 * (p2[0] - p1[0]) - 2 * v0 - v1) * t2 + (2 * (p1[0] - p2[0]) + v0 + v1) * t3;
  const x = p1[1] + v2 * t + (3 * (p2[1] - p1[1]) - 2 * v2 - v3) * t2 + (2 * (p1[1] - p2[1]) + v2 + v3) * t3;
  
  return [y, x];
};

// Helper function to smooth path coordinates using simplified approach
const smoothPathCoordinates = (coordinates, tension = 0.3, numSegments = 5) => {
  if (coordinates.length < 2) return coordinates;
  
  // Nếu chỉ có 2 điểm, tạo đường thẳng đơn giản
  if (coordinates.length === 2) {
    return coordinates;
  }
  
  const smoothed = [];
  
  // Thêm điểm đầu
  smoothed.push(coordinates[0]);
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p0 = coordinates[Math.max(0, i - 1)];
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const p3 = coordinates[Math.min(coordinates.length - 1, i + 2)];
    
    // Tạo ít điểm nội suy hơn để tránh rối mắt
    for (let j = 1; j <= numSegments; j++) {
      const t = j / numSegments;
      const point = catmullRomSpline(p0, p1, p2, p3, t * tension);
      smoothed.push(point);
    }
  }
  
  // Thêm điểm cuối
  smoothed.push(coordinates[coordinates.length - 1]);
  
  return smoothed;
};

// Thời gian mỗi đoạn A→B (càng lớn robot đi càng chậm)
const WAYPOINT_ANIMATION_DURATION_MS = 6000;
// Nếu thay đổi tọa độ (cả 2 trục) trong khoảng ± này thì không chạy animation, chỉ cập nhật vị trí/góc
const POSITION_UPDATE_THRESHOLD = 5;

function getPositionFromBot(bot) {
  const pos = bot?.devicePositionParsed || bot?.devicePosition || bot?.position || null;
  if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos) {
    const x = pos.x, y = pos.y;
    if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) return [y, x];
  }
  if (Array.isArray(pos) && pos.length >= 2) {
    const y = pos[0], x = pos[1];
    if (!isNaN(x) && !isNaN(y)) return [y, x];
  }
  if (bot?.x !== undefined && bot?.y !== undefined && !isNaN(bot.x) && !isNaN(bot.y)) return [bot.y, bot.x];
  return null;
}

function animateMarkerThroughWaypoints(marker, waypoints, durationPerSegmentMs, onCancelRef) {
  if (onCancelRef?.current != null) {
    cancelAnimationFrame(onCancelRef.current);
    onCancelRef.current = null;
  }
  if (!waypoints || waypoints.length < 2) {
    if (waypoints?.[0]) marker.setLatLng(waypoints[0]);
    return;
  }
  let segmentIndex = 0;
  const runSegment = () => {
    if (segmentIndex >= waypoints.length - 1) {
      onCancelRef.current = null;
      return;
    }
    const from = L.latLng(waypoints[segmentIndex]);
    const to = L.latLng(waypoints[segmentIndex + 1]);
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / durationPerSegmentMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const lat = from.lat + (to.lat - from.lat) * eased;
      const lng = from.lng + (to.lng - from.lng) * eased;
      marker.setLatLng([lat, lng]);

      if (t < 1) {
        onCancelRef.current = requestAnimationFrame(tick);
      } else {
        segmentIndex++;
        onCancelRef.current = null;
        if (segmentIndex < waypoints.length - 1) {
          runSegment();
        }
      }
    };
    onCancelRef.current = requestAnimationFrame(tick);
  };
  runSegment();
}

const LeafletMap = ({
  mapData,
  robotListWaypoints = null,
  showNodes,
  showCameras,
  showRobots = true,
  showPaths,
  showChargeStations,
  onMapReady,
  onCameraClick,
  onNodeClick,
  cameraFilter,
  nodeFilter,
  mapHeight,
}) => {
  const { t } = useTranslation();
  const [cameraStatus, setCameraStatus] = useState({});
  const [nodeStatus, setNodeStatus] = useState({});
  const { currAreaId } = useArea();
  const [camerasData, setCamerasData] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapInstanceState, setMapInstanceState] = useState(null);
  const [mapZoom, setMapZoom] = useState(0);
  const robotMarkersRef = useRef(new Map());
  const layersRef = useRef({
    grid: null,
    paths: null,
    nodes: null,
    cameras: null,
    chargeStations: null,
    robotsMulti: null
  });

  useEffect(() => {
    if (!mapRef.current || !mapData) return;

    // Initialize map với cấu hình zoom đơn giản hơn
    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      // Loại bỏ các cấu hình zoom phức tạp - để useMapControl xử lý
      zoomControl: false, // Tắt zoom control mặc định
      attributionControl: false,
      preferCanvas: true,
      renderer: L.canvas({ padding: 0.5 }),
      tap: false,
      // Các cấu hình zoom sẽ được set trong useMapControl
    });

    mapInstanceRef.current = map;  
    setMapInstanceState(map);

    if (onMapReady) {
      // Store map data reference for reset functionality
      map._mapData = mapData;
      onMapReady(map, mapData);
    }

    setMapZoom(map.getZoom());
    map.on('zoomend', () => setMapZoom(map.getZoom()));

    return () => {
      if (map) {
        try {
          // Clear all layers trước khi remove map
          map.eachLayer((layer) => {
            try {
              map.removeLayer(layer);
            } catch (error) {
              console.warn('⚠️ Error removing layer:', error);
            }
          });
          
          // Clear all event listeners
          map.off();
          
          // Remove map
          map.remove();
        } catch (error) {
          console.warn('⚠️ Error cleaning up map:', error);
        }
      }
    };
  }, [mapData, onMapReady]);

  // Update map data reference when mapData changes
  useEffect(() => {
    if (mapInstanceRef.current && mapData) {
      mapInstanceRef.current._mapData = mapData;
    }
  }, [mapData]);

  // ✅ useEffect để fetch camera data từ database
  useEffect(() => {
    const fetchCamerasData = async () => {
      if (!currAreaId) {
        console.log('⚠️ No currentAreaId provided, skipping camera fetch');
        setCamerasData([]);
        return;
      }

      try {
        const cameras = await getCamerasByArea(currAreaId);
        setCamerasData(cameras || []);
      } catch (error) {
        console.error('❌ Error fetching cameras data:', error);
        setCamerasData([]);
      }
    };

    fetchCamerasData();
  }, [currAreaId]); // Re-fetch khi area thay đổi

  // Draw paths
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData || !showPaths) {
      if (layersRef.current.paths) {
        mapInstanceRef.current.removeLayer(layersRef.current.paths);
        layersRef.current.paths = null;
      }
      return;
    }

    // Remove existing paths layer
    if (layersRef.current.paths) {
      mapInstanceRef.current.removeLayer(layersRef.current.paths);
    }

    const pathsLayer = L.layerGroup();

    if (mapData.lineArr) {
      mapData.lineArr.forEach(line => {
        if (line.startNode && line.endNode) {
          const startNode = mapData.nodeArr.find(node => node.key === line.startNode);
          const endNode = mapData.nodeArr.find(node => node.key === line.endNode);
   
          if (startNode && endNode && 
              typeof startNode.x !== 'undefined' && typeof startNode.y !== 'undefined' &&
              typeof endNode.x !== 'undefined' && typeof endNode.y !== 'undefined') {
            
            // Use path data if available, otherwise draw straight line
            let pathCoordinates;
            if (line.path && Array.isArray(line.path) && line.path.length > 0) {
              // Convert path coordinates to Leaflet format [y, x]
              pathCoordinates = line.path.map(coord => [coord[1], coord[0]]);
            } else {
              // Fallback to straight line between nodes
              pathCoordinates = [
                [startNode.y, startNode.x],
                [endNode.y, endNode.x]
              ];
            }
            
            // Smooth the path coordinates for curved lines
            const smoothPath = smoothPathCoordinates(pathCoordinates);
            
            // Màu path
            const path = L.polyline(smoothPath, {
              color: 'rgb(17, 223, 223)',
              weight: 3,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
              smoothFactor: 1,
              className: 'scenario-path'
            });

            // Add subtle glow effect
            const glowPath = L.polyline(smoothPath, {
              color: '#ffffff',
              weight: 4,
              opacity: 0.1,
              lineCap: 'round',
              lineJoin: 'round',
              className: 'path-glow'
            });
            
            pathsLayer.addLayer(glowPath);
            pathsLayer.addLayer(path);
          }
        }
      });
    }

    pathsLayer.addTo(mapInstanceRef.current);
    layersRef.current.paths = pathsLayer;
  }, [mapData, showPaths]);

  // Camera layer moved into Camera component

  // Handle node click events
  const handleNodeClick = (nodeInfo) => {
    
    // Update node status (example: toggle lock status)
    setNodeStatus(prev => ({
      ...prev,
      [nodeInfo.id]: {
        ...prev[nodeInfo.id],
        lock: !prev[nodeInfo.id]?.lock
      }
    }));

    // Call parent callback if provided
    if (onNodeClick) {
      onNodeClick(nodeInfo);
    }
  };
  // Draw charge stations
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData || !showChargeStations) {
      if (layersRef.current.chargeStations) {
        mapInstanceRef.current.removeLayer(layersRef.current.chargeStations);
        layersRef.current.chargeStations = null;
      }
      return;
    }

    // Remove existing charge stations layer
    if (layersRef.current.chargeStations) {
      mapInstanceRef.current.removeLayer(layersRef.current.chargeStations);
    }

    const chargeStationsLayer = L.layerGroup();
    const nodeArr = mapData.nodeArr || [];

    // Lấy tọa độ từ object (chargeCoor[i][1]) — hỗ trợ .x/.y, .lat/.lng, .position
    const getCoordFromObj = (obj) => {
      if (!obj || typeof obj !== 'object') return null;
      if (typeof obj.x === 'number' && typeof obj.y === 'number') return { y: obj.y, x: obj.x };
      if (typeof obj.lat === 'number' && typeof obj.lng === 'number') return { y: obj.lat, x: obj.lng };
      const pos = obj.position || obj.coord || obj.coordinate;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') return { y: pos.y, x: pos.x };
      if (pos && typeof pos.lat === 'number' && typeof pos.lng === 'number') return { y: pos.lat, x: pos.lng };
      return null;
    };

    const chargeSize = getIconSizeByZoom(mapZoom, 28, 28, 56);
    const chargeIcon = L.icon({
      iconUrl: createChargeStationIcon(chargeSize),
      iconSize: [chargeSize, chargeSize],
      iconAnchor: [chargeSize / 2, chargeSize / 2],
      className: 'charge-station-icon'
    });

    // Mỗi chargeCoor[i] = [id, object] là 1 điểm; vẽ trực tiếp từ tọa độ trong [1] hoặc tìm node theo [0]
    (mapData.chargeCoor || []).forEach((item) => {
      if (!item || !Array.isArray(item) || item.length < 2) return;
      const id = item[0];
      const coordObj = item[1];
      let y, x;

      const fromObj = getCoordFromObj(coordObj);
      if (fromObj) {
        y = fromObj.y;
        x = fromObj.x;
      } else {
        const keyStr = id != null ? String(id).trim() : '';
        const node = nodeArr.find((n) => n && (String(n.key ?? '') === keyStr || (n.name != null && String(n.name).trim() === keyStr)));
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') return;
        y = node.y;
        x = node.x;
      }

      if (typeof y !== 'number' || typeof x !== 'number' || isNaN(y) || isNaN(x)) return;

      const marker = L.marker([y, x], { icon: chargeIcon });
      marker.bindTooltip(`${t('map.chargingStation')} ${id != null ? id : ''}`, { direction: 'top', offset: [0, -14] });
      chargeStationsLayer.addLayer(marker);
    });

    chargeStationsLayer.addTo(mapInstanceRef.current);
    layersRef.current.chargeStations = chargeStationsLayer;
  }, [mapData, showChargeStations, mapZoom, t]);

  // Robot: cần 2 lần nhận data [list0, list1]. Mỗi lần có data mới thì animate lượt đi trước đó (list0 → list1).
  useEffect(() => {
    const mapInstance = mapInstanceRef.current;
    if (!mapInstance || !showRobots) {
      if (layersRef.current.robotsMulti) {
        mapInstanceRef.current?.removeLayer(layersRef.current.robotsMulti);
        layersRef.current.robotsMulti = null;
      }
      robotMarkersRef.current.forEach((entry) => {
        if (entry?.animationRef?.current != null) cancelAnimationFrame(entry.animationRef.current);
      });
      robotMarkersRef.current.clear();
      return;
    }

    const waypoints = robotListWaypoints;
    if (!waypoints || waypoints.length !== 2) {
      if (layersRef.current.robotsMulti) {
        mapInstance.removeLayer(layersRef.current.robotsMulti);
        layersRef.current.robotsMulti = null;
      }
      robotMarkersRef.current.forEach((entry) => {
        if (entry?.animationRef?.current != null) cancelAnimationFrame(entry.animationRef.current);
      });
      robotMarkersRef.current.clear();
      return;
    }

    const [list0, list1] = waypoints;
    if (!layersRef.current.robotsMulti) {
      layersRef.current.robotsMulti = L.layerGroup();
      layersRef.current.robotsMulti.addTo(mapInstance);
    }
    const robotsLayer = layersRef.current.robotsMulti;
    const currentKeys = new Set();

    const findBotByKey = (list, key) => list.find((r) => (r.device_code || r.deviceCode || r.device_name || r.deviceName) === key);

    // Mỗi lần có data mới: đích mới (p1). Robot đã có trên map thì animate từ vị trí hiện tại → p1 (tiếp nối, không nhảy về điểm cũ).
    list1.forEach((bot, idx) => {
      const key = bot.device_code || bot.deviceCode || bot.device_name || bot.deviceName || `robot-${idx}`;
      currentKeys.add(key);
      const b0 = findBotByKey(list0, key);
      const b1 = bot;
      const p0 = getPositionFromBot(b0);
      const p1 = getPositionFromBot(b1);
      if (!p1) return;

      let entry = robotMarkersRef.current.get(key);
      const rawPayload = bot.payLoad ?? bot.payload;
      const hasLoad = rawPayload === '1.0' || rawPayload === 1 || String(rawPayload) === '1';
      const robotSize = getIconSizeByZoom(mapZoom, 40, 40, 112);
      // Ảnh AMR từ public/assets/ (không cần import): amr_khong_tai.png, amr_co_tai.png
      const iconSrc = hasLoad ? '/assets/amr_co_tai.png' : '/assets/amr_khong_tai.png';
      const icon = L.divIcon({
        html: `<div class="amr-icon-inner" style="width:100%;height:100%;display:block;position:relative"><img src="${iconSrc}" style="width:100%;height:100%;display:block" alt="" /></div>`,
        iconSize: [robotSize, robotSize],
        iconAnchor: [robotSize / 2, robotSize / 2],
        className: 'amr-rect-icon',
      });

      if (!entry) {
        // Robot mới: cần p0 để đặt vị trí ban đầu; nếu không có p0 thì đặt luôn tại p1
        const startPos = p0 || p1;
        const marker = L.marker(startPos, { icon, zIndexOffset: 900 });
        const loadLabel = hasLoad ? t('map.payloadLoaded') : t('map.payloadUnloaded');
        marker.bindTooltip(
          `<div style="font-size:12px;">
            <div><b>Device name: ${bot.device_name || bot.deviceName || bot.device_code || bot.deviceCode || 'AGV'}</b></div>
            <div>${t('map.payloadLabel')} ${loadLabel}</div>
            <div>Battery: ${bot.battery ?? 'N/A'}</div>
            <div>Speed: ${bot.speed ?? 'N/A'}</div>
          </div>`,
          { direction: 'top' }
        );
        robotsLayer.addLayer(marker);
        entry = { marker, animationRef: { current: null } };
        robotMarkersRef.current.set(key, entry);
      } else {
        entry.marker.setIcon(icon);
      }

      // Điểm đích luôn là p1. Điểm đầu: nếu đã có marker thì dùng vị trí hiện tại (animate tiếp), không thì dùng p0 (robot mới).
      const fromPos = entry.marker.getLatLng();
      const startPos = [fromPos.lat, fromPos.lng];
      const deltaY = Math.abs(p1[0] - startPos[0]);
      const deltaX = Math.abs(p1[1] - startPos[1]);
      const withinThreshold = deltaY <= POSITION_UPDATE_THRESHOLD && deltaX <= POSITION_UPDATE_THRESHOLD;

      if (withinThreshold) {
        if (entry.animationRef?.current != null) {
          cancelAnimationFrame(entry.animationRef.current);
          entry.animationRef.current = null;
        }
        entry.marker.setLatLng(p1);
      } else {
        animateMarkerThroughWaypoints(
          entry.marker,
          [startPos, p1],
          WAYPOINT_ANIMATION_DURATION_MS,
          entry.animationRef
        );
      }
    });

    robotMarkersRef.current.forEach((entry, key) => {
      if (!currentKeys.has(key)) {
        if (entry?.animationRef?.current != null) cancelAnimationFrame(entry.animationRef.current);
        robotsLayer.removeLayer(entry.marker);
        robotMarkersRef.current.delete(key);
      }
    });
  }, [robotListWaypoints, mapZoom, showRobots, t]);

  return (
    <>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-3px) rotate(0deg); }
          }
          
          .amr-circular-icon,
          .amr-rect-icon {
            transition: opacity 0.3s ease-in-out, filter 0.3s ease-in-out;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            background: transparent;
          }
          
          .amr-rect-icon .amr-icon-inner {
            transform-origin: center center;
          }
          .amr-rect-icon:hover .amr-icon-inner {
            transform: scale(1.1);
          }
          .amr-rect-icon:hover {
            filter: drop-shadow(0 6px 20px rgba(0,0,0,0.9));
          }
          
          .amr-circular-icon img,
          .amr-rect-icon img {
            background: transparent !important;
            border: none !important;
            outline: none !important;
          }
          
          .amr-circular-icon:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 6px 20px rgba(0,0,0,0.9));
          }
          
          /* Fix for PNG transparency issues */
          .leaflet-marker-icon {
            background: transparent !important;
          }
          
          .leaflet-marker-icon img {
            background: transparent !important;
            image-rendering: auto;
          }
          
          .camera-marker-icon:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
          }
          
          .camera-tooltip {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          /* Icon mờ: camera, trạm sạc, supply, return (trừ robot) */
          .camera-marker-icon,
          .camera-marker-icon img,
          .charge-station-icon,
          .charge-station-icon img,
          .supply-point-icon,
          .supply-point-icon img,
          .return-point-icon,
          .return-point-icon img {
            opacity: 0.5;
          }

          .supply-point-icon:hover, .return-point-icon:hover, .regular-node-icon:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
          }
          
          .supply-point-icon:hover, .supply-point-icon:hover img,
          .return-point-icon:hover, .return-point-icon:hover img,
          .charge-station-icon:hover, .charge-station-icon:hover img,
          .camera-marker-icon:hover, .camera-marker-icon:hover img {
            opacity: 0.9;
          }
          
          .node-tooltip {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}
      </style>
        <div 
          className='map-wrapper'
          ref={mapRef} 
          style={{
            width: '100%',
            height: mapHeight || '40vh',
            position: 'relative'
          }}
        />
      {/* Camera layer với error boundary */}
      <CameraErrorBoundary>
        {(() => {
          const ready = !!mapInstanceState;
          return (
            <Camera 
              mapInstance={mapInstanceState}
              mapData={mapData}
              showCameras={showCameras}
              onCameraClick={onCameraClick}
              cameraStatus={cameraStatus}
              camerasData={camerasData}
              focusCamera={cameraFilter}
            />
          );
        })()}
      </CameraErrorBoundary>
      {/* NodeComponent for handling supply/return points */}
      {(() => {
        const ready = !!mapInstanceState;
        return (
          <NodeComponent 
            mapInstance={mapInstanceState}
            mapData={mapData}
            nodeStatus={nodeStatus}
            onNodeClick={handleNodeClick}
            showNodes={showNodes}
            nodeFilter={nodeFilter}
            mapZoom={mapZoom}
          />
        );
      })()}
    </>
  );
};

export default LeafletMap; 