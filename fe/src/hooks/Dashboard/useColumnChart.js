import { useState, useEffect } from "react";
import { useArea } from "@/contexts/AreaContext";
import { getColumnChartData, formatColumnChartData } from "@/services/Dashboard/columnChart";

/**
 * Hook lấy dữ liệu biểu đồ cột cho ColumnChart. Tự lấy currAreaId từ AreaContext và gửi area_id.
 * @returns {Array} Dữ liệu đã format
 */
export function useColumnChart() {
  const { currAreaId, currDashboardGroupId } = useArea();
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getColumnChartData(currAreaId, currDashboardGroupId);
        const formattedData = formatColumnChartData(response);
        setData(formattedData);
      } catch (err) {
        console.error("[useColumnChart] Error:", err);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [currAreaId, currDashboardGroupId]);

  return data;
}

