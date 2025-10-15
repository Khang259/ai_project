// src/hooks/Setting/useButtonSettings.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getNodesByOwner,
  createNode,
  updateNodeByBatch,
  deleteNodeById,
} from '@/services/nodes';

// Hook này tập trung toàn bộ logic ButtonSettings, thay thế mockData
export const useButtonSettings = (selectedUser, selectedNodeType) => {
  const [allFetchedNodes, setAllFetchedNodes] = useState([]);
  const [allNodes, setAllNodes] = useState([]); // nodes hiển thị theo loại đã chọn, đã merge sửa đổi
  const [nodeTypes, setNodeTypes] = useState({}); // đếm theo node_type
  const [modifiedNodes, setModifiedNodes] = useState({}); // map id -> updates
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy nodes theo user
  const fetchNodes = useCallback(async () => {
    if (!selectedUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getNodesByOwner(selectedUser.username);
      setAllFetchedNodes(Array.isArray(data?.node) ? data.node : Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('[useButtonSettings] Error fetching nodes:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUser?.id]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  // Cập nhật thống kê nodeTypes từ toàn bộ dữ liệu
  useEffect(() => {
    const counts = allFetchedNodes.reduce((acc, n) => {
      const t = n.node_type || 'unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    setNodeTypes(counts);
  }, [allFetchedNodes]);

  // Cập nhật danh sách hiển thị khi đổi loại hoặc có sửa đổi cục bộ
  useEffect(() => {
    if (!selectedNodeType) {
      setAllNodes([]);
      return;
    }
    const filtered = allFetchedNodes.filter(n => n.node_type === selectedNodeType);
    const merged = filtered.map(n => (modifiedNodes[n.id] ? { ...n, ...modifiedNodes[n.id] } : n));
    setAllNodes(merged);
  }, [allFetchedNodes, selectedNodeType, modifiedNodes]);

  // Cập nhật một ô (chỉ local), chưa gọi API cho đến khi Sav
  const updateCell = useCallback((id, field, value) => {
    setModifiedNodes(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        updated_at: new Date().toISOString(),
      },
    }));
  }, []);

  // Xóa 1 node (optimistic + API)
  const deleteCell = useCallback(async (cellId) => {
    // Optimistic: xóa khỏi view hiện tại
    setAllNodes(prev => prev.filter(n => n.id !== cellId));
    try {
      await deleteNodeById(cellId);
      // Sau khi xóa trên server, refresh toàn bộ danh sách để đồng bộ
      await fetchNodes();
      return { success: true };
    } catch (err) {
      console.error('[useButtonSettings] Error deleting node:', err);
      setError(err.message);
      // rollback bằng refresh từ server
      await fetchNodes();
      return { success: false, error: err.message };
    }
  }, [fetchNodes]);

  // Thêm node mới (gửi API ngay để có id chuẩn từ server)
  const addNode = useCallback(async (payload) => {
    if (!selectedUser?.username) return { success: false, error: 'Chưa có user' };
    try {
      const newNode = await createNode(payload);
      // Cập nhật vào bộ dữ liệu tổng và view hiện tại nếu cùng loại
      setAllFetchedNodes(prev => [...prev, newNode]);
      if (newNode.node_type === selectedNodeType) {
        setAllNodes(prev => [...prev, newNode]);
      }
      return { success: true, data: newNode };
    } catch (err) {
      setError(err.message);
      console.error('[useButtonSettings] Error creating node:', err);
      return { success: false, error: err.message };
    }
  }, [selectedUser?.id, selectedNodeType]);

  // Import từ Excel: nhận mảng nodes đã chuẩn hoá, merge local, chưa gọi API
  const importNodesLocal = useCallback((importedNodes) => {
    // Merge theo key node_name + node_type
    const map = new Map();
    // ưu tiên imported
    importedNodes.forEach(n => map.set(`${n.node_name}__${n.node_type}`, n));
    allNodes.forEach(n => {
      const key = `${n.node_name}__${n.node_type}`;
      if (!map.has(key)) map.set(key, n);
    });
    const merged = Array.from(map.values());
    setAllNodes(merged);
  }, [allNodes]);

  // Lưu hàng loạt thay đổi (batch)
  const saveBatch = useCallback(async () => {
    try {
      // Sử dụng allNodes Ư
      const updatedAll = allNodes.filter(n => n.node_type === selectedNodeType);

      const payload = {
        nodes: updatedAll.map(node => ({
          id: node.id,
          node_name: node.name || node.node_name || '', // Đảm bảo luôn có giá trị
          node_type: node.node_type,
          owner: selectedUser.username,
          start: node.start || 0,
          end: node.end || 0,
          next_start: node.next_start || 0,
          next_end: node.next_end || 0
        }))
      };

      await updateNodeByBatch(payload);
      // Refresh và xoá cache sửa đổi
      await fetchNodes();
      setModifiedNodes({});
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('[useButtonSettings] Error batch saving nodes:', err);
      return { success: false, error: err.message };
    }
  }, [allNodes, selectedNodeType, selectedUser, fetchNodes]);

  const totalCellsSelectedType = useMemo(() => nodeTypes[selectedNodeType] || allNodes.length || 0, [nodeTypes, selectedNodeType, allNodes.length]);

  // Lưu batch trực tiếp với danh sách nodes truyền vào (ví dụ từ Excel)
  const saveBatchWithNodes = useCallback(async (nodes) => {
    try {
      if (!Array.isArray(nodes) || nodes.length === 0) {
        return { success: false, error: 'Danh sách nodes trống' };
      }

      const payload = {
        nodes: nodes.map((n) => ({
          id: n.id,
          node_name: n.name || n.node_name || '',
          node_type: n.node_type,
          owner: selectedUser.username,
          start: Number(n.start) || 0,
          end: Number(n.end) || 0,
          next_start: Number(n.next_start) || 0,
          next_end: Number(n.next_end) || 0,
        })),
      };
      await updateNodeByBatch(payload);
      await fetchNodes();
      return { success: true };
    } catch (err) {
      setError(err.message);
      console.error('[useButtonSettings] Error saving batch with nodes:', err);
      return { success: false, error: err.message };
    }
  }, [selectedUser?.username, fetchNodes]);

  return {
    loading,
    error,
    nodeTypes,
    allNodes,
    setAllNodes,
    totalCellsSelectedType,
    updateCell,
    deleteCell,
    addNode,
    importNodesLocal,
    saveBatch,
    saveBatchWithNodes,
    fetchNodes,
  };
};

export default useButtonSettings;