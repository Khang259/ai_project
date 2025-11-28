// src/components/RobotTable.jsx
import React from 'react';
import { useRobotTableWS } from '@/hooks/Dashboard/useRobotTableWS';

const RobotTable = () => {
  const { data, isConnected, error } = useRobotTableWS();

  // Xử lý dữ liệu từ WebSocket
  const robots = React.useMemo(() => {
    if (!data) return [];
    
    // Dữ liệu có cấu trúc: { type: "agv_info", data: [...] }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((item) => ({
        id: item.device_code || 'Unknown',
        name: item.device_name || 'Unknown',
        speed: item.speed || 0,
        battery: item.battery || 0,
      }));
    }
    
    return [];
  }, [data]);

  const getSpeedStyle = (speed) => {
    if (speed > 0) return { backgroundColor: '#10b981', color: 'white' };
    return { backgroundColor: '#ef4444', color: 'white' };
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
        {!isConnected && (
          <span style={{ fontSize: '14px', color: '#f59e0b', marginLeft: '10px' }}>
            (Đang kết nối...)
          </span>
        )}
      </h2>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', marginBottom: '16px' }}>
          Lỗi: {error}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{}}>
              <th style={thStyle}>Tên Robot</th>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Tốc độ</th>
              <th style={thStyle}>Pin (%)</th>
            </tr>
          </thead>
          <tbody>
            {robots.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              robots.map((robot) => (
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
                      ...getSpeedStyle(robot.speed),
                    }}
                  >
                    {robot.speed} km/h
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
              ))
            )}
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