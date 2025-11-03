import React from 'react';
import { Form } from 'react-bootstrap';
import '../../styles/bootstrap-scoped.css';

/**
 * Component chọn khu vực
 * @param {Object} props
 * @param {string} props.selectedKhu - Khu vực (node type) được chọn
 * @param {Function} props.onKhuSelect - Hàm xử lý khi chọn khu vực
 * @param {string[]} [props.nodeTypeKeys] - Danh sách node types để hiển thị (tuỳ chọn)
 */
const KhuAreaSelector = ({ selectedKhu, onKhuSelect, nodeTypeKeys }) => {
  const dynamicKhuConfig = {
    SupplyAndDemand: { label: 'C ', collection: 'supply_demand' },
    Supply: { label: 'CẤP', collection: 'supply' },
    Demand: { label: 'TRẢ', collection: 'demand' }
  };
  return (
    <div className="mobile-grid-bootstrap">
      <Form.Label>
        <strong>Chọn Khu Vực:</strong>
      </Form.Label>
      <div className="mb-3">
        <div className="d-flex flex-wrap" style={{ gap: '12px' }}>
          {(Array.isArray(nodeTypeKeys) && nodeTypeKeys.length > 0
            ? nodeTypeKeys.map((key) => [key, { label: key }])
            : Object.entries(dynamicKhuConfig)
          ).map(([key, config]) => (
            <div key={key} style={{ flex: '0 0 calc(33.333% - 12px)' }}>
              
              <div
                className={`text-black grid-task ${selectedKhu === key ? 'bg-primary' : ''} p-2`}
                onClick={() => onKhuSelect(key)}
                style={{
                  backgroundColor: selectedKhu === key ? '#007bff' : '#14a65f',
                  height: '60px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                <div className="text-center w-100">{config.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KhuAreaSelector;