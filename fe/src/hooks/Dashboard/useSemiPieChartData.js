import { useState, useEffect, useCallback } from "react";
import { getTaskStatistics } from "@/services/Dashboard/taskStatistics";

/**
 * Hook để lấy dữ liệu cho SemiPieChart
 * Trả về raw data từ API: completed_tasks_by_week/month, total_tasks_by_week/month
 * Format được thực hiện trong component
 * @returns {Object} Dữ liệu và refetch function
 */
export function useSemiPieChartData() {
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await getTaskStatistics();
      setData(response);
    } catch (err) {
      console.error("[useSemiPieChartData] Error fetching data:", err);
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

