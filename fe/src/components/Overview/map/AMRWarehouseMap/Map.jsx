import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
// Import camera images
import onlineCameraIcon from '@/assets/online_camera.png';
import offlineCameraIcon from '@/assets/offline_camera.png';
import cameraConfig from '@/components/config/camera';
// Import NodeComponent
import NodeComponent from './Node';
// Biểu tường AGV
const createSVGIcon = (size = 28, color = '#4285F4') => {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" filter="url(#shadow)"/>
      <rect x="${size/2 - 6}" y="${size/2 - 3}" width="12" height="6" fill="white" rx="1"/>
      <circle cx="${size/2 - 3}" cy="${size/2}" r="1.5" fill="${color}"/>
      <circle cx="${size/2 + 3}" cy="${size/2}" r="1.5" fill="${color}"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Try multiple icon URLs for better compatibility
const getIconUrl = () => {
  // Try different approaches in order of preference@
  const urls = [
    createSVGIcon(28, '#4285F4'), // SVG fallback
  ];
  
  for (const url of urls) {
    if (url) {
      return url;
    }
  }
  return createSVGIcon(); // Return SVG as final fallback
};

// Tính kích thước icon camera theo zoom hiện tại của map (CRS.Simple)
const getCameraIconSizeByZoom = (map) => {
  if (!map) return [32, 32];
  const zoom = map.getZoom();
  // Với CRS.Simple: zoom 0 ~ 1x, -1 ~ 0.5x, 1 ~ 2x
  const baseSize = 24; // kích thước cơ sở tại zoom 0
  const scale = Math.pow(2, zoom);
  const size = Math.max(16, Math.min(64, Math.round(baseSize * scale)));
  return [size, size];
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

const LeafletMap = ({
  mapData,
  robotPosition,
  robotList,
  showNodes,
  showCameras,
  showPaths,
  showChargeStations,
  onMapReady,
  onCameraClick,
  onNodeClick
}) => {
  const [cameraStatus, setCameraStatus] = useState({});
  const [nodeStatus, setNodeStatus] = useState({});
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapInstanceState, setMapInstanceState] = useState(null); // ensure children re-render when map is ready
  const robotMarkerRef = useRef(null);
  const previousPositionRef = useRef(null);
  const layersRef = useRef({
    grid: null,
    paths: null,
    nodes: null,
    cameras: null,
    chargeStations: null,
    robot: null,
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
      onMapReady(map);
    }

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [mapData, onMapReady]);

  // Update map data reference when mapData changes
  useEffect(() => {
    if (mapInstanceRef.current && mapData) {
      mapInstanceRef.current._mapData = mapData;
    }
  }, [mapData]);

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
              color: 'rgb(17, 113, 223)',
              weight: 3,
              opacity: 0.8,
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

  // Tách riêng useEffect cho camera layer
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData || !showCameras) {
      if (layersRef.current.cameras) {
        mapInstanceRef.current.removeLayer(layersRef.current.cameras);
        layersRef.current.cameras = null;
      }
      return;
    }

    // Remove existing camera layer
    if (layersRef.current.cameras) {
      mapInstanceRef.current.removeLayer(layersRef.current.cameras);
    }

    const camerasLayer = L.layerGroup();

    if (mapData.nodeArr) {
      let cameraCount = 0;
      let skippedCount = 0;
      
      mapData.nodeArr.forEach((node, index) => {
        // Skip nodes without required properties
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
          skippedCount++;
          return;
        }

        // Chỉ xử lý camera nodes
        if (typeof node.name === 'string' && /^Camera\d+$/i.test(node.name.trim())) {
          
          // Extract camera ID from name
          const cameraId = parseInt(node.name.replace(/Camera/i, ''));
          const isOnline = cameraStatus[cameraId]?.online || false;
        
          
          // Get camera info from config
          let ipAddress = `192.168.1.${100 + cameraId}`; // IP mặc định có file riêng để sửa sau
          
          // Tạo camera icon sử dụng hình ảnh với kích thước theo zoom
          const currentSize = getCameraIconSizeByZoom(mapInstanceRef.current);
          const cameraIcon = L.icon({
            iconUrl: isOnline ? onlineCameraIcon : offlineCameraIcon,
            iconSize: currentSize ,
            iconAnchor: [Math.round(currentSize[0] / 2), Math.round(currentSize[1] / 2)],
            popupAnchor: [0, -Math.round(currentSize[1] / 2)],
            className: 'camera-marker-icon'
          });
          
          const marker = L.marker([node.y, node.x], { icon: cameraIcon });
          
          // Add tooltip with IP address
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
            <div style="margin-bottom: 4px; font-weight: 600;">${node.name}</div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? '#52c41a' : '#ff4d4f'}; display: inline-block;"></span>
              <span>${ipAddress}</span>
            </div>
            <div style="margin-top: 4px; font-size: 11px; opacity: 0.8;">
              Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>`, {
            permanent: false,
            direction: 'top',
            offset: [0, -20],
            className: 'camera-tooltip'
          });
          
          if (onCameraClick) {
            marker.on('click', () => {
              onCameraClick(node.name.replace('Camera', ''));
            });
          }
          camerasLayer.addLayer(marker);

          // Cập nhật kích thước icon khi zoom thay đổi
          if (mapInstanceRef.current) {
            const onZoom = () => {
              const newSize = getCameraIconSizeByZoom(mapInstanceRef.current);
              const newIcon = L.icon({
                iconUrl: isOnline ? onlineCameraIcon : offlineCameraIcon,
                iconSize: newSize,
                iconAnchor: [Math.round(newSize[0] / 2), Math.round(newSize[1] / 2)],
                popupAnchor: [0, -Math.round(newSize[1] / 2)],
                className: 'camera-marker-icon'
              });
              marker.setIcon(newIcon);
            };
            mapInstanceRef.current.on('zoomend', onZoom);
            // Lưu cleanup trên marker để gỡ listener khi remove layer
            marker.on('remove', () => {
              mapInstanceRef.current && mapInstanceRef.current.off('zoomend', onZoom);
            });
          }
          cameraCount++;
        } else {
          skippedCount++;
        }
      });
    }

    camerasLayer.addTo(mapInstanceRef.current);
    layersRef.current.cameras = camerasLayer;
  }, [mapData, showCameras, onCameraClick, cameraStatus]);

  // Handle node click events
  const handleNodeClick = (nodeInfo) => {
    console.log('Node clicked in Map:', nodeInfo);
    
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

    if (mapData.nodeArr) {
      mapData.nodeArr.forEach(node => {
        // Skip nodes without required properties
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
          return;
        }
        
        if (node.type === 'charge' || (node.key && node.key.includes('charge'))) {
          // Create subtle grid nodes for background
          const circle = L.circle([node.y, node.x], {
            radius: 8,
            fillColor: '#4a5568',
            color: '#667eea',
            weight: 1,
            opacity: 0.3,
            fillOpacity: 0.2,
            className: 'grid-node'
          });



          chargeStationsLayer.addLayer(circle);
        }
      });
    }

    chargeStationsLayer.addTo(mapInstanceRef.current);
    layersRef.current.chargeStations = chargeStationsLayer;
  }, [mapData, showChargeStations]);

  // Draw multiple robots from robotList
  useEffect(() => {
    if (!mapInstanceRef.current) {
      if (layersRef.current.robotsMulti) {
        mapInstanceRef.current.removeLayer(layersRef.current.robotsMulti);
        layersRef.current.robotsMulti = null;
      }
      return;
    }

    // Ensure we always have a robot list to display
    const safeRobotList = Array.isArray(robotList) ? robotList : [];
    
    if (safeRobotList.length === 0) {
      // If no robots, don't remove the layer - keep existing robots
      return;
    }

    // Create or reset multi-robot layer
    if (layersRef.current.robotsMulti) {
      mapInstanceRef.current.removeLayer(layersRef.current.robotsMulti);
    }
    const robotsLayer = L.layerGroup();

    safeRobotList.forEach((bot, idx) => {
      // Extract position - prioritize parsed position from node mapping
      const pos = bot.devicePositionParsed || bot.devicePosition || bot.position || null;
      // Expect pos like { x, y } or [y, x]
      let y, x;
      if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos) {
        x = pos.x; y = pos.y;
        // Validate position values
        if (isNaN(x) || isNaN(y) || x === null || y === null) {
          return;
        }
      } else if (Array.isArray(pos) && pos.length >= 2) {
        y = pos[0]; x = pos[1];
        if (isNaN(x) || isNaN(y)) {
          return;
        }
      } else if (bot.x !== undefined && bot.y !== undefined) {
        x = bot.x; y = bot.y;
        if (isNaN(x) || isNaN(y)) {
          return;
        }
      } else {
        return; // skip if no position
      }
      // Force use simple SVG icon for all robots (temporary fix)
      const iconUrl = '/assets/agv-icon-simple.svg';
      
      const icon = L.icon({
        iconUrl: iconUrl,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: 'amr-circular-icon',
        crossOrigin: 'anonymous'
      });
      
      const marker = L.marker([y, x], { icon, zIndexOffset: 900 });
      marker.bindTooltip(
        `<div style="font-size:12px;">
          <div><b>Device name: ${bot.device_name || bot.deviceName || bot.device_code || bot.deviceCode || 'AGV'}</b></div>
          <div>Battery: ${bot.battery ?? 'N/A'}</div>
          <div>Speed: ${bot.speed ?? 'N/A'}</div>
        </div>`,
        { direction: 'top' }
      );
      robotsLayer.addLayer(marker);
    });

    robotsLayer.addTo(mapInstanceRef.current);
    layersRef.current.robotsMulti = robotsLayer;


    return () => {
      if (layersRef.current.robotsMulti) {
        mapInstanceRef.current.removeLayer(layersRef.current.robotsMulti);
        layersRef.current.robotsMulti = null;
      }
    };
  }, [robotList]);

  // Draw robot with smooth movement (single robot API, kept for backward compatibility)
  useEffect(() => {
    if (!mapInstanceRef.current || !robotPosition) {
      if (layersRef.current.robot) {
        mapInstanceRef.current.removeLayer(layersRef.current.robot);
        layersRef.current.robot = null;
      }
      return;
    }

    // Create robot layer if it doesn't exist
    if (!layersRef.current.robot) {
      const robotLayer = L.layerGroup();
      layersRef.current.robot = robotLayer;
      robotLayer.addTo(mapInstanceRef.current);
    }

    // Create robot icon from image
    const singleRobotIconUrl = getIconUrl();
    
    const robotIcon = L.icon({
      iconUrl: singleRobotIconUrl,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'amr-circular-icon',
      crossOrigin: 'anonymous'
    });

    // Create or update robot marker
    if (!robotMarkerRef.current) {
      robotMarkerRef.current = L.marker([robotPosition.y, robotPosition.x], { 
        icon: robotIcon,
        zIndexOffset: 1000
      });
      layersRef.current.robot.addLayer(robotMarkerRef.current);
    } else {
      // Smooth movement animation
      const currentPos = robotMarkerRef.current.getLatLng();
      const targetPos = [robotPosition.y, robotPosition.x];
      
      // Calculate distance to determine animation duration
      const distance = Math.sqrt(
        Math.pow(targetPos[0] - currentPos.lat, 2) + 
        Math.pow(targetPos[1] - currentPos.lng, 2)
      );
      
      const duration = Math.min(Math.max(distance * 1000, 300), 1000); // 300ms to 1000ms
      
      // Animate position change
      robotMarkerRef.current.setLatLng(targetPos, {
        duration: duration,
        easeLinearity: 0.25
      });
      
      // Update icon rotation smoothly
      const currentAngle = previousPositionRef.current?.angle || robotPosition.angle;
      const angleDiff = Math.abs(robotPosition.angle - currentAngle);
      
      if (angleDiff > 0.1) { // Only animate if angle change is significant
        const iconElement = robotMarkerRef.current.getElement();
        if (iconElement) {
          const svgContainer = iconElement.querySelector('div');
          if (svgContainer) {
            svgContainer.style.transition = `transform ${duration}ms ease-in-out`;
            svgContainer.style.transform = `rotate(${robotPosition.angle * 180 / Math.PI}deg)`;
          }
        }
      }
    }

    // Store current position for next update
    previousPositionRef.current = robotPosition;
  }, [robotPosition]);

  return (
    <>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(${robotPosition?.angle ? robotPosition.angle * 180 / Math.PI : 0}deg); }
            50% { transform: translateY(-3px) rotate(${robotPosition?.angle ? robotPosition.angle * 180 / Math.PI : 0}deg); }
          }
          
          .amr-circular-icon {
            transition: all 0.3s ease-in-out;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
            background: transparent;
          }
          
          .amr-circular-icon img {
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

          .supply-point-icon:hover, .return-point-icon:hover, .regular-node-icon:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
          }
          
          .node-tooltip {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
        `}
      </style>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '1000px',
          backgroundColor: 'rgb(255, 255, 255)',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }} 
      />
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
          />
        );
      })()}
    </>
  );
};

export default LeafletMap; 