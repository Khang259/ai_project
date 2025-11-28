import { useState, useEffect, useCallback } from "react";
import { getTaskStatistics } from "@/services/Dashboard/taskStatistics";

/**
 * Hook để lấy dữ liệu thống kê tổng quan cho StatisticsLeftSide
 * Trả về raw data từ API: completed_tasks, in_progress_tasks, failed_tasks, cancelled_tasks
 * @returns {Object} Dữ liệu và refetch function
 */
export function useStatisticsLeftSide() {
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await getTaskStatistics();
      setData(response); 
    } catch (err) {
      console.error("[useStatisticsLeftSide] Error fetching data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    refetch: fetchData,
  };
}

