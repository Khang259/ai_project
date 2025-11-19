import { useEffect, useState, useCallback } from 'react';

const API_HTTP_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.110:8001';
// Chuyển http(s) -> ws(s)
const WS_BASE_URL = API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));

/**
 * Custom hook để kết nối WebSocket với group_id
 * Nhận data từ backend qua clear-monitor và put_to_service
 */
const useMonitorWebSocket = (groupId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [monitorData, setMonitorData] = useState(null);
  const [error, setError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const connect = useCallback(() => {
    if (!groupId) {
      setError('Group ID is required');
      return;
    }

    // Nếu đã có socket đang kết nối hoặc mở, không tạo mới
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return;
    }
    
    try {
      const wsUrl = `${WS_BASE_URL}/ws/group/${groupId}`;
      console.log(`[Monitor WS] Connecting to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`[Monitor WS] Connected to group ${groupId}`);
        setIsConnected(true);
        setError(null);
        setIsReconnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[Monitor WS] Received data:`, data);
          
          // Xử lý theo type của message
          if (data.type === 'Initial') {
            // Clear monitor - reset về trạng thái ban đầu
            console.log(`[Monitor WS] Initial monitor for group ${data.group_id}`);
            setMonitorData(data);
          } else if (data.type === 'Clear') {
            // Clear một order_id cụ thể
            console.log(`[Monitor WS] Clear order ${data.order_id} from group ${data.group_id}`);
            setMonitorData(data);
          } else if (Array.isArray(data)) {
            // Danh sách tasks từ /task-status
            console.log(`[Monitor WS] Received ${data.length} tasks`);
            setMonitorData({ type: 'TaskUpdate', tasks: data });
          } else {
            // Data khác
            setMonitorData(data);
          }
        } catch (err) {
          console.error('[Monitor WS] Error parsing data:', err);
          setError('Invalid data format received');
        }
      };

      ws.onclose = (event) => {
        console.log(`[Monitor WS] Connection closed (Code: ${event.code})`);
        setIsConnected(false);
        setSocket(null);
        
        if (event.code !== 1000 && !isReconnecting) {
          setError(`Connection lost. Reconnecting...`);
          setIsReconnecting(true);
          setTimeout(() => {
            setIsReconnecting(false);
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[Monitor WS] Connection error:', error);
        setError('Connection error - Server may not be running');
        setIsConnected(false);
      };

      setSocket(ws);
      
    } catch (err) {
      console.error('[Monitor WS] Failed to connect:', err);
      setError('Failed to connect to server');
    }
  }, [groupId, socket, isReconnecting]);

  const disconnect = useCallback(() => {
    if (socket) {
      console.log('[Monitor WS] Disconnecting...');
      socket.close(1000, 'Client disconnecting');
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('[Monitor WS] Cannot send message - socket not open');
    }
  }, [socket]);

  // Kết nối khi component mount hoặc groupId thay đổi
  useEffect(() => {
    if (!groupId) return;

    const timer = setTimeout(() => {
      connect();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [groupId]);

  // Tự động reconnect khi mất kết nối
  useEffect(() => {
    if (!isConnected && !socket && error && !isReconnecting && groupId) {
      const timer = setTimeout(() => {
        console.log('[Monitor WS] Attempting to reconnect...');
        connect();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, socket, error, isReconnecting, groupId]);

  return {
    isConnected,
    monitorData,
    error,
    sendMessage,
    connect,
    disconnect
  };
};

export default useMonitorWebSocket;

