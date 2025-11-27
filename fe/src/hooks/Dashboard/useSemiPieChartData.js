import { useState, useEffect, useCallback } from "react";
import { getTaskStatistics, formatSemiPieChartData } from "@/services/Dashboard/taskStatistics";

/**
 * Hook để lấy dữ liệu cho SemiPieChart (week hoặc month)
 * Sử dụng: completed_tasks_by_week/month, total_tasks_by_week/month
 * @param {Object} options - Các tùy chọn
 * @param {string} options.period - "week" hoặc "month"
 * @returns {Object} Dữ liệu và trạng thái
 */
export function useSemiPieChartData({ period }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!period || (period !== "week" && period !== "month")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getTaskStatistics();
      const formattedData = formatSemiPieChartData(response, period);
      setData(formattedData);
    } catch (err) {
      console.error("[useSemiPieChartData] Error fetching data:", err);
      setError(err.message || "Lỗi khi tải dữ liệu biểu đồ");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

