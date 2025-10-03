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
import agvIconImg from '@/assets/agv_icon_1-removebg.png';



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
  nodeRadius = 50,
  nodeStrokeWidth = 10,
  nodeFontSize = 300,
  onMapReady,
  onCameraClick
}) => {
  const [cameraStatus, setCameraStatus] = useState({});
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
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
      
      mapData.nodeArr.forEach((node) => {
        // Skip nodes without required properties
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
          return;
        }

        // Chỉ xử lý camera nodes
        if (typeof node.name === 'string' && /^Camera\d+$/i.test(node.name.trim())) {
          
          // Extract camera ID from name
          const cameraId = parseInt(node.name.replace(/Camera/i, ''));
          const isOnline = cameraStatus[cameraId]?.online || false;
        
          
          // Get camera info from config
          let ipAddress = `192.168.1.${100 + cameraId}`; // IP mặc định có file riêng để sửa sau
          
          // Tạo camera icon sử dụng hình ảnh
          const cameraIcon = L.icon({
            iconUrl: isOnline ? onlineCameraIcon : offlineCameraIcon,
            iconSize: [32, 32], // Kích thước icon
            iconAnchor: [16, 16], // Điểm neo của icon
            popupAnchor: [0, -16], // Vị trí popup so với icon
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
        }
      });
    }

    camerasLayer.addTo(mapInstanceRef.current);
    layersRef.current.cameras = camerasLayer;
  }, [mapData, showCameras, onCameraClick, cameraStatus]);

  // Sửa useEffect "Draw nodes" để loại bỏ camera logic
  useEffect(() => {

    if (!mapInstanceRef.current || !mapData || !showNodes) {
      if (layersRef.current.nodes) {
        mapInstanceRef.current.removeLayer(layersRef.current.nodes);
        layersRef.current.nodes = null;
      }
      return;
    }

    // Remove existing layers
    if (layersRef.current.nodes) {
      mapInstanceRef.current.removeLayer(layersRef.current.nodes);
    }

    const nodesLayer = L.layerGroup();

    if (mapData.nodeArr) {
      mapData.nodeArr.forEach((node, index) => {
        // Skip nodes without required properties
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
          return;
        }



        // Bỏ qua camera nodes - chúng đã được xử lý trong useEffect riêng
        if (typeof node.name === 'string' && /^Camera\d+$/i.test(node.name.trim())) {
          return;
        }

        // Chỉ xử lý regular nodes
        const isSpecial = node.type === 'special' || (node.key && node.key.includes('special'));
        
        // Create scenario event markers
        const nodeShadow = L.circle([node.y, node.x], {
          radius: 12,
          fillColor: '#000000',
          color: 'rgb(236, 230, 134)',
          weight: 0,
          opacity: 0,
          fillOpacity: 0.3,
          className: 'event-shadow'
        });

        const circle = L.circle([node.y, node.x], {
          radius: 10,
          fillColor: '#ffffff',
          color: 'rgb(218, 213, 144)',
          weight: 2,
          opacity: 1,
          fillOpacity: 1,
          className: 'event-marker'
        });

        // Add scenario event label - luôn hiển thị
        const label = L.divIcon({
          className: 'event-label',
          html: `<div style="
            color: #ffffff; 
            font-size: 11px; 
            font-weight: 500; 
            white-space: nowrap; 
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
            transform: translate(15px, -50%);
            letter-spacing: 0.5px;
          ">${node.key || 'EVENT'}</div>`,
          iconSize: [120, 20],
          iconAnchor: [0, 10]
        });
        const marker = L.marker([node.y, node.x], { icon: label });
        
        nodesLayer.addLayer(nodeShadow);
        nodesLayer.addLayer(circle);
        nodesLayer.addLayer(marker); // Luôn hiển thị label
      });
    }

    nodesLayer.addTo(mapInstanceRef.current);
    layersRef.current.nodes = nodesLayer;
  }, [mapData, showNodes, nodeRadius, nodeStrokeWidth, nodeFontSize, onCameraClick, cameraStatus]);

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
    if (!mapInstanceRef.current || !Array.isArray(robotList)) {
      if (layersRef.current.robotsMulti) {
        mapInstanceRef.current.removeLayer(layersRef.current.robotsMulti);
        layersRef.current.robotsMulti = null;
      }
      return;
    }

    // Create or reset multi-robot layer
    if (layersRef.current.robotsMulti) {
      mapInstanceRef.current.removeLayer(layersRef.current.robotsMulti);
    }
    const robotsLayer = L.layerGroup();

    try {
      console.log('[MAP] render robots count:', robotList.length);
    } catch {}

    robotList.forEach((bot, idx) => {
      // Extract position; adjust if your data fields differ
      const pos = bot.devicePositionParsed || bot.devicePosition || bot.position || null;
      // Expect pos like { x, y } or [y, x]
      let y, x;
      if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos) {
        x = pos.x; y = pos.y;
      } else if (Array.isArray(pos) && pos.length >= 2) {
        y = pos[0]; x = pos[1];
      } else {
        return; // skip if no position
      }

      const angleRad = typeof bot.angle === 'number' ? bot.angle : 0;

      const icon = L.icon({
        iconUrl: agvIconImg,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: 'amr-circular-icon'
      });

      const marker = L.marker([y, x], { icon, zIndexOffset: 900 });
      marker.bindTooltip(
        `<div style="font-size:12px;">
          <div><b>${bot.device_name || bot.deviceName || bot.device_code || bot.deviceCode || 'AGV'}</b></div>
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
    const robotIcon = L.icon({
      iconUrl: agvIconImg,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'amr-circular-icon'
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
          }
          
          .amr-circular-icon:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 6px 20px rgba(0,0,0,0.9));
          }

          .camera-marker-icon {
            filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));
            transition: all 0.3s ease-in-out;
          }
          
          .camera-marker-icon:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
          }
          
          .camera-tooltip {
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
    </>
  );
};

export default LeafletMap; 