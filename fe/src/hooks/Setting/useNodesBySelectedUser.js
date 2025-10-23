// src/hooks/Setting/useNodesBySelectedUser.js
import { useState, useCallback } from 'react';
import { getNodesByOwner } from '@/services/nodes';

// Hook lazy: chỉ fetch khi gọi refetch.
// Trả về: data, refetch
export const useNodesBySelectedUser = (selectedUser) => {
  const [data, setData] = useState([]);

  const normalizeResponseToList = (res) => {
    if (Array.isArray(res?.node)) return res.node;
    if (Array.isArray(res)) return res;
    return [];
  };

  const fetchData = useCallback(async (usernameOverride) => {
    const username = usernameOverride || selectedUser?.username;
    if (!username) return { success: false, error: 'Chưa có user' };
    try {
      const res = await getNodesByOwner(username);
      const list = normalizeResponseToList(res);
      setData(list);
      return { success: true, data: list };
    } catch (err) {
      return { success: false, error: err?.message };
    }
  }, [selectedUser?.username]);

  return {
    data,
    fetchData,
  };
};

export default useNodesBySelectedUser;
