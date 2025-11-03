import React from 'react';
import { Alert, Button } from 'react-bootstrap';
import TaskSelector from './TaskSelector';
import '../../styles/bootstrap-scoped.css';

/**
 * Component hiển thị dropdown menu cho SupplyAndDemand
 * @param {Object} props
 * @param {Object} props.gridConfig - Cấu hình grid
 * @param {Array} props.supplyTaskData - Dữ liệu task Supply
 * @param {Array} props.demandTaskData - Dữ liệu task Demand
 * @param {string|number} props.selectedSupplyCell - Ô Supply được chọn
 * @param {string|number} props.selectedDemandCell - Ô Demand được chọn
 * @param {Function} props.onSupplyCellSelect - Hàm xử lý khi chọn ô Supply
 * @param {Function} props.onDemandCellSelect - Hàm xử lý khi chọn ô Demand
 * @param {Function} props.checkSetup - Hàm kiểm tra setup
 * @param {Function} props.onSendDoubleTask - Hàm xử lý gửi double task
 * @param {boolean} props.isSending - Trạng thái đang gửi
 * @param {Object} props.sendResult - Kết quả gửi
 * @param {Function} props.isUserAE3 - Hàm kiểm tra user AE3
 * @param {Function} props.isUserAE4 - Hàm kiểm tra user AE4
 * @param {Function} props.isUserMainOvh - Hàm kiểm tra user MainOvh
 */
const DropdownMenu = ({
  gridConfig,
  supplyTaskData,
  demandTaskData,
  selectedSupplyCell,
  selectedDemandCell,
  onSupplyCellSelect,
  onDemandCellSelect,
  checkSetup,
  onSendDoubleTask,
  isSending,
  sendResult,
  isUserAE3,
  isUserAE4,
  isUserMainOvh
}) => {
  // Kiểm tra cấu hình
  if (!gridConfig || !gridConfig.SupplyConfig || !gridConfig.DemandConfig) {
    return (
      <div className="mobile-grid-bootstrap">
        <Alert variant="warning">
          Không có cấu hình cho khu vực Supply hoặc Demand
        </Alert>
      </div>
    );
  }

  const supplyCells = Array.from({ length: gridConfig.SupplyConfig.cells }, (_, i) => i + 1);
  const demandCells = Array.from({ length: gridConfig.DemandConfig.cells }, (_, i) => i + 1);

  return (
    <div className="mobile-grid-bootstrap">
      <div className="d-flex flex-column gap-4">
        <TaskSelector
          type="Supply"
          cells={supplyCells}
          taskData={supplyTaskData}
          selectedCell={selectedSupplyCell}
          onCellSelect={onSupplyCellSelect}
          isUserAE3={isUserAE3}
          isUserAE4={isUserAE4}
          isUserMainOvh={isUserMainOvh}
        />

        <TaskSelector
          type="Demand"
          cells={demandCells}
          taskData={demandTaskData}
          selectedCell={selectedDemandCell}
          onCellSelect={onDemandCellSelect}
          isUserAE3={isUserAE3}
          isUserAE4={isUserAE4}
          isUserMainOvh={isUserMainOvh}
        />

        {checkSetup() && (
          <Button
            variant="success"
            onClick={onSendDoubleTask}
            disabled={isSending}
            className="mt-3 w-100"
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            {isSending ? 'Đang gửi...' : 'Gửi lệnh'}
          </Button>
        )}

        {sendResult && (
          <Alert 
            variant={sendResult.success ? 'success' : 'danger'} 
            className="mt-3"
            style={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {sendResult.message}
          </Alert>
        )}
      </div>
    </div>
  );
};

export default DropdownMenu;
