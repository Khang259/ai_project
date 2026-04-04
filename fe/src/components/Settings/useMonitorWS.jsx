import { useEffect, useRef } from 'react';

const API_HTTP_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_WS_URL = API_HTTP_URL
  ? API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws')).replace(/^https/i, 'wss')
  : '';
const WS_URL = DEFAULT_WS_URL 
  ? `${DEFAULT_WS_URL}/ws/monitor-data`
  : 'ws://192.168.1.202:8001/ws/monitor-data';

export default function useMonitorWS(onChanged) {
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = () => {
      onChanged?.(); // bất kỳ message nào cũng refetch
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          try { /* đơn giản: khởi tạo lại */ new WebSocket(WS_URL); } catch {}
        }
      }, 3000);
    };

    return () => {
      try { ws.close(1000, 'unmount'); } catch {}
      wsRef.current = null;
    };
  }, [onChanged]);
}