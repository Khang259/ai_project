import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icon supply/return: kích thước gốc 32x32
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

// Kích thước icon node theo zoom (kích thước gốc base 32)
const getNodeIconSizeByZoom = (zoom, base = 32, min = 32, max = 64) =>
  Math.max(min, Math.min(max, Math.round(base * Math.pow(2, zoom))));

const NodeComponent = ({ 
  mapInstance, 
  mapData, 
  nodeStatus = {}, 
  onNodeClick,
  showNodes = true,
  nodeFilter = '',
  mapZoom = 0
}) => {
  const { t } = useTranslation();
  const nodesLayerRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapInstance || !mapData || !showNodes) {
      // Remove existing layer if exists
      if (nodesLayerRef.current) {
        mapInstance.removeLayer(nodesLayerRef.current);
        nodesLayerRef.current = null;
      }
      return;
    }


    const nodeIconSize = getNodeIconSizeByZoom(mapZoom);
    const nodeIconAnchor = nodeIconSize / 2;

    // Create new layer
    const nodesLayer = L.layerGroup();
    markersRef.current = {};
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

        // Lọc theo nodeFilter: tìm theo node.name hoặc node.key
        const filterTrim = (nodeFilter || '').trim();
        if (filterTrim) {
          const q = filterTrim.toUpperCase();
          const nameMatch = typeof node.name === 'string' && node.name.toUpperCase().includes(q);
          const keyMatch = node.key != null && String(node.key).toUpperCase().includes(q);
          if (!nameMatch && !keyMatch) return;
        }

        // Check if it's a supply point (điểm cấp): theo name DiemC hoặc node.type === 1
        if (typeof node.name === 'string' && /^DiemC\d+$/i.test(node.name.trim())) {
          const nodeId = parseInt(node.name.replace(/DiemC/i, ''));
          derivedId = nodeId;
          isLocked = nodeStatus[nodeId]?.lock || false;
          nodeIcon = L.icon({
            iconUrl: createSupplyPointIcon(isLocked),
            iconSize: [nodeIconSize, nodeIconSize],
            iconAnchor: [nodeIconAnchor, nodeIconAnchor],
            popupAnchor: [0, -nodeIconAnchor],
            className: 'supply-point-icon'
          });
          nodeType = 'supply';
        }
        // Check if it's a return point (điểm trả): theo name DiemT hoặc name chứa "XT"
        else if (typeof node.name === 'string' && /^DiemT\d+$/i.test(node.name.trim())) {
          const nodeId = parseInt(node.name.replace(/DiemT/i, ''));
          derivedId = nodeId;
          isLocked = nodeStatus[nodeId]?.lock || false;
          nodeIcon = L.icon({
            iconUrl: createReturnPointIcon(isLocked),
            iconSize: [nodeIconSize, nodeIconSize],
            iconAnchor: [nodeIconAnchor, nodeIconAnchor],
            popupAnchor: [0, -nodeIconAnchor],
            className: 'return-point-icon'
          });
          nodeType = 'return';
        }
        else if (typeof node.name === 'string' && node.name.toUpperCase().includes('XT')) {
          derivedId = node.key ?? node.id ?? index;
          isLocked = nodeStatus[derivedId]?.lock || false;
          nodeIcon = L.icon({
            iconUrl: createReturnPointIcon(isLocked),
            iconSize: [nodeIconSize, nodeIconSize],
            iconAnchor: [nodeIconAnchor, nodeIconAnchor],
            popupAnchor: [0, -nodeIconAnchor],
            className: 'return-point-icon'
          });
          nodeType = 'return';
        }
        // Theo node.type: 1 = supply, 2 = return (khi không match name DiemC/DiemT)
        else if (Number(node.type) === 1) {
          derivedId = node.key ?? node.id ?? index;
          isLocked = nodeStatus[derivedId]?.lock || false;
          nodeIcon = L.icon({
            iconUrl: createSupplyPointIcon(isLocked),
            iconSize: [nodeIconSize, nodeIconSize],
            iconAnchor: [nodeIconAnchor, nodeIconAnchor],
            popupAnchor: [0, -nodeIconAnchor],
            className: 'supply-point-icon'
          });
          nodeType = 'supply';
        }
        else if (Number(node.type) === 2) {
          derivedId = node.key ?? node.id ?? index;
          isLocked = nodeStatus[derivedId]?.lock || false;
          nodeIcon = L.icon({
            iconUrl: createReturnPointIcon(isLocked),
            iconSize: [nodeIconSize, nodeIconSize],
            iconAnchor: [nodeIconAnchor, nodeIconAnchor],
            popupAnchor: [0, -nodeIconAnchor],
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
        const typeLabel = nodeType === 'supply' ? t('map.nodeTypeSupply') : nodeType === 'return' ? t('map.nodeTypeReturn') : t('map.nodeTypeNormal');
        const statusText = isLocked ? t('map.statusLocked') : t('map.statusUnlocked');
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
              ${t('map.nodeTypeLabel')} ${typeLabel}
            </div>
            <div style="font-size: 11px; opacity: 0.8;">
              ${t('map.statusLabel')} ${statusText}
            </div>
            <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
              ${t('map.clickForDetails')}
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
        const markerKey = node.name ?? String(node.key ?? node.id ?? index);
        markersRef.current[markerKey] = marker;
        if (node.key != null) markersRef.current[String(node.key)] = marker;
        processedCount++;
      });
    }

    // Add layer to map (ensure map panes are ready)
    try {
      const openFirstTooltip = () => {
        const trimFilter = (nodeFilter || '').trim();
        if (!trimFilter || !markersRef.current) return;
        const keys = Object.keys(markersRef.current);
        if (keys.length > 0 && markersRef.current[keys[0]]) {
          try {
            markersRef.current[keys[0]].openTooltip();
          } catch (err) {
            console.warn('[NodeComponent] openTooltip failed:', err);
          }
        }
      };
      if (typeof mapInstance.whenReady === 'function') {
        mapInstance.whenReady(() => {
          try {
            nodesLayer.addTo(mapInstance);
            nodesLayerRef.current = nodesLayer;
            setTimeout(openFirstTooltip, 80);
          } catch (err) {
            console.error('[NodeComponent] Failed to add nodes layer (whenReady):', err);
          }
        });
      } else {
        nodesLayer.addTo(mapInstance);
        nodesLayerRef.current = nodesLayer;
        setTimeout(openFirstTooltip, 80);
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
      markersRef.current = {};
    };
  }, [mapInstance, mapData, nodeStatus, onNodeClick, showNodes, nodeFilter, mapZoom, t]);

  return null; // This component doesn't render anything visible
};

export default NodeComponent;