import { useState, useCallback, useMemo } from "react";

export function useNotificationFilter(notifications, limit = 20) {
    const [searchNotificationProperty, setSearchNotificationProperty] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('all');

    const mappedNotifications = useMemo(() => {
        return notifications.map((item) => ({
            source: item.alarm_source || "Unknown",
            area: item.area_id != null && item.area_id !== "" ? String(item.area_id) : "—",
            group: item.group_id != null && item.group_id !== "" && item.group_id !== "No Group" ? String(item.group_id) : "—",
            alarmLevel: item.alarm_grade >= 10 ? "Fatal" : item.alarm_grade >= 5 ? "Alert" : "Warning",
            messageType: item.alarm_code || "Unknown",
            route: item.route_id != null && item.route_id !== "" && item.route_id !== "No Route" ? String(item.route_id) : "—",
            deviceNo: item.device_name || "--",
            abnormalReason: `${item.alarm_code}`,
            alarmTime: item.alarm_date ? new Date(item.alarm_date).toLocaleString("vi-VN") : "--",
            alarmTimeRaw: item.alarm_date,
        }));
    }, [notifications]);
    
    const filteredNotifications = useMemo(() => {
        let filtered = [...mappedNotifications];
    
        if (searchNotificationProperty.trim()) {
            const q = searchNotificationProperty.toLowerCase();
            filtered = filtered.filter(notification =>
                (notification.source && notification.source.toLowerCase().includes(q)) ||
                (notification.area && String(notification.area).toLowerCase().includes(q)) ||
                (notification.group && notification.group.toLowerCase().includes(q)) ||
                (notification.messageType && notification.messageType.toLowerCase().includes(q)) ||
                (notification.route && notification.route.toLowerCase().includes(q)) ||
                (notification.deviceNo && notification.deviceNo.toLowerCase().includes(q)) ||
                (notification.abnormalReason && notification.abnormalReason.toLowerCase().includes(q))
            );
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

        if (priorityFilter !== 'all') {
            filtered = filtered.filter(notification => notification.alarmLevel === priorityFilter);
        }
    
        return filtered;
    }, [mappedNotifications, startDate, endDate, searchNotificationProperty, priorityFilter]);

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
        setPriorityFilter('all');
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
        priorityFilter,
        setPriorityFilter,
    };
}
