import { useState, useEffect, useCallback } from "react";
import { getGraphChartData, formatGraphChartData } from "@/services/Dashboard/graphChart";

/**
 * Hook để lấy dữ liệu hiệu suất làm việc cho GraphChart
 * @returns {Object} Dữ liệu chart
 */
export function useGraphChart() {
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await getGraphChartData();
      const formattedData = formatGraphChartData(response);
      setData(formattedData);
    } catch (err) {
      console.error("[useGraphChart] Error fetching data:", err);
      setData(null);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, refetch: fetchData };
}

