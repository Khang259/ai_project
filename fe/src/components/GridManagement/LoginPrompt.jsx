import React from 'react';
import { Alert, Button } from 'react-bootstrap';
import '../../styles/bootstrap-scoped.css';

/**
 * Component hiển thị prompt đăng nhập khi user chưa đăng nhập
 * @param {Object} props
 * @param {Function} props.onLogin - Hàm xử lý chuyển đến trang login
 */
const LoginPrompt = ({ onLogin }) => {
  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      // Default: redirect to login page
      window.location.href = '/login';
    }
  };

  return (
    <div className="mobile-grid-bootstrap">
      <div className="text-center py-5">
        <div className="mb-4">
          <i className="bi bi-shield-lock fs-1 text-muted"></i>
        </div>
        <h4 className="mb-3">Yêu cầu đăng nhập</h4>
        <p className="text-muted mb-4">
          Bạn cần đăng nhập để sử dụng tính năng này.
        </p>
        <Button 
          variant="primary" 
          size="lg"
          onClick={handleLogin}
          className="px-4"
        >
          <i className="bi bi-box-arrow-in-right me-2"></i>
          Đăng nhập
        </Button>
      </div>
    </div>
  );
};

export default LoginPrompt;
