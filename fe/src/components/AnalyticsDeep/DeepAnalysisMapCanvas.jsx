/**
 * Component vẽ bản đồ cho Phân tích chuyên sâu.
 * Giống hệt trang Bản đồ kho khi tắt hết filter: chỉ có đường (lineArr), không điểm/camera/robot.
 * Dùng cùng CSS và logic vẽ path như Map.jsx. Không import từ AMRWarehouseMap.
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_ZOOM = 0;

// Helper giống Map.jsx — làm mượt đường path
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

const smoothPathCoordinates = (coordinates, tension = 0.3, numSegments = 5) => {
  if (coordinates.length < 2) return coordinates;
  if (coordinates.length === 2) return coordinates;
  const smoothed = [coordinates[0]];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p0 = coordinates[Math.max(0, i - 1)];
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const p3 = coordinates[Math.min(coordinates.length - 1, i + 2)];
    for (let j = 1; j <= numSegments; j++) {
      const t = j / numSegments;
      smoothed.push(catmullRomSpline(p0, p1, p2, p3, t * tension));
    }
  }
  smoothed.push(coordinates[coordinates.length - 1]);
  return smoothed;
};

/** CSS giống trang Bản đồ kho khi tắt filter (chỉ đường, không điểm) */
const MAP_WRAPPER_STYLES = `
  .deep-analysis-map-wrapper.map-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 200px;
    background: #1a1a1a;
    border-radius: 8px;
    overflow: hidden;
  }
  .deep-analysis-map-wrapper .leaflet-container {
    background: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .deep-analysis-map-wrapper .scenario-path {
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .deep-analysis-map-wrapper .path-glow {
    pointer-events: none;
    filter: blur(2px);
  }
  .deep-analysis-map-wrapper .map-wrapper::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .deep-analysis-map-wrapper .map-wrapper::-webkit-scrollbar-track {
    background: #1a1a1a;
  }
  .deep-analysis-map-wrapper .map-wrapper::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
  .deep-analysis-map-wrapper .map-wrapper::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  .wait-spot-tooltip {
    background: rgba(20, 20, 20, 0.93) !important;
    border: 1px solid #FFD600 !important;
    color: #FFD600 !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    padding: 6px 12px !important;
    border-radius: 7px !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.6) !important;
    white-space: nowrap !important;
    min-width: 80px !important;
  }
  .wait-spot-tooltip::before {
    border-top-color: #FFD600 !important;
  }
  .leaflet-tooltip.wait-spot-tooltip {
    pointer-events: none !important;
  }
  .task-point-tooltip {
    background: rgba(15, 17, 26, 0.96) !important;
    border: none !important;
    padding: 0 !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.7) !important;
    pointer-events: none !important;
  }
  .task-point-tooltip::before {
    display: none !important;
  }
  .task-point-tooltip-inner {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 7px 13px;
    border-radius: 8px;
    border-left: 3px solid var(--tp-color, #00e676);
  }
  .task-point-tooltip-inner .tp-role {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--tp-color, #00e676);
    opacity: 0.85;
  }
  .task-point-tooltip-inner .tp-name {
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    white-space: nowrap;
  }
`;

