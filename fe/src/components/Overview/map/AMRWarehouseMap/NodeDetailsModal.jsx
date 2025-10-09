// src/components/Overview/map/AMRWarehouseMap/NodeDetailsModal.jsx
import React from 'react';

const NodeDetailsModal = ({ selectedNode, onClose, onToggleLock }) => {
  if (!selectedNode) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="backdrop-blur-sm"
        style={{
          backgroundColor: '#fff2e6',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', color: '#000' }}>
          Chi tiết điểm: {selectedNode.name}
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <strong className="text-black">Loại điểm:</strong>
          <span
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              color: selectedNode.type === 'supply' ? '#000' : '#fa8c16',
            }}
          >
            {selectedNode.type === 'supply'
              ? 'Điểm cấp'
              : selectedNode.type === 'return'
              ? 'Điểm trả'
              : 'Điểm thường'}
          </span>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <strong className="text-black">Trạng thái:</strong>
          <span
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              color: selectedNode.isLocked ? '#fff' : '#000',
            }}
          >
            {selectedNode.isLocked ? '🔒 Bị khóa' : '🔓 Mở'}
          </span>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ color: 'black' }}>Vị trí:</strong>{' '}
          <span style={{ color: 'black' }}>{selectedNode.nodeData.key}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              backgroundColor: 'black',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
          <button
            onClick={() => {
              onToggleLock(selectedNode.id);
            }}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: selectedNode.isLocked ? '#52c41a' : '#ff4d4f',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {selectedNode.isLocked ? 'Mở khóa' : 'Khóa điểm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsModal;