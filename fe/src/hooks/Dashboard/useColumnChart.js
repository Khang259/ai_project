import { useState, useEffect } from "react";
import { getColumnChartData, formatColumnChartData } from "@/services/Dashboard/columnChart";

/**
 * Hook để lấy dữ liệu biểu đồ cột cho ColumnChart
 * @returns {Array} Dữ liệu đã format
 */
export function useColumnChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getColumnChartData();
        const formattedData = formatColumnChartData(response);
        setData(formattedData);
      } catch (err) {
        console.error("[useColumnChart] Error:", err);
        setData([]);
      }
    };
    
    fetchData();
  }, []);

  return data;
}

