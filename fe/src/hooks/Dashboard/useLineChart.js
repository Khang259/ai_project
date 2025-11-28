import { useState, useEffect } from "react";
import { getLineChartData, formatLineChartData } from "@/services/Dashboard/lineChart";

/**
 * Hook để lấy dữ liệu biểu đồ đường cho LineChart
 * @returns {Array} Dữ liệu đã format
 */
export function useLineChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getLineChartData();
        const formattedData = formatLineChartData(response);
        setData(formattedData);
      } catch (err) {
        console.error("[useLineChart] Error:", err);
        setData([]);
      }
    };
    
    fetchData();
  }, []);

  return data;
}

