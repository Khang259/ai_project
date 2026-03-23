// hooks/Notification/useNotifications.js
import { useState, useEffect, useCallback } from "react";
import { getNotifications } from "@/services/notification";

export function useNotifications({limit = 20, page = 1, filters = {}}) {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const result = await getNotifications({ page, limit, filters });
        setNotifications(result.data || []);
        setTotal(result.total || 0);
    } catch (err) {
        console.error("[useNotifications] Error fetching notifications:", err);
        setError(err);
        setNotifications([]);
        setTotal(0);
    } finally {
        setLoading(false);
    }
  }, [page, limit, JSON.stringify(filters)]);

  // Gọi lại khi fetchNotifications thay đổi
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    total,
    refetch: fetchNotifications,
  };
}