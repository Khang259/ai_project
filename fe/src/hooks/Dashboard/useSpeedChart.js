import { useState, useEffect } from "react";
import { useArea } from "@/contexts/AreaContext";
import { getSpeedChartData, formatSpeedChartData } from "@/services/Dashboard/speedChart";

/**
 * Hook lấy dữ liệu biểu đồ cột cho speedChart. Tự lấy currAreaId từ AreaContext và gửi area_id.
 * @returns {Array} Dữ liệu đã format
 */
export function useSpeedChart() {
  const { currAreaId, currDashboardGroupId } = useArea();
  const [data, setData] = useState([]);

  useEffect(() => {
    setData([]);

    const fetchData = async () => {
      try {
        const response = await getSpeedChartData(currAreaId, currDashboardGroupId);
        const formattedData = formatSpeedChartData(response);
        setData(formattedData);
      } catch (err) {
        console.error("[useSpeedChart] Error:", err);
        setData([]);
      }
    };

    if (currAreaId == null) return;

    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [currAreaId, currDashboardGroupId]);

  return data;
}

