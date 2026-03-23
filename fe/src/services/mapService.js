// src/services/mapService.js
import api from './api';

/**
 * Lưu map data lên backend
 * @param {number} area_id - ID của area
 * @param {Object} mapData - Dữ liệu map cần lưu
 * @returns {Promise<Object>} - Kết quả từ API
 */
export const saveMapToBackend = async (area_id, mapData) => {
  try {
    console.log(`[MapService] Đang lưu map cho area_id: ${area_id}`);
    
    const response = await api.post(`/areas/${area_id}/map`, mapData);
    
    if (response.data.success) {
      console.log(`[MapService] ✅ Map đã được lưu thành công cho area_id: ${area_id}`);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } else {
      throw new Error(response.data.message || 'Không thể lưu map');
    }
  } catch (error) {
    console.error(`[MapService] ❌ Lỗi khi lưu map cho area_id ${area_id}:`, error);
    
    // Xử lý các loại lỗi khác nhau
    if (error.response) {
      // Lỗi từ server
      const status = error.response.status;
      const message = error.response.data?.detail || error.response.data?.message || 'Lỗi server';
      
      if (status === 404) {
        throw new Error(`Area với ID ${area_id} không tồn tại`);
      } else if (status === 401) {
        throw new Error('Bạn cần đăng nhập để lưu map');
      } else if (status === 403) {
        throw new Error('Bạn không có quyền lưu map');
      } else {
        throw new Error(`Lỗi server (${status}): ${message}`);
      }
    } else if (error.request) {
      // Lỗi network
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    } else {
      // Lỗi khác
      throw new Error(error.message || 'Có lỗi xảy ra khi lưu map');
    }
  }
};

/**
 * Lấy map data từ backend
 * @param {number} area_id - ID của area
 * @returns {Promise<Object>} - Dữ liệu map từ API
 */
export const getMapFromBackend = async (area_id) => {
  try {
    const response = await api.get(`/areas/${area_id}/map`);
    if (response.data.success) {
      console.log(`[MapService] ✅ Map đã được lấy thành công cho area_id: ${area_id}`);
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(response.data.message || 'Không thể lấy map');
    }
  } catch (error) {
    console.error(`[MapService] ❌ Lỗi khi lấy map cho area_id ${area_id}:`, error);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.detail || error.response.data?.message || 'Lỗi server';
      
      if (status === 404) {
        throw new Error(`Map cho area_id ${area_id} không tồn tại`);
      } else if (status === 401) {
        throw new Error('Bạn cần đăng nhập để lấy map');
      } else if (status === 403) {
        throw new Error('Bạn không có quyền truy cập map');
      } else {
        throw new Error(`Lỗi server (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    } else {
      throw new Error(error.message || 'Có lỗi xảy ra khi lấy map');
    }
  }
};

/**
 * Lấy danh sách tất cả areas
 * @returns {Promise<Array>} - Danh sách areas
 */
export const getAllAreas = async () => {
  try {
    const response = await api.get('/areas');
    return response.data;
  } catch (error) {
    console.error('[MapService] ❌ Lỗi khi lấy danh sách areas:', error);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.detail || error.response.data?.message || 'Lỗi server';
      
      if (status === 401) {
        throw new Error('Bạn cần đăng nhập để xem danh sách areas');
      } else if (status === 403) {
        throw new Error('Bạn không có quyền xem danh sách areas');
      } else {
        throw new Error(`Lỗi server (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    } else {
      throw new Error(error.message || 'Có lỗi xảy ra khi lấy danh sách areas');
    }
  }
};
