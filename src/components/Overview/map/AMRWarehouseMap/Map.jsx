import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
// import cameraStatusService from '../../services/cameraStatusService'; dùng khi kiểm tra trạng thái của camera thêm sau
// import cameraConfig from '../../config/cameras'; cấu hình tĩnh cài đặt của camera thêm sau


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
  securityConfig,
  robotPosition,
  showNodes,
  showPaths,
  showChargeStations,
  selectedAvoidanceMode,
  nodeRadius = 50,
  nodeStrokeWidth = 10,
  nodeFontSize = 300,
  onMapReady,
  onCameraClick
}) => {
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [cameraStatus, setCameraStatus] = useState({});
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const robotMarkerRef = useRef(null);
  const previousPositionRef = useRef(null);
  const layersRef = useRef({
    grid: null,
    paths: null,
    nodes: null,
    nodeLabels: null,
    chargeStations: null,
    robot: null
  });

  // Fetch camera status from backend using service (temporarily disabled until service is provided)
  // useEffect(() => {
  //   // Start polling for camera status
  //   cameraStatusService.startPolling(30000);

  //   // Add listener for status updates
  //   const unsubscribe = cameraStatusService.addListener((status) => {
  //     setCameraStatus(status);
  //   });

  //   return () => {
  //     cameraStatusService.stopPolling();
  //     unsubscribe();
  //   };
  // }, []);

  useEffect(() => {
    if (!mapRef.current || !mapData) return;

    console.log('Initializing Leaflet map with data:', {
      width: mapData.width,
      height: mapData.height,
      nodeCount: mapData.nodeArr?.length || 0,
      lineCount: mapData.lineArr?.length || 0
    });

    // Initialize map with modern configuration
    const map = L.map(mapRef.current, {
      crs: L.CRS.Simple,
      minZoom: -10,
      maxZoom: 4,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true, // Use canvas renderer for better performance
      renderer: L.canvas({ padding: 0.5 }), // Optimize canvas rendering
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 60,
      tap: false, // Disable tap for better mobile experience
      bounceAtZoomLimits: false,
      worldCopyJump: false,
      maxBoundsViscosity: 1.0
    });

    // Enhanced bounds calculation with proper padding
    const bounds = [
      [0, 0],
      [mapData.height, mapData.width]
    ];
    
    // Fit bounds with modern options
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 1,
      animate: true,
      duration: 0.5
    });

    mapInstanceRef.current = map;

    // Add zoom control to top right
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Add custom toggle button for node labels
    const ToggleLabelsControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
        const button = L.DomUtil.create('a', '', container);
        button.href = '#';
        button.title = 'Bật/tắt tên nodes';
        button.innerHTML = '<span style="font-weight: bold; font-size: 12px;">ABC</span>';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.lineHeight = '30px';
        button.style.textAlign = 'center';
        button.style.textDecoration = 'none';
        button.style.color = '#333';
        
        L.DomEvent.on(button, 'click', function (e) {
          L.DomEvent.preventDefault(e);
          setShowNodeLabels(prev => !prev);
          if (button.style.textDecoration === 'line-through') {
            button.style.textDecoration = 'none';
            button.title = 'Ẩn tên nodes';
          } else {
            button.style.textDecoration = 'line-through';
            button.title = 'Hiện tên nodes';
          }
        });
        
        return container;
      }
    });
    
    new ToggleLabelsControl().addTo(map);

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

  // Draw nodes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapData || !showNodes) {
      if (layersRef.current.nodes) {
        mapInstanceRef.current.removeLayer(layersRef.current.nodes);
        layersRef.current.nodes = null;
      }
      if (layersRef.current.nodeLabels) {
        mapInstanceRef.current.removeLayer(layersRef.current.nodeLabels);
        layersRef.current.nodeLabels = null;
      }
      return;
    }

    // Remove existing layers
    if (layersRef.current.nodes) {
      mapInstanceRef.current.removeLayer(layersRef.current.nodes);
    }
    if (layersRef.current.nodeLabels) {
      mapInstanceRef.current.removeLayer(layersRef.current.nodeLabels);
    }

    const nodesLayer = L.layerGroup();
    const nodeLabelsLayer = L.layerGroup();

    if (mapData.nodeArr) {
      console.log('Drawing nodes, count:', mapData.nodeArr.length);
      mapData.nodeArr.forEach((node, index) => {
        // Skip nodes without required properties
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
          console.warn('Skipping node with missing coordinates:', node);
          return;
        }

        // Nếu là node camera (name bắt đầu bằng 'Camera')
        // if (typeof node.name === 'string' && /^Camera\d+$/i.test(node.name.trim())) {
        //   // Extract camera ID from name
        //   const cameraId = parseInt(node.name.replace(/Camera/i, ''));
        //   const isOnline = cameraStatus[cameraId]?.online || false;
          
        //   // Get camera info from config
        //   const cameraInfo = cameraConfig.find(cam => cam.id === cameraId);
        //   let ipAddress = 'Unknown';
          
        //   if (cameraInfo && cameraInfo.rtsp) {
        //     // Extract IP from RTSP URL
        //     const rtspMatch = cameraInfo.rtsp.match(/@([^:\/]+):?(\d+)?/);
        //     if (rtspMatch) {
        //       ipAddress = rtspMatch[2] ? `${rtspMatch[1]}:${rtspMatch[2]}` : `${rtspMatch[1]}:554`;
        //     }
        //   }
          
        //   // Vẽ marker camera với thiết kế thực tế và màu sắc dựa trên trạng thái
        //   const cameraIcon = L.divIcon({
        //     className: 'camera-marker',
        //     html: `<div style="
        //       width: 26px; 
        //       height: 26px; 
        //       display: flex; 
        //       align-items: center; 
        //       justify-content: center;
        //       filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));
        //     ">
        //       <svg width="22" height="22" viewBox="0 0 100 100" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.8));">
        //         <!-- Camera body -->
        //         <rect x="25" y="30" width="50" height="40" rx="6" ry="6" fill="${isOnline ? '#52c41a' : '#ff4d4f'}" stroke="${isOnline ? '#389e0d' : '#cf1322'}" stroke-width="2"/>
        //         <!-- Camera lens -->
        //         <circle cx="50" cy="50" r="12" fill="${isOnline ? '#389e0d' : '#cf1322'}" stroke="${isOnline ? '#52c41a' : '#ff4d4f'}" stroke-width="2"/>
        //         <!-- Inner lens -->
        //         <circle cx="50" cy="50" r="8" fill="#001529" stroke="${isOnline ? '#389e0d' : '#cf1322'}" stroke-width="1"/>
        //         <!-- Camera mount -->
        //         <rect x="40" y="70" width="20" height="8" rx="2" ry="2" fill="${isOnline ? '#389e0d' : '#cf1322'}" stroke="${isOnline ? '#52c41a' : '#ff4d4f'}" stroke-width="1"/>
        //         <!-- Status indicator -->
        //         <circle cx="70" cy="35" r="3" fill="${isOnline ? '#52c41a' : '#ff4d4f'}" stroke="${isOnline ? '#52c41a' : '#ff4d4f'}" stroke-width="1"/>
        //         <!-- Recording indicator -->
        //         <circle cx="30" cy="35" r="2" fill="${isOnline ? '#52c41a' : '#ff4d4f'}" stroke="${isOnline ? '#52c41a' : '#ff4d4f'}" stroke-width="1">
        //           <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
        //         </circle>
        //       </svg>
        //     </div>`,
        //     iconSize: [26, 26],
        //     iconAnchor: [13, 13]
        //   });
        //   const marker = L.marker([node.y, node.x], { icon: cameraIcon });
          
        //   // Add tooltip with IP address
        //   marker.bindTooltip(`<div style="
        //     background: rgba(0, 0, 0, 0.9);
        //     color: white;
        //     padding: 8px 12px;
        //     border-radius: 4px;
        //     font-size: 13px;
        //     font-weight: 500;
        //     box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        //     border: 1px solid ${isOnline ? '#52c41a' : '#ff4d4f'};
        //   ">
        //     <div style="margin-bottom: 4px; font-weight: 600;">${node.name}</div>
        //     <div style="display: flex; align-items: center; gap: 6px;">
        //       <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? '#52c41a' : '#ff4d4f'}; display: inline-block;"></span>
        //       <span>${ipAddress}</span>
        //     </div>
        //     <div style="margin-top: 4px; font-size: 11px; opacity: 0.8;">
        //       Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}
        //     </div>
        //   </div>`, {
        //     permanent: false,
        //     direction: 'top',
        //     offset: [0, -20],
        //     className: 'camera-tooltip'
        //   });
          
        //   if (onCameraClick) {
        //     marker.on('click', () => onCameraClick(node.name.replace('Camera', '')));
        //   }
        //   nodesLayer.addLayer(marker);
        //   return;
        // }

        // ... vẽ node thường như cũ
        const isSpecial = node.type === 'special' || (node.key && node.key.includes('special'));
        const color = isSpecial ? '#f87171' : '#34d399';
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
        // Add scenario event label
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
        if (showNodeLabels) {
          nodeLabelsLayer.addLayer(marker);
        }
      });
    }

    nodesLayer.addTo(mapInstanceRef.current);
    layersRef.current.nodes = nodesLayer;
    
    if (showNodeLabels) {
      nodeLabelsLayer.addTo(mapInstanceRef.current);
      layersRef.current.nodeLabels = nodeLabelsLayer;
    }
  }, [mapData, showNodes, nodeRadius, nodeStrokeWidth, nodeFontSize, showNodeLabels, onCameraClick, cameraStatus]);

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

  // Draw robot with smooth movement
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

    // Create AMR circular icon with enhanced animations
    const robotIcon = L.divIcon({
      className: 'amr-circular-icon',
      html: `<div style="
        width: 36px; 
        height: 36px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        transform: rotate(${robotPosition.angle * 180 / Math.PI}deg);
        filter: drop-shadow(0 4px 16px rgba(0,0,0,0.9));
        transition: all 0.3s ease-in-out;
        animation: float 3s ease-in-out infinite;
      ">
        <svg width="32" height="32" viewBox="0 0 100 100">
          <!-- Outer pulsing glow -->
          <circle cx="50" cy="50" r="45" fill="none" stroke="#000099" stroke-width="2" opacity="0.6">
            <animate attributeName="r" values="45;50;45" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Inner pulsing glow -->
          <circle cx="50" cy="50" r="35" fill="none" stroke="#000099" stroke-width="1.5" opacity="0.8">
            <animate attributeName="r" values="35;40;35" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Main robot circle with breathing effect -->
          <circle cx="50" cy="50" r="25" fill="#000099" stroke="#ffffff" stroke-width="3">
            <animate attributeName="r" values="25;27;25" dur="2s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Direction indicator -->
          <circle cx="50" cy="50" r="15" fill="#ffffff" stroke="#000099" stroke-width="2"/>
          
          <!-- Center dot with pulse -->
          <circle cx="50" cy="50" r="6" fill="#000099" stroke="#ffffff" stroke-width="1">
            <animate attributeName="r" values="6;8;6" dur="1s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Direction arrow with rotation -->
          <polygon points="50,20 45,35 55,35" fill="#ffffff" stroke="#000099" stroke-width="1">
            <animateTransform attributeName="transform" type="rotate" values="0 50 50;5 50 50;0 50 50" dur="2s" repeatCount="indefinite"/>
          </polygon>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
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
        `}
      </style>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '750px',
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