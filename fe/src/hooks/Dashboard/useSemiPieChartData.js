import { useState, useEffect, useCallback } from "react";
import { useArea } from "@/contexts/AreaContext";
import { getTaskStatistics } from "@/services/Dashboard/taskStatistics";

/**
 * Hook lấy dữ liệu cho SemiPieChart.
 * Tự lấy currAreaId từ AreaContext và gửi area_id khi gọi API.
 * @returns {Object} Dữ liệu và refetch function
 */
export function useSemiPieChartData() {
  const { currAreaId, currDashboardGroupId } = useArea();
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await getTaskStatistics(currAreaId, currDashboardGroupId);
      setData(response);
    } catch (err) {
      console.error("[useSemiPieChartData] Error fetching data:", err);
    }
  }, [currAreaId, currDashboardGroupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    refetch: fetchData,
  };
}

