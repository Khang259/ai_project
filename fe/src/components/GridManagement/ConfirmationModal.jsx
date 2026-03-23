import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../../styles/bootstrap-scoped.css';

/**
 * Component modal xác nhận gửi tín hiệu
 * @param {Object} props
 * @param {boolean} props.show - Hiển thị modal
 * @param {Function} props.onHide - Hàm đóng modal
 * @param {string|number} props.selectedCell - Ô được chọn
 * @param {Object} props.sendResult - Kết quả gửi
 * @param {boolean} props.isSending - Trạng thái đang gửi
 * @param {Function} props.onConfirm - Hàm xác nhận gửi
 */
const ConfirmationModal = ({
  show,
  onHide,
  selectedCell,
  sendResult,
  isSending,
  onConfirm
}) => {
  return (
    <div className="mobile-grid-bootstrap">
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton className="bg-success text-black">
          <Modal.Title>
            <i className="bi bi-check-circle me-2"></i>
            Xác nhận - Ô số {selectedCell}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>Bạn có chắc chắn muốn gửi tín hiệu từ ô số {selectedCell} không?</p>
          {sendResult && (
            <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'}`}>
              {sendResult.message}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} className="w-100">
            Đóng
          </Button>
          {!sendResult?.message && (
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isSending}
              className="w-100 mt-2"
            >
              {isSending ? 'Đang gửi...' : 'Gửi tín hiệu'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ConfirmationModal;
