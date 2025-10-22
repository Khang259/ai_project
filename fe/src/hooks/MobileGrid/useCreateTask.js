import { useCallback } from 'react';
import { createTask } from '@/services/createTask';

/**
 * Custom hook để quản lý việc tạo task
 * @returns {Object} - { createTaskHandler }
 */
export const useCreateTask = () => {
  /**
   * Hàm để tạo task mới
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
   * @returns {Promise<Object>} - Kết quả tạo task
   */
  const createTaskHandler = useCallback(async (taskData) => {
    try {
      const result = await createTask(taskData);
      return result;
    } catch (err) {
      console.error('❌ Error in createTaskHandler:', err);
      return {
        success: false,
        error: err.message || 'Có lỗi xảy ra khi tạo task'
      };
    }
  }, []);

  return {
    createTaskHandler
  };
};