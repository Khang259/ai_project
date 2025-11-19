import React, { useEffect } from 'react';
import useMonitorWebSocket from '../hooks/useMonitorWebSocket';

/**
 * Component test đơn giản để kiểm tra dữ liệu WebSocket
 * Chỉ in ra console, không render gì cả
 */
const MonitorWebSocketTest = () => {
  // Lấy group_id từ URL hoặc mặc định là '1'
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('group_id') || localStorage.getItem('group_id') || '1';
  
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           WebSocket Test Component Started                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('🔑 Group ID:', groupId);
  console.log('');

  // Kết nối WebSocket
  const { isConnected, monitorData, error } = useMonitorWebSocket(groupId);

  // Log khi connection status thay đổi
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 CONNECTION STATUS CHANGED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Connected:', isConnected);
    console.log('Error:', error || 'None');
    console.log('Timestamp:', new Date().toISOString());
    console.log('');
  }, [isConnected, error]);

  // Log tất cả dữ liệu WebSocket nhận được
  useEffect(() => {
    if (!monitorData) {
      console.log('⏳ Waiting for WebSocket data...');
      return;
    }

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              📨 NEW WEBSOCKET MESSAGE RECEIVED                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('');
    
    console.log('📋 DATA TYPE:', typeof monitorData);
    console.log('📋 IS ARRAY:', Array.isArray(monitorData));
    console.log('');

    // Kiểm tra các thuộc tính chính
    if (typeof monitorData === 'object' && monitorData !== null) {
      console.log('🔍 OBJECT KEYS:', Object.keys(monitorData));
      console.log('');

      // In từng thuộc tính quan trọng
      if (monitorData.type) {
        console.log('📌 MESSAGE TYPE:', monitorData.type);
      }
      if (monitorData.group_id !== undefined) {
        console.log('🎯 GROUP ID:', monitorData.group_id);
      }
      if (monitorData.order_id !== undefined) {
        console.log('📦 ORDER ID:', monitorData.order_id);
      }
      if (monitorData.node_name !== undefined) {
        console.log('🏷️  NODE NAME:', monitorData.node_name);
      }
      if (monitorData.node_type !== undefined) {
        console.log('🔖 NODE TYPE:', monitorData.node_type);
      }
      if (monitorData.start !== undefined) {
        console.log('▶️  START:', monitorData.start);
      }
      if (monitorData.end !== undefined) {
        console.log('⏹️  END:', monitorData.end);
      }
      console.log('');

      // In tasks nếu có
      if (monitorData.tasks && Array.isArray(monitorData.tasks)) {
        console.log('📋 TASKS (' + monitorData.tasks.length + ' items):');
        console.log('─────────────────────────────────────────────────────────────');
        monitorData.tasks.forEach((task, index) => {
          console.log(`\n  Task #${index + 1}:`);
          console.log('  ├─ device_code:', task.device_code || 'N/A');
          console.log('  ├─ qr_code:', task.qr_code || 'N/A');
          console.log('  ├─ shelf_number:', task.shelf_number || 'N/A');
          console.log('  ├─ status:', task.status || 'N/A');
          console.log('  ├─ order_id:', task.order_id || 'N/A');
          console.log('  └─ group_id:', task.group_id || 'N/A');
        });
        console.log('');
      }
    }

    // In toàn bộ JSON
    console.log('📄 FULL JSON DATA:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(JSON.stringify(monitorData, null, 2));
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('');

  }, [monitorData]);

  // Render UI đơn giản
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'monospace',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '600px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
          🔍 WebSocket Test Monitor
        </h1>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: isConnected ? '#4ade80' : '#f87171',
            boxShadow: isConnected 
              ? '0 0 20px #4ade80' 
              : '0 0 20px #f87171',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {isConnected ? '✅ Connected' : '❌ Disconnected'}
          </span>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '10px',
          marginTop: '20px'
        }}>
          <p style={{ fontSize: '1.2rem', margin: '10px 0' }}>
            <strong>Group ID:</strong> {groupId}
          </p>
          {error && (
            <p style={{ fontSize: '1rem', margin: '10px 0', color: '#fca5a5' }}>
              <strong>Error:</strong> {error}
            </p>
          )}
        </div>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '10px',
          fontSize: '0.9rem'
        }}>
          <p>📊 Mở <strong>Console/DevTools</strong> để xem chi tiết dữ liệu WebSocket</p>
          <p style={{ marginTop: '10px', opacity: 0.8 }}>
            (F12 → Console tab)
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default MonitorWebSocketTest;

