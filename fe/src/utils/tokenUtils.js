// src/utils/tokenUtils.js

/**
 * Decode JWT token (không verify signature)
 * @param {string} token - JWT token string
 * @returns {object|null} - Decoded payload hoặc null nếu invalid
 */
export const decodeToken = (token) => {
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[tokenUtils] Error decoding token:', error);
    return null;
  }
};

/**
 * Lấy expiration time từ token (Unix timestamp in seconds)
 * @param {string} token - JWT token string
 * @returns {number|null} - Expiration time hoặc null
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  return decoded?.exp || null;
};

/**
 * Kiểm tra token có sắp hết hạn trong X giây không
 * @param {string} token - JWT token string
 * @param {number} secondsBeforeExpiry - Số giây trước khi hết hạn (default: 60 = 1 phút)
 * @returns {boolean} - true nếu token sắp hết hạn
 */
export const isTokenExpiringSoon = (token, secondsBeforeExpiry = 60) => {
  const exp = getTokenExpiration(token);
  if (!exp) return false;
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const timeUntilExpiry = exp - now;
  
  // Token sắp hết hạn nếu còn <= secondsBeforeExpiry giây
  return timeUntilExpiry <= secondsBeforeExpiry && timeUntilExpiry > 0;
};

/**
 * Kiểm tra token đã hết hạn chưa
 * @param {string} token - JWT token string
 * @returns {boolean} - true nếu token đã hết hạn
 */
export const isTokenExpired = (token) => {
  const exp = getTokenExpiration(token);
  if (!exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
};

