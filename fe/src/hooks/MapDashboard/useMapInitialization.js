import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '@/components/Overview/map/AMRWarehouseMap/constants/mapConfig';

/**
 * Custom hook for initializing and managing Leaflet map instance
 * @param {Object} mapData - Map data containing nodes and lines
 * @param {Function} onMapReady - Callback when map is ready
 * @returns {Object} - Map references and state
 */
export const useMapInitialization = (mapData, onMapReady) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapInstanceState, setMapInstanceState] = useState(null);

  useEffect(() => {
    if (!mapRef.current || !mapData) return;

    // Initialize map with configuration
    const mapOptions = {
      crs: L.CRS.Simple,
      zoomControl: MAP_CONFIG.INIT_OPTIONS.zoomControl,
      attributionControl: MAP_CONFIG.INIT_OPTIONS.attributionControl,
      preferCanvas: MAP_CONFIG.INIT_OPTIONS.preferCanvas,
      renderer: L.canvas({ padding: MAP_CONFIG.RENDERER_OPTIONS.padding }),
      tap: MAP_CONFIG.INIT_OPTIONS.tap,
    };

    const map = L.map(mapRef.current, mapOptions);

    // Store references
    mapInstanceRef.current = map;
    setMapInstanceState(map);

    // Store map data reference for reset functionality
    if (onMapReady) {
      map._mapData = mapData;
      onMapReady(map, mapData);
    }

    // Cleanup function
    return () => {
      if (map) {
        try {
          // Clear all layers before removing map
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

  return {
    mapRef,
    mapInstanceRef,
    mapInstanceState,
  };
};
