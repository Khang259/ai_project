// Utility functions for smoothing path coordinates

/**
 * Creates a Catmull-Rom spline for smooth curves between points
 * @param {number[]} p0 - First control point [y, x]
 * @param {number[]} p1 - Start point [y, x]
 * @param {number[]} p2 - End point [y, x]
 * @param {number[]} p3 - Second control point [y, x]
 * @param {number} t - Interpolation parameter (0-1)
 * @returns {number[]} - Interpolated point [y, x]
 */
export const catmullRomSpline = (p0, p1, p2, p3, t) => {
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

/**
 * Smooths path coordinates using simplified Catmull-Rom spline approach
 * @param {Array<number[]>} coordinates - Array of coordinate points [y, x]
 * @param {number} tension - Tension parameter for curve smoothness (0-1)
 * @param {number} numSegments - Number of interpolated segments between points
 * @returns {Array<number[]>} - Smoothed coordinate array
 */
export const smoothPathCoordinates = (coordinates, tension = 0.3, numSegments = 5) => {
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

/**
 * Converts path data to Leaflet coordinate format
 * @param {Array} pathData - Raw path data
 * @returns {Array<number[]>} - Leaflet-formatted coordinates [y, x]
 */
export const convertToLeafletCoordinates = (pathData) => {
  if (!pathData || !Array.isArray(pathData) || pathData.length === 0) {
    return [];
  }
  
  // Convert path coordinates to Leaflet format [y, x]
  return pathData.map(coord => {
    if (Array.isArray(coord) && coord.length >= 2) {
      return [coord[1], coord[0]];
    }
    return coord;
  });
};
