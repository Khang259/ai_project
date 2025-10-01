// src/services/config.js
export const fetchConfig = async (serverIPs, username) => {
    if (!serverIPs || !Array.isArray(serverIPs) || serverIPs.length === 0) {
      throw new Error('Không có IP server hợp lệ.');
    }
    if (!username) {
      throw new Error('Không có username hợp lệ.');
    }
  
    const serverIP = serverIPs[0]; // Chọn IP đầu tiên
    const url = `http://${serverIP}/config?username=${encodeURIComponent(username)}`;
    try {
      console.log('Debug: fetchConfig URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
  
      if (!response.ok) {
        console.log('Debug response:', await response.text());
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const result = await response.json();
      console.log('Debug result from config:', result);
      if (result.status !== 'success') {
        throw new Error(result.message || 'Không thể lấy cấu hình từ server');
      }
  
      return result.data;
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình:', error);
      throw error;
    }
  };
  
  export const saveConfig = async (serverIPs, configData, username) => {
    if (!serverIPs || !Array.isArray(serverIPs) || serverIPs.length === 0) {
      throw new Error('Không có IP server hợp lệ.');
    }
  
    const serverIP = serverIPs[0]; // Chọn IP đầu tiên
    console.log('Debug serverIP:', serverIP);
    console.log('Debug configData:', configData);
    console.log('Debug username:', username);
  
    const url = `http://${serverIP}/config`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configData, username }) // Thêm username vào body
    });
  
    if (!response.ok) {
      console.log('Debug response:', await response.text());
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Không thể lưu cấu hình');
    }
  
    return result.data;
  };