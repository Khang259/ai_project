import { useCallback } from 'react';
import { requestEndSlot } from '@/services/requestEndSlot';

/**
 * Custom hook để quản lý việc request end slot
 * @returns {Object} - { requestEndSlotHandler }
 */
export const useRequestEndSlot = () => {
  /**
   * Hàm để request end slot empty
   * @param {number} endQr - End QR code của slot
   * @param {string} reason - Lý do đánh dấu slot (mặc định: "manual_request")
   * @returns {Promise<Object>} - Kết quả request
   */
  const requestEndSlotHandler = useCallback(async (endQr, reason = "manual_request") => {
    try {
      const result = await requestEndSlot(endQr, reason);
      return result;
    } catch (err) {
      console.error('❌ Error in requestEndSlotHandler:', err);
      return {
        success: false,
        error: err.message || 'Có lỗi xảy ra khi request end slot'
      };
    }
  }, []);

  return {
    requestEndSlotHandler
  };
};

