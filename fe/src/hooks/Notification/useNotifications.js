// hooks/Notification/useNotifications.js
import { useState, useEffect, useCallback } from "react";
import { getNotifications } from "@/services/notification";
//import { startFakeWebSocket, stopFakeWebSocket } from "@/services/fakeWebSocket";

// let socket = null;

export function useNotifications({
  limit = 20,
  searchQuery = "",
  priorityFilter = "all",
  startDate = null,
  endDate = null,
  startTime = "",
  endTime = "",
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState();


  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {

      const filters = {};

      if (searchQuery) {
        filters.device_name = searchQuery;
        filters.alarm_code = searchQuery;
      }
      if (priorityFilter && priorityFilter !== "all") {
        // Ví dụ: Low < 5, Medium: 5-8, High: 9-10, Alert: 10
        if (priorityFilter === "Low") filters.alarm_grade_lte = 4;
        if (priorityFilter === "Medium") {
          filters.alarm_grade_gte = 5;
          filters.alarm_grade_lte = 8;
        }
        if (priorityFilter === "High" || priorityFilter === "Alert") {
          filters.alarm_grade_gte = 9;
        }
      }

      // Xử lý ngày giờ (nếu backend hỗ trợ)
      if (startDate) {
        const start = new Date(startDate);
        if (startTime) {
          const [h, m] = startTime.split(":");
          start.setHours(h, m);
        }
        filters.start_date = start.toISOString();
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endTime) {
          const [h, m] = endTime.split(":");
          end.setHours(h, m);
        } else {
          end.setHours(23, 59, 59);
        }
        filters.end_date = end.toISOString();
      }

      const result = await getNotifications({
        limit,
        filters,
      });

      setNotifications(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [limit, searchQuery, priorityFilter, startDate, endDate, startTime, endTime]);

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