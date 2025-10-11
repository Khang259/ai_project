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

  // Fetch areas từ API khi component mount
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const areas = await getAllAreas();
        setAreaData(areas);
        
        // Set area đầu tiên làm default nếu có
        if (areas && areas.length > 0) {
          const firstArea = areas[0];
          setCurrAreaName(firstArea.area_name);
          setCurrAreaId(firstArea.area_id);
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
        if (areas && areas.length > 0) {
          setCurrAreaName(areas[0].area_name);
          setCurrAreaId(areas[0].area_id);
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
