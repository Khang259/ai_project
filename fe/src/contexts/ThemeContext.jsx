import React, { createContext, useContext, useState, useEffect } from 'react';
import NebulaBackground from '../components/NebulaBackground';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Kiểm tra localStorage hoặc system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Hàm toggle theme
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newTheme = !prev;
      // Lưu theme vào localStorage
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  useEffect(() => {
    // Thêm hoặc xóa class 'dark' trên body để dễ dàng style CSS nếu cần
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
      {isDarkMode && <NebulaBackground />}
    </ThemeContext.Provider>
  );
};