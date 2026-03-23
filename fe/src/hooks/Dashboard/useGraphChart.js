import { useState, useEffect } from "react";
import { useArea } from "@/contexts/AreaContext";
import { getGraphChartData, formatGraphChartData } from "@/services/Dashboard/graphChart";

/**
 * Hook lấy dữ liệu hiệu suất làm việc cho GraphChart (API area-efficiency-8d).
 * Tự lấy currAreaId từ AreaContext và truyền area_id khi gọi API.
 * @returns {Object} { data, refetch }
 */
export function useGraphChart() {
  const { currAreaId, currDashboardGroupId } = useArea();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getGraphChartData(currAreaId, currDashboardGroupId);
        const formattedData = formatGraphChartData(response);
        setData(formattedData);
      } catch (err) {
        console.error("[useGraphChart] Error fetching data:", err);
        setData(null);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [currAreaId, currDashboardGroupId]);

  const refetch = () => {
    getGraphChartData(currAreaId, currDashboardGroupId)
      .then((response) => setData(formatGraphChartData(response)))
      .catch((err) => {
        console.error("[useGraphChart] Refetch error:", err);
        setData(null);
      });
  };

  return { data, refetch };
}

