import React from 'react';
import { Dropdown, Form } from 'react-bootstrap';
import { formatSupplyCellLabel, formatDemandCellLabel } from '../../../utils/format';
import '../../styles/bootstrap-scoped.css';

/**
 * Component chọn task cho Supply hoặc Demand
 * @param {Object} props
 * @param {string} props.type - Loại selector ('Supply' hoặc 'Demand')
 * @param {Array} props.cells - Danh sách các ô
 * @param {Array} props.taskData - Dữ liệu task
 * @param {string|number} props.selectedCell - Ô được chọn
 * @param {Function} props.onCellSelect - Hàm xử lý khi chọn ô
 * @param {Function} props.isUserAE3 - Hàm kiểm tra user AE3
 * @param {Function} props.isUserAE4 - Hàm kiểm tra user AE4
 * @param {Function} props.isUserMainOvh - Hàm kiểm tra user MainOvh
 */
const TaskSelector = ({
  type,
  cells,
  taskData,
  selectedCell,
  onCellSelect,
  isUserAE3,
  isUserAE4,
  isUserMainOvh
}) => {
  const getLabel = (cellNumber) => {
    if (type === 'Supply') {
      return formatSupplyCellLabel(cellNumber, 'Supply', isUserAE3(), isUserAE4(), isUserMainOvh());
    } else {
      return formatDemandCellLabel(cellNumber, 'Demand', isUserAE3(), isUserAE4(), isUserMainOvh());
    }
  };

  const getDisplayLabel = () => {
    if (selectedCell) {
      return getLabel(selectedCell);
    }
    return type === 'Supply' ? 'Chọn điểm cấp hàng' : 'Chọn điểm trả hàng';
  };

  const getDropdownId = () => {
    return `dropdown-${type.toLowerCase()}`;
  };

  return (
    <div className="mobile-grid-bootstrap">
      <div className="dropdown-container">
        <Form.Label className="dropdown-label">
          <strong>{type === 'Supply' ? 'Chọn điểm cấp hàng:' : 'Chọn điểm trả hàng:'}</strong>
        </Form.Label>
        <Dropdown onSelect={(cell) => onCellSelect(cell)}>
          <Dropdown.Toggle 
            as="button" 
            variant="primary" 
            id={getDropdownId()}
            className="dropdown-toggle-custom"
          >
            <span>{getDisplayLabel()}</span>
          </Dropdown.Toggle>
          <Dropdown.Menu className="dropdown-menu-custom">
            {cells.map((cellNumber) => {
              const cellData = taskData.find((item) => item.cell === `cell-${cellNumber}`);
              const formatLabel = getLabel(cellNumber);
              const taskPath = cellData?.value?.taskOrderDetail?.[0]?.taskPath;
              const label = taskPath ? `${formatLabel} - ${taskPath}` : formatLabel;
              
              return (
                <Dropdown.Item 
                  key={cellNumber} 
                  eventKey={cellNumber}
                  className="dropdown-item-custom"
                >
                  {label}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
};

export default TaskSelector;
