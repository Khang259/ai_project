// src/services/auth.js 
import axios from "axios";
import api, { startAutoRefresh } from "./api";

// Tạo axios instance riêng cho refresh token để tránh circular dependency
const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://192.168.1.6:8001",
  headers: {
    "Content-Type": "application/json",
  },
});

export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials);
    // Backend trả về access_token, refresh_token, token_type, user
    const { access_token, refresh_token, token_type, user } = response.data;
    const groupId = user?.group_id ?? null;
    if (!access_token) {
      console.error("[auth.login] access_token is missing in response", response.data);
    }
    
    // Store JWT và refresh_token in localStorage
    localStorage.setItem("token", access_token || "");
    localStorage.setItem("refresh_token", refresh_token || "");
    localStorage.setItem("user", JSON.stringify(user));
    if (groupId !== null && groupId !== undefined) {
      localStorage.setItem("group_id", String(groupId));
    } else {
      localStorage.removeItem("group_id");
    }
    
    // Start auto refresh mechanism
    startAutoRefresh();
    
    return { token: access_token, refresh_token, user, token_type };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error("[auth.login] Request failed", { status, data });
    throw new Error(data?.detail || data?.message || error.message || "Đăng nhập thất bại");
  }
};

// Thêm function refresh token
export const refreshToken = async () => {
  try {
    const refresh_token = localStorage.getItem("refresh_token");
    if (!refresh_token) {
      throw new Error("No refresh token available");
    }

    // Sử dụng refreshApi (không có interceptors) để tránh circular dependency
    const response = await refreshApi.post("/auth/refresh", { refresh_token });
    console.log("[auth.refreshToken] refreshToken response", response);
    const { access_token, refresh_token: new_refresh_token, user } = response.data;
    const groupId = user?.group_id ?? null;
    
    // Cập nhật tokens mới
    localStorage.setItem("token", access_token);
    localStorage.setItem("refresh_token", new_refresh_token);
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    if (groupId !== null && groupId !== undefined) {
      localStorage.setItem("group_id", String(groupId));
    } else {
      localStorage.removeItem("group_id");
    }
    
    return { token: access_token, refresh_token: new_refresh_token, user };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error("[auth.refreshToken] Request failed", { status, data });
    
    // Nếu refresh token cũng hết hạn → logout
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("group_id");
      
    throw new Error(data?.detail || data?.message || error.message || "Refresh token thất bại");
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("group_id");
};