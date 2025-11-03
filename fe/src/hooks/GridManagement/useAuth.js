import { useState, useCallback } from 'react';
import { logout as logoutService } from '@/services/auth';

/**
 * Custom hook để quản lý authentication cho GridManagement
 * @returns {Object} - { currentUser, isAdmin, isUserAE3, isUserAE4, isUserMainOvh, logout }
 */
export const useAuth = () => {
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

  const [currentUser, setCurrentUser] = useState(getUserFromStorage());

  // Helper functions để kiểm tra quyền
  const isAdmin = useCallback(() => {
    return currentUser?.is_superuser || currentUser?.roles?.includes('admin') || false;
  }, [currentUser]);

  const isUserAE3 = useCallback(() => {
    return currentUser?.username?.toLowerCase().includes('ae3') || false;
  }, [currentUser]);

  const isUserAE4 = useCallback(() => {
    return currentUser?.username?.toLowerCase().includes('ae4') || false;
  }, [currentUser]);

  const isUserMainOvh = useCallback(() => {
    return currentUser?.username?.toLowerCase().includes('mainovh') || false;
  }, [currentUser]);

  // Logout function
  const logout = useCallback(() => {
    try {
      logoutService();
      setCurrentUser(null);
      console.log('✅ Logout successful');
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }, []);

  return {
    currentUser,
    isAdmin,
    isUserAE3,
    isUserAE4,
    isUserMainOvh,
    logout
  };
};
