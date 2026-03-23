import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTaskData } from '@/services/grid';

/**
 * Custom hook để quản lý dữ liệu task
 * @param {Array} serverIPs - Danh sách IP server
 * @param {string} activeKhu - Khu vực đang hoạt động
 * @param {string} username - Tên người dùng
 * @returns {Object} - { supplyTaskData, demandTaskData, loading, error, loadTaskData }
 */
export const useTaskData = (serverIPs, activeKhu, username) => {
  const [supplyTaskData, setSupplyTaskData] = useState([]);
  const [demandTaskData, setDemandTaskData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestKhuRef = useRef(activeKhu);

  const loadTaskData = useCallback(async () => {
    if (!serverIPs || !Array.isArray(serverIPs) || serverIPs.length === 0) {
      console.warn('Debug: serverIPs không hợp lệ:', serverIPs);
      setError('Không có IP server hợp lệ.');
      setLoading(false);
      return;
    }
    
    if (!activeKhu) {
      console.warn('Debug: activeKhu không hợp lệ:', activeKhu);
      setError('Không có khu vực hợp lệ.');
      setLoading(false);
      return;
    }
    
    if (!username) {
      console.warn('Debug: username không hợp lệ:', username);
      setError('Không có username hợp lệ.');
      setLoading(false);
      return;
    }

    const khuAtStart = activeKhu;
    latestKhuRef.current = activeKhu;
    setLoading(true);
    setError(null);

    try {
      if (activeKhu === 'SupplyAndDemand') {
        const supplyData = await fetchTaskData(serverIPs, 'Supply', username);
        const demandData = await fetchTaskData(serverIPs, 'Demand', username);
        
        if (latestKhuRef.current === khuAtStart) {
          setSupplyTaskData(supplyData);
          setDemandTaskData(demandData);
          console.log(`✅ Dữ liệu từ MongoDB (Supply):`, supplyData);
          console.log(`✅ Dữ liệu từ MongoDB (Demand):`, demandData);
        }
      } else {
        const data = await fetchTaskData(serverIPs, activeKhu, username);
        
        if (latestKhuRef.current === khuAtStart) {
          setSupplyTaskData(activeKhu === 'Supply' ? data : []);
          setDemandTaskData(activeKhu === 'Demand' ? data : []);
          console.log(`✅ Dữ liệu từ MongoDB (${activeKhu}):`, data);
        }
      }
    } catch (error) {
      if (latestKhuRef.current === khuAtStart) {
        setError(`Không thể tải dữ liệu từ MongoDB: ${error.message}`);
        setSupplyTaskData([]);
        setDemandTaskData([]);
      }
    } finally {
      if (latestKhuRef.current === khuAtStart) {
        setLoading(false);
      }
    }
  }, [serverIPs, activeKhu, username]);

  useEffect(() => {
    if (activeKhu) {
      loadTaskData();
    }
  }, [activeKhu, loadTaskData]);

  return { supplyTaskData, demandTaskData, loading, error, loadTaskData };
};
