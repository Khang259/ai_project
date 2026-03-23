import api from './api';

/**
 * Service để gọi API caller-we cho xưởng hàn
 * @param {Object} taskData - Dữ liệu task với format:
 * {
 *   "node_name": "string",
 *   "node_type": "string", 
 *   "owner": "string",
 *   "process_code": "string",
 *   "start": 0,
 *   "end": 0,
 *   "next_start": 0,
 *   "next_end": 0,
 *   "line": "string"
 * }
 * @returns {Promise<Object>} - Response từ API
 */
export const sendCallerWE = async (taskData) => {
  try {
    console.log('🔍 Debug - sendCallerWE - Sending data:', JSON.stringify(taskData));
    
    const response = await api.post('/caller/process-caller-we', taskData);
    
    console.log('🔍 Debug - sendCallerWE - Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error sending caller WE:', error);
    
    return {
      success: false,
      error: error.response?.data?.detail || error.message || 'Có lỗi xảy ra khi gửi lệnh',
      status: error.response?.status
    };
  }
};

