import { useState, useEffect } from "react";
import { useArea } from "@/contexts/AreaContext";
import { getLineChartData, formatLineChartData } from "@/services/Dashboard/lineChart";

/**
 * Hook lấy dữ liệu biểu đồ đường cho LineChart. Tự lấy currAreaId từ AreaContext và gửi area_id.
 * @returns {Array} Dữ liệu đã format
 */
export function useLineChart() {
  const { currAreaId, currDashboardGroupId } = useArea();
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getLineChartData(currAreaId, currDashboardGroupId);
        const formattedData = formatLineChartData(response);
        setData(formattedData);
      } catch (err) {
        console.error("[useLineChart] Error:", err);
        setData([]);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [currAreaId, currDashboardGroupId]);

  return data;
}

