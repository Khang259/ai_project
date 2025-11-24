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
      console.log('[useAuth] Login successful for user:', response.user?.username);
      return response;
    } catch (error) {
      console.error('[useAuth] Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedAreaName");
    localStorage.removeItem("selectedAreaId");
    localStorage.removeItem("currAreaName");
    localStorage.removeItem("currAreaId");
    localStorage.removeItem("areaData");
    localStorage.removeItem("currentAreaId");
    localStorage.removeItem("mapData");
    localStorage.removeItem("importedMapData");

    console.log('[useAuth] Logout successful - removed items:');
    
    // Clear user-specific area localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('selectedAreaId_') || key.startsWith('selectedAreaName_')) {
        localStorage.removeItem(key);
      }
    });
    
    setAuth({ token: null, user: null });
  };

  return { auth, login, logout };
}