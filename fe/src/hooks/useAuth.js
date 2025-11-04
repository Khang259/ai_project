// src/hooks/useAuth.js
import { useState } from "react";
import { login as loginService } from "@/services/auth";

export function useAuth() {
  // Safe JSON parsing
  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      return null;
    }
  };

  const [auth, setAuth] = useState({
    token: localStorage.getItem("token") || null,
    user: getUserFromStorage(),
  });

  const login = async (credentials) => {
    try {
      const response = await loginService(credentials);
      setAuth({ token: response.token, user: response.user });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null });
  };

  return { auth, login, logout };
}