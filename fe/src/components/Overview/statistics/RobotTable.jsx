// src/components/RobotTable.jsx
import React from 'react';

const RobotTable = () => {
  const robots = [
    { id: 'RB-001', name: 'Robot Alpha', status: 'active', battery: 85 },
    { id: 'RB-002', name: 'Robot Beta', status: 'maintenance', battery: 45 },
    { id: 'RB-003', name: 'Robot Gamma', status: 'stopped', battery: 15 },
    { id: 'RB-004', name: 'Robot Delta', status: 'active', battery: 100 },
    { id: 'RB-005', name: 'Robot Epsilon', status: 'active', battery: 72 },
    { id: 'RB-006', name: 'Robot Zeta', status: 'maintenance', battery: 30 },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': return { backgroundColor: '#10b981', color: 'white' };
      case 'maintenance': return { backgroundColor: '#f59e0b', color: 'white' };
      case 'stopped': return { backgroundColor: '#ef4444', color: 'white' };
      default: return { backgroundColor: '#6b7280', color: 'white' };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Hoạt động';
      case 'maintenance': return 'Bảo trì';
      case 'stopped': return 'Dừng';
      default: return 'Không xác định';
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 70) return '#10b981';
    if (percent >= 30) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div
      style={{
        width: '100%',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#e2e8f0',
      }}
    >
      <h2
        style={{
          textAlign: 'left',
          color: '#ffffff',
          fontSize: '26px',
          fontWeight: 'bold',
          paddingBottom: '12px',
        }}
      >
        Danh sách Robot
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{}}>
              <th style={thStyle}>Tên Robot</th>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Pin (%)</th>
            </tr>
          </thead>
          <tbody>
            {robots.map((robot) => (
              <tr key={robot.id}>
                {/* Tên Robot */}
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {robot.name}
                  </div>
                </td>

                {/* ID */}
                <td style={tdStyle}>{robot.id}</td>

                {/* Trạng thái - ĐÃ SỬA LỖI TẠI ĐÂY */}
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      ...getStatusStyle(robot.status),
                    }}
                  >
                    {getStatusText(robot.status)}
                  </span>
                </td>

                {/* Pin + Progress Bar */}
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ minWidth: '35px', fontWeight: 'bold' }}>
                      {robot.battery}%
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: '10px',
                        backgroundColor: '#334155',
                        borderRadius: '5px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${robot.battery}%`,
                          backgroundColor: getProgressColor(robot.battery),
                          borderRadius: '5px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  color: '#cbd5e1',
  fontWeight: 'bold',
  fontSize: '15px',
  borderBottom: '1px solid #334155',
};

const tdStyle = {
  padding: '12px',
  fontSize: '15px',
  borderBottom: '1px solid #334155',
};

export default RobotTable;