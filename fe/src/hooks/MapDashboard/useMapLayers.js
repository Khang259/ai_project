import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { smoothPathCoordinates, convertToLeafletCoordinates } from '@/utils/pathSmoothing';
import { createPathPolyline, createGlowPath } from '@/utils/mapHelpers';
import { NODE_CONFIG, PATH_CONFIG } from '@/components/Overview/map/AMRWarehouseMap/constants/mapConfig';

/**
 * Custom hook for managing map layers (paths, charge stations, etc.)
 * @param {L.Map} mapInstance - Leaflet map instance
 * @param {Object} mapData - Map data containing nodes and lines
 * @param {Object} options - Layer visibility options
 * @returns {Object} - Layers reference
 */
export const useMapLayers = (mapInstance, mapData, options = {}) => {
  const { showPaths, showChargeStations } = options;
  
  const layersRef = useRef({
    paths: null,
    chargeStations: null,
  });

  // Draw paths effect
  useEffect(() => {
    if (!mapInstance || !mapData || !showPaths) {
      if (layersRef.current.paths) {
        mapInstance.removeLayer(layersRef.current.paths);
        layersRef.current.paths = null;
      }
      return;
    }

    // Remove existing paths layer
    if (layersRef.current.paths) {
      mapInstance.removeLayer(layersRef.current.paths);
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
              // Convert path coordinates to Leaflet format
              pathCoordinates = convertToLeafletCoordinates(line.path);
            } else {
              // Fallback to straight line between nodes
              pathCoordinates = [
                [startNode.y, startNode.x],
                [endNode.y, endNode.x]
              ];
            }
            
            // Smooth the path coordinates for curved lines
            const smoothPath = smoothPathCoordinates(
              pathCoordinates, 
              PATH_CONFIG.SMOOTHING.TENSION, 
              PATH_CONFIG.SMOOTHING.NUM_SEGMENTS
            );
            
            // Create main path
            const path = createPathPolyline(smoothPath);

            // Add subtle glow effect
            const glowPath = createGlowPath(smoothPath);
            
            pathsLayer.addLayer(glowPath);
            pathsLayer.addLayer(path);
          }
        }
      });
    }

    pathsLayer.addTo(mapInstance);
    layersRef.current.paths = pathsLayer;

    // Cleanup
    return () => {
      if (layersRef.current.paths && mapInstance) {
        mapInstance.removeLayer(layersRef.current.paths);
        layersRef.current.paths = null;
      }
    };
  }, [mapInstance, mapData, showPaths]);

  // Draw charge stations effect
  useEffect(() => {
    if (!mapInstance || !mapData || !showChargeStations) {
      if (layersRef.current.chargeStations) {
        mapInstance.removeLayer(layersRef.current.chargeStations);
        layersRef.current.chargeStations = null;
      }
      return;
    }

    // Remove existing charge stations layer
    if (layersRef.current.chargeStations) {
      mapInstance.removeLayer(layersRef.current.chargeStations);
    }

    const chargeStationsLayer = L.layerGroup();

    if (mapData.nodeArr) {
      mapData.nodeArr.forEach(node => {
        // Skip nodes without required properties
        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
          return;
        }
        
        if (node.type === NODE_CONFIG.TYPES.CHARGE || 
            (node.key && node.key.includes(NODE_CONFIG.TYPES.CHARGE))) {
          // Create subtle grid nodes for background
          const circle = L.circle([node.y, node.x], {
            radius: NODE_CONFIG.CIRCLE.RADIUS,
            fillColor: NODE_CONFIG.CIRCLE.FILL_COLOR,
            color: NODE_CONFIG.CIRCLE.BORDER_COLOR,
            weight: NODE_CONFIG.CIRCLE.WEIGHT,
            opacity: NODE_CONFIG.CIRCLE.OPACITY,
            fillOpacity: NODE_CONFIG.CIRCLE.FILL_OPACITY,
            className: 'grid-node'
          });

          chargeStationsLayer.addLayer(circle);
        }
      });
    }

    chargeStationsLayer.addTo(mapInstance);
    layersRef.current.chargeStations = chargeStationsLayer;

    // Cleanup
    return () => {
      if (layersRef.current.chargeStations && mapInstance) {
        mapInstance.removeLayer(layersRef.current.chargeStations);
        layersRef.current.chargeStations = null;
      }
    };
  }, [mapInstance, mapData, showChargeStations]);

  return {
    layersRef,
  };
};
