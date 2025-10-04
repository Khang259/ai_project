import { useEffect, useState, useCallback } from 'react';

const API_HTTP_URL = import.meta.env.VITE_API_URL || '';
// Tự động chuyển http(s) -> ws(s) 11
const DEFAULT_WS_URL = API_HTTP_URL
  ? API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws')).replace(/^https/i, 'wss')
  : '';

const WS_URL = 'ws://192.168.1.6:8001/ws/full-agv-data'

const useAGVWebSocket = (url = WS_URL) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agvData, setAgvData] = useState(null);
  const [lastValidData, setLastValidData] = useState(null);
  const [error, setError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const connect = useCallback(() => {
    // Nếu đã có socket đang kết nối hoặc mở, không tạo mới
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return;
    }
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Debug WebSocket data structure
          if (Array.isArray(data)) {
            if (data[0]) {
              try {
                console.log('[WS RECEIVE] Array length:', data.length);
                console.log('[WS RECEIVE] First robot data:', data[0]);
                console.log('[WS RECEIVE] First robot devicePosition:', data[0].devicePosition);
                console.table(data.slice(0, 3)); // Show first 3 robots
              } catch {}
            }
          } else if (data && typeof data === 'object') {
            // Fallback: nếu là object, in keys của object
            console.log('[WS RECEIVE] Object keys:', Object.keys(data));
            console.log('[WS RECEIVE] Object data:', data);
          }

          // Store valid data and update current data
          if (data && (Array.isArray(data) || typeof data === 'object')) {
            setLastValidData(data);
          }
          setAgvData(data);
        } catch (err) {
          // Dữ liệu không phải JSON – không log thêm để tránh rác dữ lêu
          setError('Invalid data format received');
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setSocket(null);
        
        // Keep showing last valid data even when disconnected
        if (lastValidData && !agvData) {
          console.log('[WS] Using last valid data while disconnected');
          setAgvData(lastValidData);
        }
        
        if (event.code !== 1000 && !isReconnecting) {
          setError(`Connection lost (Code: ${event.code}). Reconnecting...`);
          setIsReconnecting(true);
          setTimeout(() => {
            setIsReconnecting(false);
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        setError('Connection error - Server may not be running');
        setIsConnected(false);
      };

      setSocket(ws);
      
    } catch (err) {
      setError('Failed to connect to server - Check if server is running');
    }
  }, [url, socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close(1000, 'Client disconnecting');
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  useEffect(() => {
    // Thêm delay nhỏ để đảm bảo server đã sẵn sàng
    const timer = setTimeout(() => {
      connect();
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, []); // Chỉ chạy 1 lần khi component mount

  // Tự động reconnect khi mất kết nối
  useEffect(() => {
    // Chỉ reconnect khi thực sự mất kết nối và không có socket và không đang reconnect
    if (!isConnected && !socket && error && !isReconnecting) {
      const timer = setTimeout(() => {
        connect();
      }, 3000);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isConnected, socket, error, isReconnecting]);

  return {
    isConnected,
    agvData,
    error,
    sendMessage,
    connect,
    disconnect
  };
};

export default useAGVWebSocket; 