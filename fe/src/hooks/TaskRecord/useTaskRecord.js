// hooks/TaskRecord/useTaskRecord.js
import { useState, useEffect, useCallback } from "react";
import { getTaskRecord } from "@/services/taskRecord";

export function useTaskRecord({ page = 1, limit = 20, filters = {} }) {
    const [tasks, setTasks] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getTaskRecord({ page, limit, filter: filters });
            const statusMap = {
                "1": "start",
                "2": "process",
                "3": "completed",
                "4": "cancel",
                "5": "failed"
            };

            const transformedData = (result.data || []).map(task => {
                const { shelf_number, status, ...rest } = task;
                return {
                    ...rest,
                    status: statusMap[status?.toString()] || status
                };
            });
            setTasks(transformedData);
            setTotal(result.total || 0);
        } catch (err) {
            console.error("[useTaskRecord] Error fetching tasks:", err);
            setError(err);
            setTasks([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, limit, JSON.stringify(filters)]);  // Sử dụng JSON.stringify(filters) trong deps để stable dựa trên nội dung object

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return {
        tasks,
        total,
        loading,
        error,
        refetch: fetchTasks,
    };
}