import React from 'react';
import LogoutButton from './LogoutButton';
import '../../styles/bootstrap-scoped.css';

/**
 * Component hiển thị thông tin server và user
 * @param {Object} props
 * @param {string} props.effectiveServerIP - IP server hiệu quả
 * @param {Object} props.currentUser - Thông tin user hiện tại
 * @param {Function} [props.isAdmin] - Hàm kiểm tra admin (tùy chọn)
 * @param {string} props.selectedKhu - Khu vực được chọn
 * @param {Object} props.currentKhuConfig - Cấu hình khu vực hiện tại
 * @param {number} props.totalCells - Tổng số ô
 * @param {Function} props.onLogout - Hàm xử lý logout
 */
const ServerInfo = ({
  effectiveServerIP,
  currentUser,
  isAdmin,
  selectedKhu,
  currentKhuConfig,
  totalCells,
  onLogout
}) => {
  return (
    <div className="mobile-grid-bootstrap">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <div>
          <strong>Server:</strong> {effectiveServerIP || 'Chưa cấu hình'}
          {selectedKhu && currentKhuConfig && (
            <span className="badge bg-info ms-2">{totalCells} ô</span>
          )}
        </div>
        {currentUser && onLogout && (
          <LogoutButton onLogout={onLogout} currentUser={currentUser} />
        )}
      </div>

      {currentUser && (
        <div className="mb-3">
          <strong>Đăng nhập với:</strong> {currentUser.username}
          {typeof isAdmin === 'function' && isAdmin() && (
            <span className="badge bg-danger ms-2">Admin</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ServerInfo;
