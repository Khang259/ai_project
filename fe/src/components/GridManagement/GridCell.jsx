import React from 'react';
import { formatSupplyCellLabel, formatDemandCellLabel } from '../../../utils/format';
import '../../styles/bootstrap-scoped.css';

/**
 * Component hiển thị một ô trong grid
 * @param {Object} props
 * @param {number} props.cellNumber - Số thứ tự của ô
 * @param {string} props.selectedKhu - Khu vực được chọn
 * @param {Array} props.taskData - Dữ liệu task
 * @param {Object} props.cellStates - Trạng thái các ô
 * @param {Function} props.onCellClick - Hàm xử lý khi click vào ô
 * @param {Function} props.isUserAE3 - Hàm kiểm tra user AE3
 * @param {Function} props.isUserAE4 - Hàm kiểm tra user AE4
 * @param {Function} props.isUserMainOvh - Hàm kiểm tra user MainOvh
 * @param {string} props.cellFontSize - Kích thước font chữ
 */
const GridCell = ({
  cellNumber,
  selectedKhu,
  taskData,
  cellStates,
  onCellClick,
  isUserAE3,
  isUserAE4,
  isUserMainOvh,
  cellFontSize = '0.9rem'
}) => {
  const cellKey = `cell-${cellNumber}`;
  const cellState = cellStates[cellKey] || '#14a65f';
  const cellData = taskData.find((item) => item.cell === cellKey);
  
  // Xác định label cho ô
  let cellLabel;
  if (selectedKhu === 'Supply') {
    cellLabel = formatSupplyCellLabel(cellNumber, selectedKhu, isUserAE3(), isUserAE4(), isUserMainOvh());
  } else if (selectedKhu === 'Demand') {
    cellLabel = formatDemandCellLabel(cellNumber, selectedKhu, isUserAE3(), isUserAE4(), isUserMainOvh());
  } else {
    cellLabel = cellData?.value?.taskOrderDetail?.[0]?.taskPath || `Cell ${cellNumber}`;
  }

  // Xác định màu nền
  let backgroundColor = cellState;
  if (selectedKhu === 'Demand' && isUserMainOvh() && !cellState.startsWith('bg-')) {
    backgroundColor = '#dc3545';
  }

  return (
    <div className="mobile-grid-bootstrap">
      <div className="col-4 col-sm-3" key={cellNumber}>
        <div
          id={cellKey}
          className="text-black grid-cell"
          onClick={() => onCellClick(cellNumber)}
          style={{
            backgroundColor: cellState.startsWith('bg-') ? undefined : backgroundColor,
            margin: '5px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: cellFontSize,
            cursor: 'pointer',
            ...(cellState.startsWith('bg-') && { className: `${cellState} text-black grid-cell` })
          }}
        >
          <div>{cellLabel}</div>
        </div>
      </div>
    </div>
  );
};

export default GridCell;
