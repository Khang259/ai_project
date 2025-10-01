// src/services/grid.js
export const fetchTaskData = async (serverIPs, khu, username) => {
    if (!serverIPs || !Array.isArray(serverIPs) || serverIPs.length === 0) {
      throw new Error('Không có IP server hợp lệ.');
    }
  
    const serverIP = serverIPs[0]; // Chọn IP đầu tiên
    const qs = username ? `?username=${encodeURIComponent(username)}` : '';
    const url = `http://${serverIP}/get-task-data/${khu}${qs}`;
    console.log('[fetchTaskData] URL:', url);
  
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
  
      if (!response.ok) {
        console.error('[fetchTaskData] HTTP error:', response.status);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log('[fetchTaskData] status:', result.status, '| records:', Array.isArray(result.data) ? result.data.length : 'n/a');
      if (result.status !== 'success') {
        throw new Error(result.message || 'Không có dữ liệu từ server');
      }
  
      return result.data;
    } catch (error) {
      console.error('[fetchTaskData] Lỗi:', error);
      throw error;
    }
  };