import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

/**
 * Fixes default markers in Leaflet by setting correct image paths
 * @param {Object} L - Leaflet library object
 */
export const fixLeafletMarkers = (L) => {
  if (L && L.Icon && L.Icon.Default) {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }
};

/**
 * Creates a polyline layer for path visualization
 * @param {Array} pathCoordinates - Array of coordinates for the path
 * @param {Object} options - Options for the polyline
 * @returns {L.Polyline} - Leaflet polyline instance
 */
export const createPathPolyline = (pathCoordinates, options = {}) => {
  const defaultOptions = {
    color: 'rgb(17, 223, 223)',
    weight: 3,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1,
    className: 'scenario-path'
  };
  
  if (typeof L === 'undefined') {
    throw new Error('Leaflet library (L) is not loaded');
  }
  
  return L.polyline(pathCoordinates, { ...defaultOptions, ...options });
};

/**
 * Creates a glow effect polyline for paths
 * @param {Array} pathCoordinates - Array of coordinates for the path
 * @returns {L.Polyline} - Leaflet polyline instance with glow effect
 */
export const createGlowPath = (pathCoordinates) => {
  return createPathPolyline(pathCoordinates, {
    color: '#ffffff',
    weight: 4,
    opacity: 0.1,
    className: 'path-glow'
  });
};

/**
 * Extracts position from robot data
 * @param {Object} bot - Robot data object
 * @returns {Object|null} - Position object with x and y coordinates or null
 */
export const extractRobotPosition = (bot) => {
  // Extract position - prioritize parsed position from node mapping
  const pos = bot.devicePositionParsed || bot.devicePosition || bot.position || null;
  
  // Expect pos like { x, y } or [y, x]
  let x, y;
  
  if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos) {
    x = pos.x;
    y = pos.y;
  } else if (Array.isArray(pos) && pos.length >= 2) {
    y = pos[0];
    x = pos[1];
  } else if (bot.x !== undefined && bot.y !== undefined) {
    x = bot.x;
    y = bot.y;
  } else {
    return null;
  }
  
  // Validate position values
  if (isNaN(x) || isNaN(y) || x === null || y === null) {
    return null;
  }
  
  return { x, y };
};

/**
 * Creates a robot marker tooltip content
 * @param {Object} bot - Robot data object
 * @returns {string} - HTML string for tooltip content
 */
export const createRobotTooltip = (bot) => {
  return `
    <div style="font-size:12px;">
      <div><b>Device name: ${bot.device_name || bot.deviceName || bot.device_code || bot.deviceCode || 'AGV'}</b></div>
      <div>Battery: ${bot.battery ?? 'N/A'}</div>
      <div>Speed: ${bot.speed ?? 'N/A'}</div>
    </div>
  `;
};

/**
 * Calculates animation duration based on distance
 * @param {number} distance - Distance between two points
 * @returns {number} - Animation duration in milliseconds
 */
export const calculateAnimationDuration = (distance) => {
  return Math.min(Math.max(distance * 1000, 300), 1000); // 300ms to 1000ms
};
