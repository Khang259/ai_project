import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  getIconUrl, 
  createRobotIcon, 
  getSimpleRobotIcon 
} from '@/utils/iconCreators';
import { 
  extractRobotPosition, 
  createRobotTooltip, 
  calculateAnimationDuration 
} from '@/utils/mapHelpers';
import { ROBOT_CONFIG } from '@/components/Overview/map/AMRWarehouseMap/constants/mapConfig';

/**
 * Custom hook for tracking and displaying robots on the map
 * @param {L.Map} mapInstance - Leaflet map instance
 * @param {Object} robotPosition - Single robot position data
 * @param {Array} robotList - List of multiple robots
 * @returns {Object} - Robot tracking state and methods
 */
export const useRobotTracking = (mapInstance, robotPosition, robotList) => {
  const robotMarkerRef = useRef(null);
  const previousPositionRef = useRef(null);
  const layersRef = useRef({
    robot: null,
    robotsMulti: null
  });

  // Handle single robot tracking
  useEffect(() => {
    if (!mapInstance || !robotPosition) {
      if (layersRef.current.robot) {
        mapInstance.removeLayer(layersRef.current.robot);
        layersRef.current.robot = null;
      }
      return;
    }

    // Create robot layer if it doesn't exist
    if (!layersRef.current.robot) {
      const robotLayer = L.layerGroup();
      layersRef.current.robot = robotLayer;
      robotLayer.addTo(mapInstance);
    }

    // Create robot icon
    const singleRobotIconUrl = getIconUrl();
    const robotIcon = createRobotIcon(
      singleRobotIconUrl,
      ROBOT_CONFIG.ICON_SIZE.SINGLE,
      ROBOT_CONFIG.ICON_ANCHOR.SINGLE,
      'amr-circular-icon'
    );

    // Create or update robot marker
    if (!robotMarkerRef.current) {
      robotMarkerRef.current = L.marker([robotPosition.y, robotPosition.x], { 
        icon: robotIcon,
        zIndexOffset: ROBOT_CONFIG.Z_INDEX.SINGLE
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
      
      const duration = calculateAnimationDuration(distance);
      
      // Animate position change
      robotMarkerRef.current.setLatLng(targetPos, {
        duration: duration,
        easeLinearity: ROBOT_CONFIG.ANIMATION.EASE_LINEARITY
      });
      
      // Update icon rotation smoothly
      const currentAngle = previousPositionRef.current?.angle || robotPosition.angle;
      const angleDiff = Math.abs(robotPosition.angle - currentAngle);
      
      if (angleDiff > ROBOT_CONFIG.ANIMATION.MIN_ANGLE_DIFF) { 
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

    // Cleanup
    return () => {
      if (layersRef.current.robot && mapInstance) {
        mapInstance.removeLayer(layersRef.current.robot);
        layersRef.current.robot = null;
        robotMarkerRef.current = null;
      }
    };
  }, [mapInstance, robotPosition]);

  // Handle multiple robots tracking
  useEffect(() => {
    if (!mapInstance) {
      if (layersRef.current.robotsMulti) {
        mapInstance.removeLayer(layersRef.current.robotsMulti);
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
      mapInstance.removeLayer(layersRef.current.robotsMulti);
    }
    const robotsLayer = L.layerGroup();

    safeRobotList.forEach((bot) => {
      const position = extractRobotPosition(bot);
      if (!position) return;

      // Use simple SVG icon for all robots
      const iconUrl = getSimpleRobotIcon();
      const icon = createRobotIcon(
        iconUrl,
        ROBOT_CONFIG.ICON_SIZE.DEFAULT,
        ROBOT_CONFIG.ICON_ANCHOR.DEFAULT,
        'amr-circular-icon'
      );
      
      const marker = L.marker([position.y, position.x], { 
        icon, 
        zIndexOffset: ROBOT_CONFIG.Z_INDEX.MULTI 
      });
      
      // Add tooltip with robot information
      marker.bindTooltip(createRobotTooltip(bot), { direction: 'top' });
      robotsLayer.addLayer(marker);
    });

    robotsLayer.addTo(mapInstance);
    layersRef.current.robotsMulti = robotsLayer;

    // Cleanup
    return () => {
      if (layersRef.current.robotsMulti && mapInstance) {
        mapInstance.removeLayer(layersRef.current.robotsMulti);
        layersRef.current.robotsMulti = null;
      }
    };
  }, [mapInstance, robotList]);

  return {
    robotMarkerRef,
    layersRef,
  };
};
