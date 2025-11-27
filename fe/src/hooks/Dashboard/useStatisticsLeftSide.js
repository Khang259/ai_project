import { useState, useEffect, useCallback } from "react";
import { getTaskStatistics, formatStatisticsLeftSide } from "@/services/Dashboard/taskStatistics";

/**
 * Hook để lấy dữ liệu thống kê tổng quan cho StatisticsLeftSide
 * Sử dụng: completed_tasks, in_progress_tasks, failed_tasks, cancelled_tasks
 * @returns {Object} Dữ liệu và trạng thái
 */
export function useStatisticsLeftSide() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTaskStatistics();
      const formattedData = formatStatisticsLeftSide(response);
      setData(formattedData);
    } catch (err) {
      console.error("[useStatisticsLeftSide] Error fetching data:", err);
      setError(err.message || "Lỗi khi tải dữ liệu thống kê");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

