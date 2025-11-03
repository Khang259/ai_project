// src/services/users.js
import api from "./api";

export const getUsers = async () => {
  try {
    const response = await api.get("/users/");
    return response.data;  // Trả về array users từ MongoDB
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/users.getUsers] Request failed", { method, url, status, data });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi lấy danh sách users");
  }
};

export const deleteUser = async (id) => {
  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/users.deleteUser] Request failed", { method, url, status, data });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi xóa user");
  }
};

// Thêm user mới qua API signup
export const addUser = async (userData) => {
  try {
    const response = await api.post("/auth/signup", userData);
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/users.addUser] Request failed", { method, url, status, data, payload: userData });
    throw new Error(data?.detail || data?.message || error.message || "Lỗi khi thêm user");
  }
};


export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`/users/${id}`, userData);
    console.log("response", response.data);
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const data = error.response?.data;
    console.error("[services/users.updateUser] Request failed", { method, url, status, data, payload: userData });
  }
}