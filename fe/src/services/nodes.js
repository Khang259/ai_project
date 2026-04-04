// src/services/nodes.js
import api from "./api";

export const getNodesByOwner = async (owner) => {
  try {
    const res = await api.get("/nodes/", { params: { owner } });
    return res.data;
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/nodes.getNodesByOwner] Request failed", { method, url, status, data });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi lấy nodes");
  }
};

export const getNodesByOwnerAndType = async (owner, nodeType) => {
  try {
    const res = await api.get(`/nodes/owner/${owner}/${encodeURIComponent(nodeType)}`);
    return res.data;
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/nodes.getNodesByOwnerAndType] Request failed", { method, url, status, data });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi lấy nodes theo loại");
  }
};

export const createNode = async (payload) => {
  try {
    const res = await api.post("/nodes/", payload);
    return res.data;
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/nodes.createNode] Request failed", { method, url, status, data, payload });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi tạo node");
  }
};

export const updateNodeByBatch = async (payload) => {
  try {
    const res = await api.put(`/nodes/batch`, payload);
    return res.data;
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/nodes.updateNodeById] Request failed", { method, url, status, data, payload });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi cập nhật node");
  }
};

export const deleteNodeById = async (nodeId) => {
  try {
    await api.delete(`/nodes/${nodeId}`);
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/nodes.deleteNodeById] Request failed", { method, url, status, data });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi xóa node");
  }
};


