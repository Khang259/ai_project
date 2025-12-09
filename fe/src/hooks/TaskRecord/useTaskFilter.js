// hooks/TaskRecord/useTaskFilter.js
import { useState, useMemo, useCallback } from "react";

export function useTaskFilter(tasks, limit = 20) {
    const [currentPage, setCurrentPage] = useState(1);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [searchTaskProperty, setSearchTaskProperty] = useState("");

    // Map all tasks first
    const mappedTasks = useMemo(() => {
        return tasks.map((item) => ({
            order_id: item.order_id || "Unknown",
            device_code: item.device_code || "Unknown",
            model_process_code: item.model_process_code || "Unknown",
            device_num: item.device_num || "--",
            qr_code: item.qr_code || "--",
            status: item.status || "Unknown",
            group: item.group_id || "Unknown",
            route: item.route_name || "Unknown",
            updated_at: item.updated_at ? new Date(item.updated_at).toLocaleString("vi-VN") : "--",
            updated_at_raw: item.updated_at,
        }));
    }, [tasks]);

    // Client-side filtering
    const filteredTasks = useMemo(() => {
        let filtered = [...mappedTasks];

        if (searchTaskProperty.trim()) {
            filtered = filtered.filter(task =>
                task.order_id.toLowerCase().includes(searchTaskProperty.toLowerCase()) ||
                task.device_num.toLowerCase().includes(searchTaskProperty.toLowerCase())
            );
        }

        // Filter by date range
        if (startDate || endDate) {
            filtered = filtered.filter(task => {
                if (!task.updated_at_raw) return false;

                const taskDate = new Date(task.updated_at_raw);
                const taskDateOnly = new Date(taskDate.toISOString().split('T')[0]);

                if (startDate && endDate) {
                    const start = new Date(startDate.toISOString().split('T')[0]);
                    const end = new Date(endDate.toISOString().split('T')[0]);
                    return taskDateOnly >= start && taskDateOnly <= end;
                } else if (startDate) {
                    const start = new Date(startDate.toISOString().split('T')[0]);
                    return taskDateOnly >= start;
                } else if (endDate) {
                    const end = new Date(endDate.toISOString().split('T')[0]);
                    return taskDateOnly <= end;
                }

                return true;
            });
        }

        return filtered;
    }, [mappedTasks, startDate, endDate, searchTaskProperty]);

    // Pagination for filtered results
    const paginatedTasks = useMemo(() => {
        const startIndex = (currentPage - 1) * limit;
        const endIndex = startIndex + limit;
        return filteredTasks.slice(startIndex, endIndex);
    }, [filteredTasks, currentPage, limit]);

    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const handleReset = useCallback(() => {
        setSearchTaskProperty("");
        setStartDate(null);
        setEndDate(null);
        setCurrentPage(1);
    }, []);

    const totalPages = Math.ceil(filteredTasks.length / limit);
    const total = filteredTasks.length;
    const hasActiveFilters = searchTaskProperty || startDate || endDate ;

    return {
        // Filter states
        searchTaskProperty,
        setSearchTaskProperty,
        startDate,
        setStartDate,
        endDate,
        setEndDate,

        // Pagination states
        currentPage,
        totalPages,

        // Data
        paginatedTasks,
        filteredTasks,
        total,

        // Handlers
        handlePageChange,
        handleReset,

        // Flags
        hasActiveFilters,
    };
}
