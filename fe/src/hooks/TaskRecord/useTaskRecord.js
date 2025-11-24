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
            console.log('[useTaskRecord] Result from service:', result);
            console.log('[useTaskRecord] Data array:', result.data);
            console.log('[useTaskRecord] Data length:', result.data?.length);
            setTasks(result.data || []);
            setTotal(result.total || 0);
        } catch (err) {
            console.error("[useTaskRecord] Error fetching tasks:", err);
            setError(err);
            setTasks([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, limit, filters]);

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