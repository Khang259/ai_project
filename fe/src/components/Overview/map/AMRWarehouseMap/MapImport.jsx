// src/components/Overview/map/MapImport.jsx
import React, { useRef } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import { FileAddOutlined, FileZipOutlined } from '@ant-design/icons';

const MapImport = ({ zipLoading, zipError, zipFileName, handleZipImport, setMapData, setSecurityConfig, setSelectedAvoidanceMode, saveToBackendLoading, saveToBackendError }) => {
  const zipFileInputRef = useRef(null);

  const handleZipFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleZipImport(file, setMapData, setSecurityConfig, setSelectedAvoidanceMode);
    }
  };

  const importMenuItems = [
    {
      key: 'zip',
      icon: <FileZipOutlined />,
      label: 'Nhập bản đồ làm việc',
      onClick: () => zipFileInputRef.current?.click(),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, minWidth: 180 }}>
      <div style={{ display: 'flex', gap: 16, marginRight: 10 }}>
          <Dropdown menu={{ items: importMenuItems }} placement="bottom">
            <Button
              icon={<FileAddOutlined />}
              size="large"
              style={{
                borderRadius: '50%',
                width: 60,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Dropdown>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {zipLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(34, 189, 189, 0.1)',
              borderRadius: 20,
              border: '1px solid #00f2fe',
            }}
          >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span style={{ color: '#00f2fe' }}>Đang tải...</span>
          </div>
        )}
        {saveToBackendLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(255, 193, 7, 0.1)',
              borderRadius: 20,
              border: '1px solid #ffc107',
            }}
          >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span style={{ color: '#ffc107' }}>Đang lưu lên server...</span>
          </div>
        )}
        {zipError && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 77, 79, 0.1)',
              borderRadius: 20,
              border: '1px solid #ff4d4f',
              color: '#ff4d4f',
            }}
          >
            {zipError}
          </div>
        )}
        {saveToBackendError && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 77, 79, 0.1)',
              borderRadius: 20,
              border: '1px solid #ff4d4f',
              color: '#ff4d4f',
              fontSize: 12,
            }}
          >
            ⚠️ Lưu server: {saveToBackendError}
          </div>
        )}
        {zipFileName && !saveToBackendError && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(82, 196, 26, 0.1)',
              borderRadius: 20,
              border: '1px solid #52c41a',
              color: '#52c41a',
              fontSize: 12,
            }}
          >
            ✓ {zipFileName}
          </div>
        )}
      </div>
      <input
        ref={zipFileInputRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={handleZipFileChange}
      />
    </div>
  );
};

export default MapImport;