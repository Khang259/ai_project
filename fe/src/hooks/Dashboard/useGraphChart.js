import { useState, useEffect, useCallback } from "react";
import { getGraphChartData, formatGraphChartData } from "@/services/Dashboard/graphChart";

/**
 * Hook để lấy dữ liệu hiệu suất làm việc cho GraphChart
 * @param {Object} options - Các tùy chọn
 * @param {string} options.startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} options.endDate - Ngày kết thúc (YYYY-MM-DD)
 * @returns {Object} Dữ liệu và trạng thái
 */
export function useGraphChart({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getGraphChartData(startDate, endDate);
      const formattedData = formatGraphChartData(response);
      setData(formattedData);
    } catch (err) {
      console.error("[useGraphChart] Error fetching data:", err);
      setError(err.message || "Lỗi khi tải dữ liệu hiệu suất");
      setData(null);
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

