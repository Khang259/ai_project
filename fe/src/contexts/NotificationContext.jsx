// contexts/NotificationContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { startFakeWebSocket, stopFakeWebSocket } from "@/services/fakeServices/fakeWebSocket";

const NotificationContext = createContext();

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotificationContext must be used within NotificationProvider");
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const location = useLocation();

    // Danh sách routes KHÔNG nhận toast
    const EXCLUDED_ROUTES = ["/mobile-grid-display", "/login"];

    useEffect(() => {
        // Callback xử lý message từ fake websocket
        const handleWebSocketMessage = (event) => {
            try {
                const notification = JSON.parse(event.data);

                // ✅ CHẶN toast nếu đang ở excluded route
                if (EXCLUDED_ROUTES.includes(location.pathname)) {
                    //console.log("[NOTIFICATION] Toast blocked at route:", location.pathname);
                    return;
                }

                // Xác định loại toast dựa vào alarm_grade
                const toastType = notification.alarm_grade >= 9
                    ? "error"
                    : notification.alarm_grade >= 5
                        ? "warning"
                        : "info";

                // Hiển thị toast
                toast[toastType](`${notification.alarm_code}`, {
                    description: `${notification.device_name} - ${notification.route_name}`,
                    duration: 5000,
                    position: "top-right",
                });

                //console.log("[NOTIFICATION] Toast displayed:", notification);
            } catch (error) {
                console.error("[NOTIFICATION] Error parsing websocket message:", error);
            }
        };

        // Bật fake websocket cho giao diện UI khi dev đợi tín hiệu websocket từ backend
        if (import.meta.env.DEV) {
            startFakeWebSocket(handleWebSocketMessage);
        }

        // Cleanup khi unmount
        return () => {
            if (import.meta.env.DEV) {
                stopFakeWebSocket();
            }
        };
    }, [location.pathname]); // ← Re-run khi route thay đổi

    return (
        <NotificationContext.Provider value={{}}>
            {children}
        </NotificationContext.Provider>
    );
};
