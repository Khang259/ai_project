import React from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import GridCell from './GridCell';
import '../../styles/bootstrap-scoped.css';

/**
 * Component hiển thị khu vực grid
 * @param {Object} props
 * @param {string} props.selectedKhu - Khu vực được chọn
 * @param {Object} props.currentKhuConfig - Cấu hình khu vực hiện tại
 * @param {number} props.totalCells - Tổng số ô
 * @param {Array} props.supplyTaskData - Dữ liệu task Supply
 * @param {Array} props.demandTaskData - Dữ liệu task Demand
 * @param {Object} props.cellStates - Trạng thái các ô
 * @param {Function} props.onCellClick - Hàm xử lý khi click vào ô
 * @param {boolean} props.isConfigLoading - Trạng thái loading config
 * @param {boolean} props.taskLoading - Trạng thái loading task
 * @param {string} props.configError - Lỗi config
 * @param {string} props.taskError - Lỗi task
 * @param {Function} props.isUserAE3 - Hàm kiểm tra user AE3
 * @param {Function} props.isUserAE4 - Hàm kiểm tra user AE4
 * @param {Function} props.isUserMainOvh - Hàm kiểm tra user MainOvh
 */
const GridArea = ({
  selectedKhu,
  currentKhuConfig,
  totalCells,
  supplyTaskData,
  demandTaskData,
  cellStates,
  onCellClick,
  isConfigLoading,
  taskLoading,
  configError,
  taskError,
  isUserAE3,
  isUserAE4,
  isUserMainOvh
}) => {
  // Hiển thị loading
  if (isConfigLoading || taskLoading) {
    return (
      <div className="mobile-grid-bootstrap">
        <div className="text-center">
          <Spinner animation="border" />
          <div>Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  // Hiển thị lỗi
  if (configError || taskError) {
    return (
      <div className="mobile-grid-bootstrap">
        <Alert variant="danger">{configError || taskError}</Alert>
      </div>
    );
  }

  // Kiểm tra cấu hình
  if (!selectedKhu || !currentKhuConfig || totalCells === 0) {
    return (
      <div className="mobile-grid-bootstrap">
        <div className="text-center text-muted">
          <div className="mb-2">
            <i className="bi bi-database-x fs-1"></i>
          </div>
          <div>Không có cấu hình cho khu vực {selectedKhu || 'chưa chọn'}</div>
        </div>
      </div>
    );
  }

  // Hiển thị grid
  return (
    <div className="mobile-grid-bootstrap">
      <div className="row">
        {Array.from({ length: totalCells }, (_, index) => (
          <GridCell
            key={index + 1}
            cellNumber={index + 1}
            selectedKhu={selectedKhu}
            taskData={selectedKhu === 'Supply' ? supplyTaskData : demandTaskData}
            cellStates={cellStates}
            onCellClick={onCellClick}
            isUserAE3={isUserAE3}
            isUserAE4={isUserAE4}
            isUserMainOvh={isUserMainOvh}
          />
        ))}
      </div>
    </div>
  );
};

export default GridArea;
