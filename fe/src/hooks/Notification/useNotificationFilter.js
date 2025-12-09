import { useState, useCallback, useMemo } from "react";

export function useNotificationFilter(notifications, limit = 20) {
    const [searchNotificationProperty, setSearchNotificationProperty] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const mappedNotifications = useMemo(() => {
        return notifications.map((item) => ({
            source: item.alarm_source || "Unknown",
            area: item.area_id || "Unknown",
            group: item.group_id || "Unknown",
            alarmLevel: item.alarm_grade >= 10 ? "Fatal" : item.alarm_grade >= 5 ? "Alert" : "Warning",
            messageType: item.alarm_code || "Unknown",
            route: item.route_name || "Unknown",
            deviceNo: item.device_name || "--",
            abnormalReason: `${item.alarm_code}`,
            alarmTime: item.alarm_date ? new Date(item.alarm_date).toLocaleString("vi-VN") : "--",
            alarmTimeRaw: item.alarm_date,
        }));
    }, [notifications]);
    
    const filteredNotifications = useMemo(() => {
        let filtered = [...mappedNotifications];
    
        if (searchNotificationProperty.trim()) {
            filtered = filtered.filter(notification =>
                notification.source.toLowerCase().includes(searchNotificationProperty.toLowerCase()) ||
                notification.group.toLowerCase().includes(searchNotificationProperty.toLowerCase()) ||
                notification.messageType.toLowerCase().includes(searchNotificationProperty.toLowerCase()) ||
                notification.route.toLowerCase().includes(searchNotificationProperty.toLowerCase()) ||
                notification.deviceNo.toLowerCase().includes(searchNotificationProperty.toLowerCase()) ||
                notification.abnormalReason.toLowerCase().includes(searchNotificationProperty.toLowerCase())
            )
        }
    
        if (startDate || endDate) {
            filtered = filtered.filter(notification => {
                if (!notification.alarmTimeRaw) {
                    return false;
                }

                const alarmTime = new Date(notification.alarmTimeRaw);
                const alarmTimeOnly = new Date(alarmTime.toISOString().split('T')[0]);

                if (startDate && endDate) {
                    const start = new Date(startDate.toISOString().split('T')[0]);
                    const end = new Date(endDate.toISOString().split('T')[0]);
                    return alarmTimeOnly >= start && alarmTimeOnly <= end;
                } else if (startDate) {
                    const start = new Date(startDate.toISOString().split('T')[0]);
                    return alarmTimeOnly >= start;
                } else if (endDate) {
                    const end = new Date(endDate.toISOString().split('T')[0]);
                    return alarmTimeOnly <= end;
                }

                return true;
            });
        }
    
        return filtered;
    }, [mappedNotifications, startDate, endDate, searchNotificationProperty]);

    const paginatedNotifications = useMemo(() => {
        const startIndex = (currentPage - 1) * limit;
        const endIndex = startIndex + limit;
        return filteredNotifications.slice(startIndex, endIndex);
    }, [filteredNotifications, currentPage, limit]);

    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);
    
    const handleReset = useCallback(() => {
        setSearchNotificationProperty("");
        setStartDate(null);
        setEndDate(null);
        setCurrentPage(1);
    }, []);

    const totalPages = Math.ceil(filteredNotifications.length / limit);
    const total = filteredNotifications.length;
    const hasActiveFilters = searchNotificationProperty || startDate || endDate;

    return {
        currentPage,
        totalPages,
        total,
        paginatedNotifications,
        filteredNotifications,
        handlePageChange,
        hasActiveFilters,
        handleReset,

        startDate,
        setStartDate,
        endDate,
        setEndDate,

        searchNotificationProperty,
        setSearchNotificationProperty,
    };
}
