import { useState, useEffect, useCallback } from 'react';
import { fetchConfig } from '@/services/config';

/**
 * Custom hook để quản lý cấu hình grid
 * @param {Array} serverIPs - Danh sách IP server
 * @param {string} username - Tên người dùng
 * @returns {Object} - { gridConfig, isConfigLoading, error }
 */
export const useGridConfig = (serverIPs, username) => {
  const [gridConfig, setGridConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    if (!serverIPs || !Array.isArray(serverIPs) || serverIPs.length === 0) {
      console.warn('Debug: serverIPs không hợp lệ:', serverIPs);
      setError('Không có IP server hợp lệ.');
      setIsConfigLoading(false);
      return;
    }
    
    if (!username) {
      console.warn('Debug: username không hợp lệ:', username);
      setError('Không có username hợp lệ.');
      setIsConfigLoading(false);
      return;
    }

    setIsConfigLoading(true);
    setError(null);
    
    try {
      const configData = await fetchConfig(serverIPs, username);
      console.log('✅ Config từ MongoDB:', { serverIP: serverIPs[0], username, configData });
      setGridConfig(configData);
    } catch (configError) {
      console.warn('⚠️ Không thể load cấu hình từ MongoDB', configError);
      setError(`Không thể tải cấu hình: ${configError.message}`);
    } finally {
      setIsConfigLoading(false);
    }
  }, [serverIPs, username]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return { gridConfig, isConfigLoading, error, reloadConfig: loadConfig };
};
