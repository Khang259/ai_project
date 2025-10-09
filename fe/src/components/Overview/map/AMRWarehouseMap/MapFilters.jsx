
import React from 'react';
import { Input } from 'antd';

const MapFilters = ({ cameraFilter, setCameraFilter, amrFilter, setAmrFilter }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px #333', borderRadius: 10, boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)', padding: 10 }}>
      {/* Filter Camera ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontWeight: 500, color: '#333' }}>Camera ID:</span>
        <Input
          placeholder="Nhập Camera ID"
          value={cameraFilter || ''}
          onChange={(e) => setCameraFilter(e.target.value)}
          style={{ width: 120 }}
          allowClear
          size="middle"
        />
      </div>
      {/* Filter AMR ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontWeight: 500, color: '#333' }}>Device Name:</span>
        <Input
          placeholder="Nhập AMR ID"
          value={amrFilter || ''}
          onChange={(e) => setAmrFilter(e.target.value)}
          style={{ width: 120 }}
          allowClear
          size="middle"
        />
      </div>
    </div>
  );
};

export default MapFilters;