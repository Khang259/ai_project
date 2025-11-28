import { useState, useEffect, useCallback } from "react";
import { getLineChartData, formatLineChartData } from "@/services/Dashboard/lineChart";

/**
 * Hook để lấy dữ liệu biểu đồ đường cho LineChart
 * @param {Object} options - Các tùy chọn
 * @param {string} options.startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} options.endDate - Ngày kết thúc (YYYY-MM-DD)
 * @returns {Object} Dữ liệu và trạng thái
 */
export function useLineChart({ startDate, endDate }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getLineChartData(startDate, endDate);
      const formattedData = formatLineChartData(response);
      setData(formattedData);
    } catch (err) {
      console.error("[useLineChart] Error fetching data:", err);
      setError(err.message || "Lỗi khi tải dữ liệu biểu đồ đường");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

