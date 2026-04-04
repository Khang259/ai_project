// hooks/TaskRecord/useTaskFilter.js
import { useState, useMemo, useCallback, useEffect } from "react";

export function useTaskFilter(tasks, limit = 20) {
    const [currentPage, setCurrentPage] = useState(1);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [searchTaskProperty, setSearchTaskProperty] = useState("");
    const [statusFilter, setStatusFilter] = useState(""); // "" | "completed" | "cancel" | "failed"

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
            updated_at: item.updated_at ? new Date(item.updated_at).toLocaleString("vi-VN") : "--",
            updated_at_raw: item.updated_at,
        }));
    }, [tasks]);

    // Client-side filtering
    const filteredTasks = useMemo(() => {
        let filtered = [...mappedTasks];

        if (searchTaskProperty.trim()) {
            const q = searchTaskProperty.toLowerCase().trim();
            filtered = filtered.filter(task =>
                task.order_id.toLowerCase().includes(q) ||
                task.device_num.toLowerCase().includes(q) ||
                task.model_process_code.toLowerCase().includes(q)
            );
        }

        // Filter by date/datetime range (so sánh full timestamp; data theo phút nên lọc theo khoảng)
        if (startDate || endDate) {
            filtered = filtered.filter(task => {
                if (!task.updated_at_raw) return false;
                const taskTime = new Date(task.updated_at_raw).getTime();

                if (startDate && endDate) {
                    return taskTime >= startDate.getTime() && taskTime <= endDate.getTime();
                }
                if (startDate) return taskTime >= startDate.getTime();
                if (endDate) return taskTime <= endDate.getTime();
                return true;
            });
        }

        // Filter by status: completed, cancel, failed
        if (statusFilter) {
            filtered = filtered.filter(task => task.status === statusFilter);
        }

        return filtered;
    }, [mappedTasks, startDate, endDate, searchTaskProperty, statusFilter]);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter]);

    const handleReset = useCallback(() => {
        setSearchTaskProperty("");
        setStartDate(null);
        setEndDate(null);
        setStatusFilter("");
        setCurrentPage(1);
    }, []);

    const totalPages = Math.ceil(filteredTasks.length / limit);
    const total = filteredTasks.length;
    const hasActiveFilters = searchTaskProperty || startDate || endDate || statusFilter;

    return {
        // Filter states
        searchTaskProperty,
        setSearchTaskProperty,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        statusFilter,
        setStatusFilter,

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
