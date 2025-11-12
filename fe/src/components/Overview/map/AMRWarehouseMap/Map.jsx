import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
// Import camera images
// Camera layer moved to dedicated component
import Camera from '../camera/Camera';
import { getCamerasByArea } from '@/services/camera-settings';
import { useArea } from "@/contexts/AreaContext";
// Import NodeComponent
import NodeComponent from './Node';
// MapFilters is handled in parent AMRWarehouseMap component

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

// Camera icon sizing handled inside Camera component

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
  onNodeClick,
  cameraFilter, // Thêm prop từ parent
}) => {
  const [cameraStatus, setCameraStatus] = useState({});
  const [nodeStatus, setNodeStatus] = useState({});
  const { currAreaId } = useArea();
  const [camerasData, setCamerasData] = useState([]);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapInstanceState, setMapInstanceState] = useState(null);
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
      onMapReady(map, mapData);
    }

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
          className='map-wrapper'
          ref={mapRef} 
          style={{
            width: '100%',
            height: '40vh',
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
          />
        );
      })()}
    </>
  );
};

export default LeafletMap; 