// src/services/auth.js 
import api from "./api";

export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials);
    // Backend trả về access_token, token_type, user
    const { access_token, token_type, user } = response.data;
    if (!access_token) {
      console.error("[auth.login] access_token is missing in response", response.data);
    }
    
    // Store JWT in localStorage (key: token)
    localStorage.setItem("token", access_token || "");
    localStorage.setItem("user", JSON.stringify(user));
    
    return { token: access_token, user, token_type };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error("[auth.login] Request failed", { status, data });
    throw new Error(data?.detail || data?.message || error.message || "Đăng nhập thất bại");
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};