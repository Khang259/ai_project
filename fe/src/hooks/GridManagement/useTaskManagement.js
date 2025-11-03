import { useState, useCallback } from 'react';
import { sendTaskSignal } from '@/services/task';

/**
 * Custom hook để quản lý việc gửi task
 * @param {Array} serverIPs - Danh sách IP server
 * @param {Function} setCellStates - Hàm cập nhật trạng thái ô
 * @returns {Object} - { isSending, sendResult, setSendResult, handleSendSignalGrid, handleSendDoubleTask }
 */
export const useTaskManagement = (serverIPs, setCellStates) => {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const handleSendSignalGrid = useCallback(async (cellNumber, khu, taskData, addHistoryRecord) => {
    if (isSending) {
      console.log('Debug - Bỏ qua handleSendSignalGrid: đang gửi');
      return { success: false, message: 'Đang gửi, vui lòng đợi.' };
    }
    
    if (!serverIPs || !Array.isArray(serverIPs) || serverIPs.length < 2) {
      console.warn('Debug: serverIPs không hợp lệ hoặc thiếu serverIPs[1]:', serverIPs);
      return { success: false, message: 'Không có IP server hợp lệ cho serverIPs[1].' };
    }

    setIsSending(true);
    setSendResult(null);
    
    try {
      console.log(`Debug - Bắt đầu handleSendSignalGrid cho khu: ${khu}, cell: ${cellNumber}`);
      const selectedData = taskData.find((item) => item.cell === `cell-${cellNumber}`);
      
      if (!selectedData) {
        if (taskData.length === 0) {
          throw new Error(`Không có dữ liệu trong MongoDB cho khu vực ${khu}. Vui lòng kiểm tra lại sau.`);
        } else {
          throw new Error(`Không tìm thấy dữ liệu cho ô ${cellNumber} trong MongoDB. Có thể ô này chưa được cập nhật.`);
        }
      }

      let taskPath = selectedData.value?.taskOrderDetail?.[0]?.taskPath || '';
      if (!taskPath) {
        throw new Error(`Không tìm thấy taskPath cho ô ${cellNumber}`);
      }

      const payload = {
        modelProcessCode: khu === 'Supply' ? 'capxeAE3' : 'capxeAE3',
        fromSystem: 'thadosoft',
        cell: cellNumber,
        khu: khu,
        taskPath: taskPath,
        collection: khu.toLowerCase(),
        timestamp: new Date().toISOString(),
        taskOrderDetail: [{ taskPath: taskPath }]
      };

      // Sử dụng serverIPs[1] và endpoint /ics/taskOrder/addTask
      const targetServer = {
        serverIP: serverIPs[1], // SERVER_ICS_URL
        endpoint: '/ics/taskOrder/addTask'
      };

      console.log('🔍 Debug - handleSendSignalGrid API:', {
        apiUrl: `http://${targetServer.serverIP}${targetServer.endpoint}`,
        payload: JSON.stringify(payload)
      });

      const result = await sendTaskSignal(
        [targetServer.serverIP],
        payload,
        cellNumber,
        khu,
        addHistoryRecord,
        setCellStates,
        () => {},
        { [khu]: '#14a65f' }
      );

      if (result.success) {
        setSendResult(result);
      }

      return result;
    } catch (error) {
      console.error(`❌ Lỗi handleSendSignalGrid (${khu}, cell-${cellNumber}):`, error);
      setCellStates((prev) => ({ ...prev, [`cell-${cellNumber}`]: 'bg-danger' }));
      setTimeout(() => {
        setCellStates((prev) => ({ ...prev, [`cell-${cellNumber}`]: '#14a65f' }));
      }, 4000);
      return { success: false, message: `Lỗi: ${error.message}` };
    } finally {
      setIsSending(false);
    }
  }, [isSending, serverIPs, setCellStates]);

  const handleSendDoubleTask = useCallback(async (
    selectedSupplyCell,
    selectedDemandCell,
    supplyTaskData,
    demandTaskData,
    checkSetup,
    addHistoryRecord
  ) => {
    if (!checkSetup()) {
      setSendResult({ success: false, message: 'Vui lòng chọn cả ô Supply và Demand.' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const supplyResult = await handleSendSignalGrid(selectedSupplyCell, 'Supply', supplyTaskData, addHistoryRecord);
      if (!supplyResult.success) {
        setSendResult({ success: false, message: `Lỗi khi gửi task Supply: ${supplyResult.message}` });
        return;
      }

      const demandResult = await handleSendSignalGrid(selectedDemandCell, 'Demand', demandTaskData, addHistoryRecord);
      if (!demandResult.success) {
        setSendResult({ success: false, message: `Lỗi khi gửi task Demand: ${demandResult.message}` });
        return;
      }

      setSendResult({ success: true, message: 'Gửi task Supply và Demand thành công!' });
    } catch (error) {
      console.error('❌ Lỗi handleSendDoubleTask:', error);
      setSendResult({ success: false, message: `Lỗi: ${error.message}` });
    } finally {
      setIsSending(false);
    }
  }, [handleSendSignalGrid]);

  return {
    isSending,
    sendResult,
    setSendResult,
    handleSendSignalGrid,
    handleSendDoubleTask
  };
};
