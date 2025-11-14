import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllAreas } from '../services/mapService';

const AreaContext = createContext();

export const useArea = () => {
  const context = useContext(AreaContext);
  if (!context) {
    throw new Error('useArea must be used within an AreaProvider');
  }
  return context;
};

export const AreaProvider = ({ children }) => {
  const [currAreaName, setCurrAreaName] = useState('');
  const [currAreaId, setCurrAreaId] = useState(null);
  const [areaData, setAreaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lưu area vào localStorage khi thay đổi
  useEffect(() => {
    if (currAreaId !== null && currAreaName) {
      localStorage.setItem('selectedAreaName', currAreaName);
    }
  }, [currAreaId, currAreaName]);

  // Fetch areas từ API khi component mount
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const areas = await getAllAreas();
        setAreaData(areas);
        
        // Khôi phục area đã chọn từ localStorage hoặc dùng area đầu tiên
        if (areas && areas.length > 0) {
          const savedAreaId = localStorage.getItem('selectedAreaId');
          const savedAreaName = localStorage.getItem('selectedAreaName');
          
          // Tìm area đã lưu trong danh sách areas
          if (savedAreaId && savedAreaName) {
            const savedArea = areas.find(
              (a) => a.area_id.toString() === savedAreaId || a.area_name === savedAreaName
            );
            
            if (savedArea) {
              // Khôi phục area đã chọn
              setCurrAreaName(savedArea.area_name);
              setCurrAreaId(savedArea.area_id);
              console.log('[AreaContext] ✅ Khôi phục area đã chọn:', savedArea.area_name);
            } else {
              // Area đã lưu không còn tồn tại, dùng area đầu tiên
              const firstArea = areas[0];
              setCurrAreaName(firstArea.area_name);
              setCurrAreaId(firstArea.area_id);
              console.log('[AreaContext] ⚠️ Area đã lưu không tồn tại, dùng area đầu tiên');
            }
          } else {
            // Chưa có area nào được lưu, dùng area đầu tiên
            const firstArea = areas[0];
            setCurrAreaName(firstArea.area_name);
            setCurrAreaId(firstArea.area_id);
            console.log('[AreaContext] ℹ️ Chưa có area đã lưu, dùng area đầu tiên');
          }
        }
      } catch (error) {
        console.error('[AreaContext] ❌ Lỗi khi fetch areas:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, []);

  const value = {
    areaData,
    currAreaName,
    setCurrAreaName,
    currAreaId,
    setCurrAreaId,
    loading,
    error,
    refetchAreas: async () => {
      try {
        setLoading(true);
        setError(null);
        const areas = await getAllAreas();
        setAreaData(areas);
        
        // Giữ nguyên area hiện tại nếu vẫn tồn tại, nếu không thì dùng area đầu tiên
        if (areas && areas.length > 0) {
          const currentAreaExists = areas.find(
            (a) => a.area_id === currAreaId || a.area_name === currAreaName
          );
          
          if (currentAreaExists) {
            // Giữ nguyên area hiện tại
            setCurrAreaName(currentAreaExists.area_name);
            setCurrAreaId(currentAreaExists.area_id);
          } else {
            // Area hiện tại không còn tồn tại, dùng area đầu tiên
            setCurrAreaName(areas[0].area_name);
            setCurrAreaId(areas[0].area_id);
          }
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AreaContext.Provider value={value}>
      {children}
    </AreaContext.Provider>
  );
};
