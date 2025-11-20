import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAllAreas } from '../services/mapService';
import { useAuth } from '../hooks/useAuth';

const AreaContext = createContext();

export const useArea = () => {
  const context = useContext(AreaContext);
  if (!context) {
    throw new Error('useArea must be used within an AreaProvider');
  }
  return context;
};

export const AreaProvider = ({ children }) => {
  const { auth } = useAuth();
  const [currAreaName, setCurrAreaName] = useState('');
  const [currAreaId, setCurrAreaId] = useState(null);
  const [areaData, setAreaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ref để track previous user - Cách 2: Tốt nhất cho user change detection
  const prevUserRef = useRef(null);

  // Kiểm tra role của user
  const isAdmin = auth?.user?.roles?.includes('admin');
  const isOperator = auth?.user?.roles?.includes('operator');

  // Lưu area vào localStorage khi thay đổi - chỉ cho admin với user-specific keys
  useEffect(() => {
    if (isAdmin && currAreaId !== null && currAreaName && auth?.user?.username) {
      const storageKey = `selectedAreaId_${auth.user.username}`;
      const storageNameKey = `selectedAreaName_${auth.user.username}`;
      localStorage.setItem(storageKey, currAreaId.toString());
      localStorage.setItem(storageNameKey, currAreaName);
      console.log('[AreaContext] 💾 Admin saved area to localStorage:', currAreaName);
    }
  }, [currAreaId, currAreaName, isAdmin, auth?.user?.username]);

  // Cách 2: Track previous user để detect user change chính xác
  useEffect(() => {
    const currentUsername = auth?.user?.username;
    const prevUsername = prevUserRef.current;
    
    // Nếu user thay đổi (bao gồm logout và login user mới)
    if (prevUsername !== currentUsername) {
      console.log('[AreaContext] 🔄 User changed from', prevUsername, 'to', currentUsername);
      
      // Reset state hoàn toàn
      setCurrAreaName('');
      setCurrAreaId(null);
      setAreaData([]);
      setError(null);
      
      // Update ref để track user hiện tại
      prevUserRef.current = currentUsername;
      
      // Trigger fetch nếu có user mới
      if (currentUsername) {
        console.log('[AreaContext] 🚀 New user detected - triggering fetch');
        setLoading(true);
      } else {
        console.log('[AreaContext] 🔄 User logout - state reset');
        setLoading(false);
      }
    }
  }, [auth?.user?.username]);

  // Logic force refresh đã được thay thế bởi track previous user ở trên

  // Fetch areas từ API khi component mount
  useEffect(() => {
    const fetchAreas = async () => {
      // Chỉ fetch khi có user
      if (!auth?.user) {
        console.log('[AreaContext] No user - skipping fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('[AreaContext] 🔄 Fetching areas for user:', auth.user.username);
        const areas = await getAllAreas();
        setAreaData(areas);
        
        // Logic khác nhau cho admin và operator
        if (areas && areas.length > 0) {
          if (isOperator && !isAdmin && auth?.user?.area !== undefined) {
            // Operator: Sử dụng area từ user data
            const userAreaId = auth.user.area;
            console.log('[AreaContext DEBUG] Operator userAreaId:', userAreaId);
            console.log('[AreaContext DEBUG] Available areas:', areas.map(a => ({id: a.area_id, name: a.area_name})));
            
            const userArea = areas.find(a => a.area_id === userAreaId);
            console.log('[AreaContext DEBUG] User area:', userArea);

            if (userArea) {
              setCurrAreaName(userArea.area_name);
              setCurrAreaId(userArea.area_id);
              console.log('[AreaContext] 👤 Operator sử dụng area từ user:', userArea.area_name);
              console.log('[AreaContext] 👤 Operator sử dụng area từ user:', userArea.area_name);
            } else {
              // Fallback nếu không tìm thấy area của user
              const firstArea = areas[0];
              setCurrAreaName(firstArea.area_name);
              setCurrAreaId(firstArea.area_id);
              console.log('[AreaContext] ⚠️ Không tìm thấy area của operator, dùng area đầu tiên');
            }
          } else if (isAdmin) {
            // Admin: Khôi phục area đã chọn từ localStorage theo user
            const storageKey = `selectedAreaId_${auth.user.username}`;
            const storageNameKey = `selectedAreaName_${auth.user.username}`;
            const savedAreaId = localStorage.getItem(storageKey);
            const savedAreaName = localStorage.getItem(storageNameKey);
            console.log('[AreaContext] 🔍 Admin checking localStorage:', { savedAreaId, savedAreaName });
            
            // Tìm area đã lưu trong danh sách areas
            if (savedAreaId && savedAreaName) {
              const savedArea = areas.find(
                (a) => a.area_id.toString() === savedAreaId || a.area_name === savedAreaName
              );
              
              if (savedArea) {
                // Khôi phục area đã chọn
                setCurrAreaName(savedArea.area_name);
                setCurrAreaId(savedArea.area_id);
                console.log('[AreaContext] ✅ Admin khôi phục area đã chọn:', savedArea.area_name);
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
              console.log('[AreaContext] ℹ️ Admin chưa có area đã lưu, dùng area đầu tiên');
            }
          } else {
            // Default fallback cho các role khác
            const firstArea = areas[0];
            setCurrAreaName(firstArea.area_name);
            setCurrAreaId(firstArea.area_id);
            console.log('[AreaContext] ℹ️ Default fallback, dùng area đầu tiên');
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
  }, [auth?.user?.username, isAdmin, isOperator]); // Re-fetch khi user thay đổi

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
        
        // Logic khác nhau cho admin và operator khi refetch
        if (areas && areas.length > 0) {
          if (isOperator && !isAdmin && auth?.user?.area !== undefined) {
            // Operator: Luôn sử dụng area từ user data
            const userAreaId = auth.user.area;
            const userArea = areas.find(a => a.area_id === userAreaId);
            
            if (userArea) {
              setCurrAreaName(userArea.area_name);
              setCurrAreaId(userArea.area_id);
            } else {
              setCurrAreaName(areas[0].area_name);
              setCurrAreaId(areas[0].area_id);
            }
          } else if (isAdmin) {
            // Admin: Giữ nguyên area hiện tại nếu vẫn tồn tại
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
          } else {
            // Default fallback
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
