
import React from 'react';
import { ThunderboltOutlined } from '@ant-design/icons';

const MapLegend = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 12,
        flexWrap: 'wrap',
        marginLeft: 16,
        marginRight: 16,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
        <span
          className="legend-icon"
          style={{ background: '#f87171', display: 'inline-block', width: 16, height: 16, borderRadius: 4 }}
        ></span>
        Vị trí camera
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
        <span
          className="legend-icon"
          style={{ background: 'green', display: 'inline-block', width: 16, height: 16, borderRadius: 4 }}
        ></span>
        Điểm sạc
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
        <span
          className="legend-icon"
          style={{ background: '#60a5fa', borderRadius: '0.25em', display: 'inline-block', width: 16, height: 16 }}
        ></span>
        Robot AMR
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
        <ThunderboltOutlined style={{ color: '#fcd34d' }} />
        Đang sạc
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'black' }}>
        <span
          className="legend-path"
          style={{
            display: 'inline-block',
            width: 32,
            height: 4,
            background: 'linear-gradient(90deg,#60a5fa,#3b82f6)',
            borderRadius: 2,
          }}
        ></span>
        Khu vực đường đi AMR
      </span>
    </div>
  );
};

export default MapLegend;