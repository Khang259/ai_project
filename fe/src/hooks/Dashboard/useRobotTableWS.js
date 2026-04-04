import { useState, useEffect, useRef, useCallback } from "react";
import { useArea } from "@/contexts/AreaContext";

/**
 * Hook WebSocket lấy dữ liệu robot cho RobotTable theo area (currAreaId từ AreaContext).
 * Mỗi lần đổi area: ngắt WS cũ (và bỏ hết handler để không ảnh hưởng ref), xóa data cũ, mở WS mới.
 * @returns {Object} { data, isConnected, error }
 */
export function useRobotTableWS() {
  const { currAreaId } = useArea();
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const areaIdRef = useRef(currAreaId);
  areaIdRef.current = currAreaId;

  const disconnect = useCallback((reason = "Client disconnecting") => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.close(1000, reason);
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (currAreaId == null) return;

    const API_HTTP_URL = import.meta.env.VITE_API_URL || 'http://localhost:6868';
    const WS_BASE_URL = API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));
    const WS_URL = `${WS_BASE_URL}/ws/group/${currAreaId}`;

    // Mỗi lần đổi area: ngắt WS cũ hẳn (gỡ handler rồi mới close để onclose cũ không null ref của socket mới)
    disconnect("Area changed");

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        try {
          const receivedData = JSON.parse(event.data);
          setData(receivedData);
        } catch (err) {
          console.error("[useRobotTableWS] Error parsing message:", err);
          setError("Lỗi định dạng dữ liệu");
        }
      };

      ws.onclose = (event) => {
        if (wsRef.current !== ws) return;
        setIsConnected(false);
        wsRef.current = null;
        if (event.code !== 1000) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (areaIdRef.current != null) connect();
          }, 3000);
        }
      };

      ws.onerror = (err) => {
        if (wsRef.current !== ws) return;
        console.error("[useRobotTableWS] WebSocket error:", err);
        setError("Lỗi kết nối WebSocket");
        setIsConnected(false);
      };
    } catch (err) {
      console.error("[useRobotTableWS] Error creating WebSocket:", err);
      setError("Không thể tạo kết nối WebSocket");
    }
  }, [currAreaId, disconnect]);

  useEffect(() => {
    if (currAreaId == null) {
      setData(null);
      setError(null);
      disconnect();
      return;
    }
    setData(null);
    setError(null);
    connect();
    return () => disconnect("Area change cleanup");
  }, [currAreaId, connect, disconnect]);

  return {
    data,
    isConnected,
    error,
  };
}

