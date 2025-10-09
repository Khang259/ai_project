import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createSupplyPointIcon = (isLocked = false) => {
  const lockIcon = isLocked ? '🔒' : '📦';
  
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <text x="16" y="20" text-anchor="middle" font-size="12" fill="white">${lockIcon}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

// Tạo SVG icon cho điểm trả (màu đỏ)
const createReturnPointIcon = (isLocked = false) => {
  const lockIcon = isLocked ? '🔒' : '↩️';
  
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <text x="16" y="20" text-anchor="middle" font-size="12" fill="white">${lockIcon}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const NodeComponent = ({ 
  mapInstance, 
  mapData, 
  nodeStatus = {}, 
  onNodeClick,
  showNodes = true 
}) => {
  const nodesLayerRef = useRef(null);

  useEffect(() => {
    if (!mapInstance || !mapData || !showNodes) {
      console.log('[NodeComponent] Early return due to missing deps', {
        hasMap: !!mapInstance,
        hasMapData: !!mapData,
        showNodes
      });
      // Remove existing layer if exists
      if (nodesLayerRef.current) {
        mapInstance.removeLayer(nodesLayerRef.current);
        nodesLayerRef.current = null;
      }
      return;
    }


    // Create new layer
    const nodesLayer = L.layerGroup();
    if (mapData.nodeArr) {
      let processedCount = 0;
      
      mapData.nodeArr.forEach((node, index) => {
        // Determine node type and create appropriate icon
        let nodeIcon;
        let nodeType = 'unknown';
        let isLocked = false;
        let derivedId = null; // always derive id for DiemC/T so key is not required

        // Guard: must have coordinates
        if (node == null || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
          return;
        }

        // Check if it's a supply point (điểm cấp)
        if (typeof node.name === 'string' && /^DiemC\d+$/i.test(node.name.trim())) {
          const nodeId = parseInt(node.name.replace(/DiemC/i, ''));
          derivedId = nodeId;
          isLocked = nodeStatus[nodeId]?.lock || false;
          nodeIcon = L.icon({
            iconUrl: createSupplyPointIcon(isLocked),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
            className: 'supply-point-icon'
          });
          nodeType = 'supply';
        }
        // Check if it's a return point (điểm trả)
        else if (typeof node.name === 'string' && /^DiemT\d+$/i.test(node.name.trim())) {
          const nodeId = parseInt(node.name.replace(/DiemT/i, ''));
          derivedId = nodeId;
          isLocked = nodeStatus[nodeId]?.lock || false;
          nodeIcon = L.icon({
            iconUrl: createReturnPointIcon(isLocked),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
            className: 'return-point-icon'
          });
          nodeType = 'return';
        }

        // Only render markers for supply/return; skip others
        if (!nodeIcon) {
          return;
        }

        // Create marker
        const marker = L.marker([node.y, node.x], { icon: nodeIcon });

        // Create tooltip content
        const tooltipContent = `
          <div style="
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 1px solid ${isLocked ? '#ff6b6b' : (nodeType === 'supply' ? '#52c41a' : '#ff4d4f')};
            min-width: 120px;
          ">
            <div style="margin-bottom: 4px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isLocked ? '#ff6b6b' : (nodeType === 'supply' ? '#52c41a' : '#ff4d4f')}; display: inline-block;"></span>
              ${node.name || `Node ${node.key || 'Unknown'}`}
            </div>
            <div style="font-size: 11px; opacity: 0.9; margin-bottom: 2px;">
              Loại: ${nodeType === 'supply' ? 'Điểm cấp' : nodeType === 'return' ? 'Điểm trả' : 'Điểm thường'}
            </div>
            <div style="font-size: 11px; opacity: 0.8;">
              Trạng thái: ${isLocked ? '🔒 Bị khóa' : '🔓 Mở'}
            </div>
            <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
              Click để xem chi tiết
            </div>
          </div>
        `;

        // Bind tooltip
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          offset: [0, -20],
          className: 'node-tooltip'
        });

        // Add click event
        marker.on('click', () => {
          const nodeInfo = {
            id: derivedId ?? node.key ?? node.id,
            name: node.name,
            type: nodeType,
            position: { x: node.x, y: node.y },
            isLocked: isLocked,
            nodeData: node
          };

          console.log('Node clicked:', nodeInfo);
          
          if (onNodeClick) {
            onNodeClick(nodeInfo);
          }
        });

        nodesLayer.addLayer(marker);
        processedCount++;
      });
    }

    // Add layer to map (ensure map panes are ready)
    try {
      if (typeof mapInstance.whenReady === 'function') {
        mapInstance.whenReady(() => {
          try {
            nodesLayer.addTo(mapInstance);
            nodesLayerRef.current = nodesLayer;
            console.log('[NodeComponent] Nodes layer added (whenReady)');
          } catch (err) {
            console.error('[NodeComponent] Failed to add nodes layer (whenReady):', err);
          }
        });
      } else {
        nodesLayer.addTo(mapInstance);
        nodesLayerRef.current = nodesLayer;
        console.log('[NodeComponent] Nodes layer added');
      }
    } catch (e) {
      console.error('[NodeComponent] Error adding nodes layer:', e);
    }
    // Cleanup function
    return () => {
      if (nodesLayerRef.current) {
        mapInstance.removeLayer(nodesLayerRef.current);
        nodesLayerRef.current = null;
      }
    };
  }, [mapInstance, mapData, nodeStatus, onNodeClick, showNodes]);

  return null; // This component doesn't render anything visible
};

export default NodeComponent;