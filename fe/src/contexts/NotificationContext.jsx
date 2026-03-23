// contexts/NotificationContext.jsx
import React, { createContext, useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useArea } from "@/contexts/AreaContext";

const NotificationContext = createContext();

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotificationContext must be used within NotificationProvider");
    }
    return context;
};

// Các trang không cần WS notification (standalone pages)
const WS_EXCLUDED_PATHS = ["/vhl-interface", "/monitor", "/monitor-packaged", "/caller-we", "/mobile-grid-display", "/login"];

export const NotificationProvider = ({ children }) => {
    const location = useLocation();
    const { currAreaId } = useArea();

    // Danh sách routes KHÔNG hiện toast (subset của WS_EXCLUDED_PATHS)
    const EXCLUDED_ROUTES = ["/mobile-grid-display", "/login"];

    // Refs để lưu trữ websocket và state
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const isReconnectingRef = useRef(false);
    const locationPathnameRef = useRef(location.pathname);
    locationPathnameRef.current = location.pathname;

    const isWSExcluded = WS_EXCLUDED_PATHS.some((p) => location.pathname.startsWith(p));

    useEffect(() => {
        // Không kết nối WS trên các trang standalone / không cần notification
        if (currAreaId == null || isWSExcluded) {
            if (wsRef.current) {
                wsRef.current.close(1000, "No area or excluded route");
                wsRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            isReconnectingRef.current = false;
            return;
        }

        const handleWebSocketMessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                // Chỉ xử lý message có type === "notification" (từ notification_service)
                if (payload.type !== "notification") return;

                if (EXCLUDED_ROUTES.includes(locationPathnameRef.current)) return;

                const toastType = payload.alarm_grade >= 9
                    ? "error"
                    : payload.alarm_grade >= 5
                        ? "warning"
                        : "info";

                const description = payload.route_id
                    ? `${payload.device_name} - ${payload.route_id}`
                    : payload.device_name || "";

                toast[toastType](
                    <span className="text-black text-lg font-medium block min-w-0 max-w-full truncate" title={payload.alarm_code ?? "Alarm"}>
                        {payload.alarm_code ?? "Alarm"}
                    </span>,
                    {
                        description: (
                            <span className="text-black text-lg block line-clamp-2 break-words">
                                {description}
                            </span>
                        ),
                        duration: 5000,
                        position: "top-right",
                    }
                );
            } catch (error) {
                console.error("[NOTIFICATION] Error parsing websocket message:", error);
            }
        };

        const API_HTTP_URL = import.meta.env.VITE_API_URL || "http://localhost:6868";
        const WS_BASE_URL = API_HTTP_URL.replace(/^http/i, (m) => (m.toLowerCase() === "https" ? "wss" : "ws"));
        const WS_URL = `${WS_BASE_URL}/ws/group/${currAreaId}`;

        const connect = () => {
            try {
                console.log(`[NOTIFICATION WS] Connecting to: ${WS_URL} (area_id=${currAreaId})`);
                const ws = new WebSocket(WS_URL);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log("[NOTIFICATION WS] Connected");
                    isReconnectingRef.current = false;
                };

                ws.onmessage = handleWebSocketMessage;

                ws.onerror = (error) => {
                    console.error("[NOTIFICATION WS] Connection error:", error);
                };

                ws.onclose = (event) => {
                    console.log(`[NOTIFICATION WS] Connection closed (Code: ${event.code})`);
                    wsRef.current = null;

                    if (event.code !== 1000 && !isReconnectingRef.current) {
                        isReconnectingRef.current = true;
                        reconnectTimeoutRef.current = setTimeout(() => {
                            console.log("[NOTIFICATION WS] Attempting to reconnect...");
                            connect();
                        }, 3000);
                    }
                };
            } catch (error) {
                console.error("[NOTIFICATION WS] Failed to connect:", error);
                if (!isReconnectingRef.current) {
                    isReconnectingRef.current = true;
                    reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
                }
            }
        };

        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close(1000, "Component unmounting or area change");
                wsRef.current = null;
            }
            isReconnectingRef.current = false;
        };
    }, [currAreaId, isWSExcluded]);

    return (
        <NotificationContext.Provider value={{}}>
            {children}
        </NotificationContext.Provider>
    );
};
