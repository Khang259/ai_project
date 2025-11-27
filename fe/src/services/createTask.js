import api from './api';

/**
 * Service để tạo task mới với endpoint /caller/process-caller
 * @param {Object} taskData - Dữ liệu task với format:
 * {
 *   "node_name": "string",
 *   "node_type": "string", 
 *   "owner": "string",
 *   "start": 0,
 *   "end": 0,
 *   "next_start": 0,
 *   "next_end": 0
 * }
 * @returns {Promise<Object>} - Response từ API
 */
export const createTask = async (taskData) => {
  try {
    console.log('🔍 Debug - createTask - Sending data:', JSON.stringify(taskData));
    
    const response = await api.post('/caller/process-caller', taskData);
    
    console.log('🔍 Debug - createTask - Response:', response.data);
    
    return {
      success: true,
      data: response.data,
      message: 'Tạo task thành công'
    };
  } catch (error) {
    console.error('❌ Error creating task:', error);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Có lỗi xảy ra khi tạo task',
      status: error.response?.status
    };
  }
};
