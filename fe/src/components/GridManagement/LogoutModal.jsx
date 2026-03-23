import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../../styles/bootstrap-scoped.css';

/**
 * Component modal xác nhận logout
 * @param {Object} props
 * @param {boolean} props.show - Hiển thị modal
 * @param {Function} props.onHide - Hàm đóng modal
 * @param {Function} props.onConfirm - Hàm xác nhận logout
 * @param {Object} props.currentUser - Thông tin user hiện tại
 */
const LogoutModal = ({
  show,
  onHide,
  onConfirm,
  currentUser
}) => {
  return (
    <div className="mobile-grid-bootstrap">
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton className="bg-warning text-dark">
          <Modal.Title>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Xác nhận đăng xuất
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="mb-3">
            <i className="bi bi-person-circle fs-1 text-muted"></i>
          </div>
          <p className="mb-2">
            Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?
          </p>
          {currentUser && (
            <p className="text-muted small">
              Đang đăng nhập với: <strong>{currentUser.username}</strong>
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} className="me-2">
            <i className="bi bi-x-circle me-1"></i>
            Hủy
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            <i className="bi bi-box-arrow-right me-1"></i>
            Đăng xuất
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default LogoutModal;
