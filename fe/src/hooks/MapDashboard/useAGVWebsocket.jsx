import { useEffect, useState, useCallback, useRef } from 'react';

const API_HTTP_URL = import.meta.env.VITE_API_URL || '';
const WS_BASE = API_HTTP_URL
  ? API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws')).replace(/^https/i, 'wss')
  : 'ws://localhost:6868';

/**
 * Kết nối WebSocket giống dashboard robot data.
 * - Nếu groupId (area_id) được truyền: kết nối tới /ws/group/{groupId} để nhận message type "agv_info" cho area đó.
 * - Message từ backend: { type: "agv_info", info, data: robots_list }. Mỗi robot có devicePosition.
 * - Nếu không truyền groupId: kết nối tới /ws/full-agv-data (giữ tương thích cũ).
 */
const useAGVWebSocket = (groupId = null) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [agvData, setAgvData] = useState(null);
  const [lastValidData, setLastValidData] = useState(null);
  const [error, setError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wsRef = useRef(null);

  const url = groupId != null && String(groupId).trim() !== ''
    ? `${WS_BASE}/ws/group/${groupId}`
    : `${WS_BASE}/ws/full-agv-data`;

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Reconnect');
      } catch (e) {}
      wsRef.current = null;
    }
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          let robotsList = null;
          if (data && data.type === 'agv_info' && Array.isArray(data.data)) {
            robotsList = data.data;
            setLastValidData(robotsList);
            setAgvData(robotsList);
            return;
          }
          if (data && (Array.isArray(data) || typeof data === 'object')) {
            setLastValidData(data);
          }
          setAgvData(data);
        } catch (err) {
          setError('Invalid data format received');
        }
      };

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        setIsConnected(false);
        setSocket(null);
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
  }, [url]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Client disconnecting');
      } catch (e) {}
      wsRef.current = null;
    }
    setSocket(null);
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  useEffect(() => {
    const timer = setTimeout(() => connect(), 1000);
    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [url]); // Reconnect khi đổi groupId (url)

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