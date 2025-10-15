import React from 'react';
import '../../styles/bootstrap-scoped.css';

/**
 * Hiển thị danh sách nút theo nodeType (tương tự CellNameEditor ở chế độ xem)
 * @param {Object} props
 * @param {Array} props.cells - Danh sách node theo nodeType hiện tại
 * @param {Function} [props.onCellPress] - Callback khi ấn nút; mặc định log ra console
 */
const NodeTypeCells = ({ cells = [], onCellPress }) => {
  const handlePress = (cell) => {
    if (typeof onCellPress === 'function') {
      onCellPress(cell);
    } else {
      // Mặc định: log chi tiết node ra console
      // eslint-disable-next-line no-console
      console.log('[NodeTypeCells] pressed:', cell);
    }
  };

  if (!Array.isArray(cells) || cells.length === 0) {
    return (
      <div className="mobile-grid-bootstrap">
        <div className="alert alert-warning mb-0">Không có node để hiển thị.</div>
      </div>
    );
  }

  return (
    <div className="mobile-grid-bootstrap">
      <div className="row">
        {cells.map((cell, idx) => (
          <div key={cell.id || idx} className="col-6 col-sm-4 col-md-3 mb-2">
            <button
              type="button"
              className="btn btn-outline-primary w-100 text-start"
              onClick={() => handlePress(cell)}
              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={cell.node_name}
            >
              <div className="fw-bold">{cell.node_name || `Node ${idx + 1}`}</div>
              <div className="small text-muted">
                {`(${cell.start ?? 0} → ${cell.end ?? 0})`}
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodeTypeCells;