export default function DeepAnalysisMapCanvas({ mapData, robotPath = [], waitSpots = [], taskPoints = [], mapHeight = '100%', className = '', style = {} }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pathsLayerRef = useRef(null);
  const robotPathLayerRef = useRef(null);
  const waitSpotsLayerRef = useRef(null);
  const taskPointsLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !mapData?.width || !mapData?.height) return;

    const w = Number(mapData.width) || 300000;
    const h = Number(mapData.height) || 300000;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      renderer: L.canvas({ padding: 0.5 }),
      tap: false,
    });

    map.options.minZoom = -10;
    map.options.maxZoom = 5;
    map.options.zoomSnap = 0.1;
    map.options.zoomDelta = 0.25;
    map.options.wheelPxPerZoomLevel = 120;
    map.options.bounceAtZoomLimits = false;
    map.options.worldCopyJump = false;
    map.options.maxBoundsViscosity = 1.0;

    const bounds = [
      [0, 0],
      [h, w],
    ];
    const center = [h / 2, w / 2];
    map.setView(center, DEFAULT_ZOOM);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: DEFAULT_ZOOM });

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (pathsLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(pathsLayerRef.current);
        pathsLayerRef.current = null;
      }
      if (robotPathLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(robotPathLayerRef.current);
        robotPathLayerRef.current = null;
      }
      if (waitSpotsLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(waitSpotsLayerRef.current);
        waitSpotsLayerRef.current = null;
      }
      if (taskPointsLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(taskPointsLayerRef.current);
        taskPointsLayerRef.current = null;
      }
      mapRef.current?.off();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mapData?.width, mapData?.height]);

  // Vẽ đường (lineArr) giống Map.jsx — trạng thái "tắt hết filter" chỉ còn mạng đường
  useEffect(() => {
    if (!mapRef.current || !mapData?.lineArr || !Array.isArray(mapData.lineArr)) return;

    if (pathsLayerRef.current) {
      mapRef.current.removeLayer(pathsLayerRef.current);
      pathsLayerRef.current = null;
    }

    const pathsLayer = L.layerGroup();
    const nodeArr = mapData.nodeArr || [];

    const findNodeByLineKey = (node, lineKey) => {
      if (!node) return false;
      const keyStr = String(lineKey).trim();
      return String(node.key) === String(lineKey)
        || (node.name != null && String(node.name).trim() === keyStr);
    };

    mapData.lineArr.forEach((line) => {
      if (!line.startNode || !line.endNode) return;
      const startNode = nodeArr.find((n) => findNodeByLineKey(n, line.startNode));
      const endNode = nodeArr.find((n) => findNodeByLineKey(n, line.endNode));
      if (!startNode || !endNode ||
          typeof startNode.x === 'undefined' || typeof startNode.y === 'undefined' ||
          typeof endNode.x === 'undefined' || typeof endNode.y === 'undefined') return;

      let pathCoordinates;
      if (line.path && Array.isArray(line.path) && line.path.length > 0) {
        pathCoordinates = line.path.map((coord) => [coord[1], coord[0]]);
      } else {
        pathCoordinates = [
          [startNode.y, startNode.x],
          [endNode.y, endNode.x],
        ];
      }

      const smoothPath = smoothPathCoordinates(pathCoordinates);

      const path = L.polyline(smoothPath, {
        color: 'rgb(17, 223, 223)',
        weight: 3,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        smoothFactor: 1,
        className: 'scenario-path',
      });
      const glowPath = L.polyline(smoothPath, {
        color: '#ffffff',
        weight: 4,
        opacity: 0.1,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'path-glow',
      });
      pathsLayer.addLayer(glowPath);
      pathsLayer.addLayer(path);
    });

    pathsLayer.addTo(mapRef.current);
    pathsLayerRef.current = pathsLayer;

    return () => {
      if (pathsLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(pathsLayerRef.current);
        pathsLayerRef.current = null;
      }
    };
  }, [mapData?.lineArr, mapData?.nodeArr, mapReady]);

  // Vẽ đường đi robot (robotPath: mảng device_position key) lên trên lớp bản đồ
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Luôn xoá layer cũ
    if (robotPathLayerRef.current) {
      mapRef.current.removeLayer(robotPathLayerRef.current);
      robotPathLayerRef.current = null;
    }

    if (!robotPath || robotPath.length < 2) return;

    const nodeArr = mapData?.nodeArr || [];

    const findNode = (posKey) => {
      const k = String(posKey).trim();
      return nodeArr.find(
        (n) => String(n.key) === k || (n.name != null && String(n.name).trim() === k),
      );
    };

    // Lọc và chuyển sang tọa độ [y, x] (lat, lng trong CRS.Simple)
    const coords = robotPath
      .map((pos) => findNode(pos))
      .filter((n) => n && typeof n.x !== 'undefined' && typeof n.y !== 'undefined')
      .map((n) => [n.y, n.x]);

    if (coords.length < 2) return;

    const layer = L.layerGroup();

    // Lớp glow phía dưới — màu đỏ
    const glow = L.polyline(coords, {
      color: '#ff1a1a',
      weight: 10,
      opacity: 0.22,
      lineCap: 'round',
      lineJoin: 'round',
      className: 'robot-path-glow',
    });

    // Đường chính màu đỏ rực
    const line = L.polyline(coords, {
      color: '#ff2222',
      weight: 4,
      opacity: 0.97,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: '12 6',
      className: 'robot-path-line',
    });

    layer.addLayer(glow);
    layer.addLayer(line);

    // Vẽ chấm xanh tại điểm cuối cùng
    const lastCoord = coords[coords.length - 1];
    const endDot = L.circleMarker(lastCoord, {
      radius: 10,
      color: '#00c853',
      fillColor: '#00e676',
      fillOpacity: 0.95,
      weight: 2,
      className: 'robot-path-dot',
    });
    layer.addLayer(endDot);

    // Hình ảnh AMR tại điểm đầu (coords[0])
    const amrIcon = L.icon({
      iconUrl: '/assets/amr_co_tai.png',
      iconSize: [52, 52],
      iconAnchor: [26, 26],
      className: 'robot-amr-icon',
    });
    const amrMarker = L.marker(coords[0], { icon: amrIcon, zIndexOffset: 1000 });
    layer.addLayer(amrMarker);

    layer.addTo(mapRef.current);
    robotPathLayerRef.current = layer;

    return () => {
      if (robotPathLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(robotPathLayerRef.current);
        robotPathLayerRef.current = null;
      }
    };
  }, [robotPath, mapData?.nodeArr, mapReady]);

  // Vẽ chấm vàng tại các điểm robot đứng chờ kèm tooltip thời gian
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (waitSpotsLayerRef.current) {
      mapRef.current.removeLayer(waitSpotsLayerRef.current);
      waitSpotsLayerRef.current = null;
    }

    if (!waitSpots || waitSpots.length === 0) return;

    const nodeArr = mapData?.nodeArr || [];
    const findNode = (posKey) => {
      const k = String(posKey).trim();
      return nodeArr.find(
        (n) => String(n.key) === k || (n.name != null && String(n.name).trim() === k),
      );
    };

    const layer = L.layerGroup();

    waitSpots.forEach(({ posKey, duration, alarmCodes = [] }) => {
      const node = findNode(posKey);
      if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') return;

      const coord = [node.y, node.x];
      const totalSec = Math.round(duration);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const timeLabel = m > 0 ? `${m} phút ${s > 0 ? s + ' giây' : ''}`.trim() : `${s} giây`;

      const hasAlarms = Array.isArray(alarmCodes) && alarmCodes.length > 0;

      // Vòng sáng bên ngoài — đỏ cam nếu có cảnh báo, vàng nếu không
      const glowColor = hasAlarms ? '#FF6B35' : '#FFD600';
      const glow = L.circleMarker(coord, {
        radius: hasAlarms ? 16 : 14,
        color: glowColor,
        fillColor: glowColor,
        fillOpacity: 0.2,
        weight: 0,
        className: 'wait-spot-glow',
      });

      // Chấm chính
      const dot = L.circleMarker(coord, {
        radius: hasAlarms ? 9 : 8,
        color: hasAlarms ? '#CC4400' : '#B8860B',
        fillColor: hasAlarms ? '#FF6B35' : '#FFD600',
        fillOpacity: 0.95,
        weight: 2,
        className: 'wait-spot-dot',
      });

      // Tooltip: thời gian chờ + danh sách alarm_code nếu có
      const alarmLines = hasAlarms
        ? `<div style="margin-top:4px;border-top:1px solid rgba(255,107,53,0.4);padding-top:4px">${
            alarmCodes.map(c => `<div style="color:#FF6B35;font-weight:700">${c}</div>`).join('')
          }</div>`
        : '';
      dot.bindTooltip(
        `<div>⏱ Chờ: ${timeLabel}${alarmLines}</div>`,
        {
          permanent: false,
          direction: 'top',
          offset: [0, -10],
          className: 'wait-spot-tooltip',
        },
      );

      layer.addLayer(glow);
      layer.addLayer(dot);
    });

    layer.addTo(mapRef.current);
    waitSpotsLayerRef.current = layer;

    return () => {
      if (waitSpotsLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(waitSpotsLayerRef.current);
        waitSpotsLayerRef.current = null;
      }
    };
  }, [waitSpots, mapData?.nodeArr, mapReady]);

  // Vẽ icon Start/End từ task_path lên bản đồ
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (taskPointsLayerRef.current) {
      mapRef.current.removeLayer(taskPointsLayerRef.current);
      taskPointsLayerRef.current = null;
    }

    if (!taskPoints || taskPoints.length === 0) return;

    const nodeArr = mapData?.nodeArr || [];
    const findNode = (nodeId) => {
      const k = String(nodeId).trim();
      return nodeArr.find(
        (n) => String(n.key) === k || (n.name != null && String(n.name).trim() === k),
      );
    };

    const layer = L.layerGroup();

    taskPoints.forEach(({ nodeId, role }) => {
      const node = findNode(nodeId);
      if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') return;

      const coord = [node.y, node.x];
      const isStart = role === 'start';
      const nodeName = node.name || String(nodeId);

      // Màu: start = xanh lá, end = cam đỏ
      const color = isStart ? '#00e676' : '#ff6b35';
      const borderColor = isStart ? '#00a152' : '#cc4400';
      const label = isStart ? 'S' : 'E';
      const roleLabel = isStart ? 'Điểm xuất phát' : 'Điểm đến';

      const tooltipHtml = `
        <div class="task-point-tooltip-inner" style="--tp-color:${color}">
          <span class="tp-role">${roleLabel}</span>
          <span class="tp-name">${nodeName}</span>
        </div>`;

      // Vòng glow bên ngoài
      L.circleMarker(coord, {
        radius: 18,
        color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 0,
        className: 'task-point-glow',
      }).addTo(layer);

      // Chấm chính — tooltip hiển thị tên node
      L.circleMarker(coord, {
        radius: 10,
        color: borderColor,
        fillColor: color,
        fillOpacity: 0.95,
        weight: 2.5,
        className: 'task-point-dot',
      }).bindTooltip(tooltipHtml, {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
        className: 'task-point-tooltip',
      }).addTo(layer);

      // Label S / E ở trung tâm dùng divIcon
      const icon = L.divIcon({
        html: `<div style="
          width:20px;height:20px;
          background:${color};
          border:2.5px solid ${borderColor};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:800;color:#0b0f1a;
          box-shadow:0 0 8px ${color}99;
          font-family:monospace;
        ">${label}</div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker(coord, { icon, zIndexOffset: 900 }).addTo(layer);
    });

    layer.addTo(mapRef.current);
    taskPointsLayerRef.current = layer;

    return () => {
      if (taskPointsLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(taskPointsLayerRef.current);
        taskPointsLayerRef.current = null;
      }
    };
  }, [taskPoints, mapData?.nodeArr, mapReady]);

  if (!mapData) return null;

  return (
    <>
      <style>{MAP_WRAPPER_STYLES}</style>
      <div
        ref={containerRef}
        className={`deep-analysis-map-wrapper map-wrapper ${className}`.trim()}
        style={{
          width: '100%',
          height: mapHeight || '100%',
          position: 'relative',
          ...style,
        }}
        aria-label="Bản đồ khu vực"
      />
    </>
  );
}
