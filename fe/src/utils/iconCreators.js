// Utility functions for creating map icons

/**
 * Creates an SVG icon for AGV/AMR vehicles
 * @param {number} size - The size of the icon in pixels
 * @param {string} color - The color of the icon
 * @returns {string} - Base64 encoded SVG data URL
 */
export const createSVGIcon = (size = 28, color = '#4285F4') => {
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

/**
 * Gets the appropriate icon URL for AGV/AMR vehicles
 * @returns {string} - Icon URL
 */
export const getIconUrl = () => {
  // Try different approaches in order of preference
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

/**
 * Creates a Leaflet icon for robots
 * @param {string} iconUrl - URL of the icon image
 * @param {number[]} iconSize - Size of the icon [width, height]
 * @param {number[]} iconAnchor - Anchor point of the icon [x, y]
 * @param {string} className - CSS class name for the icon
 * @returns {L.Icon} - Leaflet icon instance
 */
export const createRobotIcon = (iconUrl, iconSize = [36, 36], iconAnchor = [18, 18], className = 'amr-circular-icon') => {
  if (typeof L === 'undefined') {
    throw new Error('Leaflet library (L) is not loaded');
  }
  
  return L.icon({
    iconUrl: iconUrl,
    iconSize: iconSize,
    iconAnchor: iconAnchor,
    className: className,
    crossOrigin: 'anonymous'
  });
};

/**
 * Creates a simple robot icon using SVG
 * @returns {string} - Icon URL for simple robot
 */
export const getSimpleRobotIcon = () => {
  return '/assets/agv-icon-simple.svg';
};
