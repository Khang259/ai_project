// src/hooks/Setting/useNodeSettingsLazy.js
import { createNode, updateNodeByBatch, deleteNodeById } from '@/services/nodes';

export const useNodeSettingsLazy = (selectedUser) => {
  const addNode = async (payload) => {
    try {
      const res = await createNode(payload);
      return {
        success: true,
        status: res.status, 
        data: res.data
      };
      } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data?.message || error.message
      };
    }
  };

  const deleteNode = async (nodeId) => {
    try {
      const res = await deleteNodeById(nodeId);
      return {
        success: true,
        status: res.status,
        data: res.data
      };
    } catch (error) {
      return { success: false, status: error.response?.status, error: error.response?.data?.message || error.message };
    }
  };

  const updateBatch = async (payload) => {
    try {
      const res = await updateNodeByBatch(payload);
      return {
        success: true,
        status: res.status,
        data: res.data
      };
    } catch (error) {
      return { success: false, status: error.response?.status, error: error.response?.data?.message || error.message };
    }
  };


  return {
    addNode,
    deleteNode,
    updateBatch,
  };
};

export default useNodeSettingsLazy;
