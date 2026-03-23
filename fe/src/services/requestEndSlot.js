import api from './api';

/**
 * Service để request end slot empty với endpoint /api/request-end-slot
 * @param {number} endQr - End QR code của slot
 * @param {string} reason - Lý do đánh dấu slot (mặc định: "manual_request")
 * @returns {Promise<Object>} - Response từ API
 */
export const requestEndSlot = async (endQr, reason = "manual_request") => {
  try {
    console.log('🔍 Debug - requestEndSlot - Sending data:', { end_qr: endQr, reason });
    
    const response = await api.post('/api/request-end-slot', {
      end_qr: endQr,
      reason: reason
    });
    
    console.log('🔍 Debug - requestEndSlot - Response:', response.data);
    
    return {
      success: true,
      data: response.data,
      message: response.data?.message || 'Đã đánh dấu end slot là empty'
    };
  } catch (error) {
    console.error('❌ Error requesting end slot:', error);
    
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Có lỗi xảy ra khi request end slot',
      status: error.response?.status
    };
  }
};

