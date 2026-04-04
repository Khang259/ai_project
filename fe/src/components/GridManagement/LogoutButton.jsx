import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import LogoutModal from './LogoutModal';
import '../../styles/bootstrap-scoped.css';

/**
 * Component nút logout với modal xác nhận
 * @param {Object} props
 * @param {Function} props.onLogout - Hàm xử lý logout
 * @param {boolean} props.disabled - Trạng thái disable
 * @param {string} props.className - CSS class
 * @param {Object} props.style - Inline styles
 * @param {Object} props.currentUser - Thông tin user hiện tại
 */
const LogoutButton = ({
  onLogout,
  disabled = false,
  className = '',
  style = {},
  currentUser
}) => {
  const [showModal, setShowModal] = useState(false);

  const defaultStyle = {
    padding: '8px 16px',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '6px',
    border: '1px solid #dc3545',
    backgroundColor: 'transparent',
    color: '#dc3545',
    transition: 'all 0.3s ease',
    ...style
  };

  const handleClick = () => {
    if (!disabled) {
      setShowModal(true);
    }
  };

  const handleConfirmLogout = () => {
    setShowModal(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleHideModal = () => {
    setShowModal(false);
  };

  return (
    <div className="mobile-grid-bootstrap">
      <Button
        variant="outline-danger"
        onClick={handleClick}
        disabled={disabled}
        className={className}
        style={defaultStyle}
        title="Đăng xuất khỏi hệ thống"
      >
        <i className="bi bi-box-arrow-right me-2"></i>
        Đăng xuất
      </Button>

      <LogoutModal
        show={showModal}
        onHide={handleHideModal}
        onConfirm={handleConfirmLogout}
        currentUser={currentUser}
      />
    </div>
  );
};

export default LogoutButton;
